/**
 * Measure first-load (shell) vs first-OCR network bytes.
 * Asserts OCR assets are not fetched on first paint.
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const PORT = 8772;

function contentType(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".wasm")) return "application/wasm";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".traineddata")) return "application/octet-stream";
  return "application/octet-stream";
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const filePath = path.join(REPO, urlPath.replace(/^\//, ""));
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("");
        return;
      }
      const body = fs.readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": contentType(filePath),
        "Content-Length": body.length,
      });
      res.end(body);
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

function isOcrUrl(url) {
  return /\/deid\/vendor\/(tesseract|tessdata|jsqr|zxing)\//.test(url);
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  /** @type {{url:string, bytes:number}[]} */
  const reqs = [];
  page.on("response", async (res) => {
    try {
      const url = res.url();
      if (!url.includes("/deid/")) return;
      const buf = await res.body().catch(() => null);
      reqs.push({ url, bytes: buf ? buf.length : 0 });
    } catch {
      /* ignore */
    }
  });

  await page.goto(`http://127.0.0.1:${PORT}/deid/`, { waitUntil: "networkidle" });
  await new Promise((r) => setTimeout(r, 400));

  const firstLoad = reqs.filter((r) => !isOcrUrl(r.url) && !/\/vendor\/pdfjs\//.test(r.url));
  const firstLoadBytes = firstLoad.reduce((s, r) => s + r.bytes, 0);
  const ocrOnLoad = reqs.filter((r) => isOcrUrl(r.url));
  assert.equal(
    ocrOnLoad.length,
    0,
    `OCR must not load on first visit: ${ocrOnLoad.map((r) => r.url).join(", ")}`
  );

  const beforeOcr = reqs.length;
  await page.evaluate(async () => {
    const { createOcrProvider } = await import("./ui/ocr.js");
    const ocr = await createOcrProvider();
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 60;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 200, 60);
    ctx.fillStyle = "#000";
    ctx.font = "20px sans-serif";
    ctx.fillText("TEST", 10, 35);
    await ocr.recognize(ctx.getImageData(0, 0, 200, 60));
    await ocr.terminate();
  });

  const ocrReqs = reqs.slice(beforeOcr).filter((r) => isOcrUrl(r.url));
  const ocrBytes = ocrReqs.reduce((s, r) => s + r.bytes, 0);

  const report = {
    firstLoadMB: +(firstLoadBytes / 1e6).toFixed(3),
    firstOcrMB: +(ocrBytes / 1e6).toFixed(3),
    firstLoadFiles: firstLoad.length,
    firstOcrFiles: [...new Set(ocrReqs.map((r) => r.url.replace(/.*\/deid\//, "")))],
    note: "Shell precache excludes OCR. OCR/wasm/traineddata load lazily and use cache-first (deid-ocr-v1).",
  };
  console.log("SIZE_REPORT", JSON.stringify(report, null, 2));
  assert.ok(firstLoadBytes < 2e6, `first load too large: ${firstLoadBytes}`);
  assert.ok(ocrBytes > 1e6, "first OCR should download wasm/traineddata");
  assert.ok(
    !ocrReqs.some((r) => /tesseract-core[^/?#]*\.wasm$/.test(r.url)),
    "standalone .wasm should not be requested"
  );

  fs.writeFileSync(
    path.join(__dirname, "fixtures-synthetic/size-report.json"),
    JSON.stringify(report, null, 2)
  );

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
