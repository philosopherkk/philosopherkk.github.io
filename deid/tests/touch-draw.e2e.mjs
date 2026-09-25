/**
 * Playwright: touch/pointer drag blank on mobile viewport (hasTouch).
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const PORT = 8771;

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

async function touchDrag(page, selector, from, to) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(box, "overlay visible");
  const x1 = box.x + from.x * box.width;
  const y1 = box.y + from.y * box.height;
  const x2 = box.x + to.x * box.width;
  const y2 = box.y + to.y * box.height;

  // Real touch via CDP (hasTouch context)
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: x1, y: y1 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: (x1 + x2) / 2, y: (y1 + y2) / 2 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x2, y: y2 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });

  // Also dispatch pointer events (app listens to pointer*) — touch alone may not map on all builds
  await page.evaluate(
    ({ sel, fx, fy, tx, ty }) => {
      const el = document.querySelector(sel);
      const r = el.getBoundingClientRect();
      const fire = (type, cx, cy) => {
        const ev = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "touch",
          clientX: r.left + fx * r.width + (type === "pointerup" || type === "pointermove" ? (cx - fx) : 0) * r.width,
          clientY: r.top + fy * r.height + (type === "pointerup" || type === "pointermove" ? (cy - fy) : 0) * r.height,
          buttons: type === "pointerup" ? 0 : 1,
        });
        // Fix coords properly
        const x = type === "pointerdown" ? r.left + fx * r.width : type === "pointerup" ? r.left + tx * r.width : r.left + ((fx + tx) / 2) * r.width;
        const y = type === "pointerdown" ? r.top + fy * r.height : type === "pointerup" ? r.top + ty * r.height : r.top + ((fy + ty) / 2) * r.height;
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "touch",
            clientX: x,
            clientY: y,
            buttons: type === "pointerup" ? 0 : 1,
          })
        );
      };
      fire("pointerdown", fx, fy);
      fire("pointermove", (fx + tx) / 2, (fy + ty) / 2);
      fire("pointerup", tx, ty);
    },
    { sel: selector, fx: from.x, fy: from.y, tx: to.x, ty: to.y }
  );
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
  await page.goto(`http://127.0.0.1:${PORT}/deid/`, { waitUntil: "networkidle" });

  // Seed a red working image
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

  // Assert drawing class enables touch-action: none
  const touchAction = await page.evaluate(() =>
    getComputedStyle(document.getElementById("overlayCanvas")).touchAction
  );
  assert.equal(touchAction, "none");

  await touchDrag(page, "#overlayCanvas", { x: 0.2, y: 0.2 }, { x: 0.7, y: 0.7 });

  const after = await page.evaluate(() => window.__deidTest.samplePixel(100, 100));
  assert.deepEqual(after, [255, 255, 255], `expected blanked white, got ${after}`);

  // Crop mode shrinks
  await page.evaluate(() => {
    const img = new ImageData(200, 200);
    img.data.fill(180);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    window.__deidTest.seedWorkingPage(img);
    window.__deidTest.setTool("crop");
  });
  await touchDrag(page, "#overlayCanvas", { x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 });
  const size = await page.evaluate(() => window.__deidTest.workingSize());
  assert.ok(size.w < 200 && size.h < 200, `crop should shrink, got ${JSON.stringify(size)}`);

  // When not drawing, touch-action allows pan
  await page.evaluate(() => window.__deidTest.setTool(null));
  const ta2 = await page.evaluate(() =>
    getComputedStyle(document.getElementById("overlayCanvas")).touchAction
  );
  assert.ok(ta2 === "pan-y" || ta2 === "auto" || ta2 === "manipulation", `got ${ta2}`);

  console.log("touch-draw e2e OK — blank + crop via touch/pointer drag at 390x844");
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
