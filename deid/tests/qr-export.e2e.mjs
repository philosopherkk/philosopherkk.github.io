/**
 * QR locate → blank → export must decode nothing (jsQR verification).
 */
import QRCode from "qrcode";
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const FIX = path.join(__dirname, "fixtures-synthetic");
const PORT = 8788;
const PAYLOAD = "PATIENT CHAN TAI MAN HKID A123456(7) DOB 01-03-1980";

function contentType(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
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
      res.writeHead(200, { "Content-Type": contentType(filePath) });
      res.end(fs.readFileSync(filePath));
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(FIX, { recursive: true });
  const qrPng = await QRCode.toBuffer(PAYLOAD, { width: 260, margin: 2, errorCorrectionLevel: "M" });
  fs.writeFileSync(path.join(FIX, "qr-phi.png"), qrPng);

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const external = [];
  page.on("request", (req) => {
    const u = new URL(req.url());
    if (u.origin !== `http://127.0.0.1:${PORT}`) external.push(req.url());
  });

  await page.goto(`http://127.0.0.1:${PORT}/deid/`, { waitUntil: "networkidle" });

  const result = await page.evaluate(async (qrUrl) => {
    const { detectBarcodeFlags, decodeAnyCodes, encodeImage, fillWhite } = await import(
      "./core/index.js"
    );
    const resp = await fetch(qrUrl);
    const blob = await resp.blob();
    const bmp = await createImageBitmap(blob);
    const pageC = document.createElement("canvas");
    pageC.width = 800;
    pageC.height = 1100;
    const ctx = pageC.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 800, 1100);
    ctx.fillStyle = "#000";
    ctx.font = "18px sans-serif";
    ctx.fillText("SYNTHETIC REPORT — FAKE DATA", 40, 40);
    ctx.fillText("Right Eye (OD) MD -1.20 dB PSD 1.50 dB", 40, 80);
    ctx.drawImage(bmp, 270, 420);
    bmp.close();
    let img = ctx.getImageData(0, 0, 800, 1100);

    const before = await decodeAnyCodes(img);
    const flags = await detectBarcodeFlags(img);
    // Blank every barcode flag (default action before export)
    fillWhite(
      img,
      flags.filter((f) => f.reason === "barcode" || f.reason === "dense_code_region").map((f) => f.box)
    );
    const after = await decodeAnyCodes(img);

    // Export PNG/JPEG blobs and re-decode
    const pngBlob = await encodeImage(img, "image/png");
    const jpgBlob = await encodeImage(img, "image/jpeg", 0.92);
    const decodeBlob = async (b) => {
      const bm = await createImageBitmap(b);
      const c = document.createElement("canvas");
      c.width = bm.width;
      c.height = bm.height;
      c.getContext("2d").drawImage(bm, 0, 0);
      const id = c.getContext("2d").getImageData(0, 0, c.width, c.height);
      bm.close();
      return decodeAnyCodes(id);
    };
    const pngDecoded = await decodeBlob(pngBlob);
    const jpgDecoded = await decodeBlob(jpgBlob);

    return {
      before,
      flagCount: flags.length,
      flagTexts: flags.map((f) => f.text),
      after,
      pngDecoded,
      jpgDecoded,
    };
  }, `http://127.0.0.1:${PORT}/deid/tests/fixtures-synthetic/qr-phi.png`);

  assert.ok(result.before.some((t) => t.includes("CHAN TAI MAN")), JSON.stringify(result.before));
  assert.ok(result.flagCount >= 1, "QR must be flagged");
  assert.ok(result.flagTexts.some((t) => /CHAN TAI MAN/.test(t || "")), JSON.stringify(result.flagTexts));
  assert.deepEqual(result.after, []);
  assert.deepEqual(result.pngDecoded, []);
  assert.deepEqual(result.jpgDecoded, []);
  assert.equal(external.length, 0, `cross-origin: ${external}`);

  console.log("qr-export e2e OK — flagged, blanked, export decodes nothing");
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
