/**
 * Touch-draw e2e — real CDP touch only (no synthetic pointer events).
 * Test hook is injected from tests/harness (not shipped on /deid/).
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { gotoDeidWithTestHook } from "../../tests/deid-harness/inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const PORT = 8771;

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
      if (!filePath.startsWith(REPO) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType(filePath) });
      res.end(fs.readFileSync(filePath));
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

/** Real touch drag via CDP only — must not dispatch PointerEvent. */
async function touchDrag(page, selector, from, to) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(50);
  const box = await page.locator(selector).boundingBox();
  assert.ok(box, "overlay visible");
  assert.ok(box.y + box.height > 0 && box.y < 844, `overlay must be in viewport, got y=${box.y}`);
  const x1 = box.x + from.x * box.width;
  const y1 = box.y + from.y * box.height;
  const x2 = box.x + to.x * box.width;
  const y2 = box.y + to.y * box.height;
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: x1, y: y1, id: 1 }],
  });
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, id: 1 }],
    });
  }
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  // Production URL must NOT expose the test hook (including ?test=1)
  await page.goto(`http://127.0.0.1:${PORT}/deid/`, { waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => typeof window.__deidTest), "undefined");
  await page.goto(`http://127.0.0.1:${PORT}/deid/?test=1`, { waitUntil: "networkidle" });
  assert.equal(
    await page.evaluate(() => typeof window.__deidTest),
    "undefined",
    "?test=1 must not install __deidTest"
  );
  // app.js must not contain samplePixel / getFlags test helpers
  const appSrc = fs.readFileSync(path.join(REPO, "deid/app.js"), "utf8");
  assert.ok(!appSrc.includes("__deidTest"), "app.js must not reference __deidTest");
  assert.ok(!appSrc.includes("samplePixel"), "app.js must not ship samplePixel");
  assert.ok(!/getFlags\s*:/.test(appSrc), "app.js must not ship getFlags hook");

  await gotoDeidWithTestHook(page, `http://127.0.0.1:${PORT}`);

  await page.evaluate(() => {
    const img = new ImageData(200, 200);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 200;
      img.data[i + 1] = 40;
      img.data[i + 2] = 40;
      img.data[i + 3] = 255;
    }
    window.__deidTest.seedWorkingPage(img);
    window.__deidTest.setTool("blank");
  });

  const before = await page.evaluate(() => window.__deidTest.samplePixel(100, 100));
  assert.deepEqual(before, [200, 40, 40]);

  const touchAction = await page.evaluate(() =>
    getComputedStyle(document.getElementById("overlayCanvas")).touchAction
  );
  assert.equal(touchAction, "none");

  await touchDrag(page, "#overlayCanvas", { x: 0.2, y: 0.2 }, { x: 0.7, y: 0.7 });

  const after = await page.evaluate(() => window.__deidTest.samplePixel(100, 100));
  assert.deepEqual(after, [255, 255, 255], `expected blanked white via touch only, got ${after}`);

  await page.evaluate(() => {
    const img = new ImageData(200, 200);
    img.data.fill(180);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    window.__deidTest.seedWorkingPage(img);
    window.__deidTest.setTool("crop");
  });
  await touchDrag(page, "#overlayCanvas", { x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 });
  await page.waitForTimeout(200);
  const size = await page.evaluate(() => window.__deidTest.workingSize());
  assert.ok(size.w < 200 && size.h < 200, `crop should shrink, got ${JSON.stringify(size)}`);

  await page.evaluate(() => window.__deidTest.setTool(null));
  const ta2 = await page.evaluate(() =>
    getComputedStyle(document.getElementById("overlayCanvas")).touchAction
  );
  assert.ok(ta2 === "pan-y" || ta2 === "auto" || ta2 === "manipulation", `got ${ta2}`);

  console.log("touch-draw e2e OK — real CDP touch only at 390x844");
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
