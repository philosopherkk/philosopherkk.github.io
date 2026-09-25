/**
 * Flags must survive remapping on crop/rotate and restore on undo; Approve stays gated.
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const PORT = 8789;

function contentType(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".png")) return "image/png";
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
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/deid/?test=1`, { waitUntil: "networkidle" });

  // Seed page with an unresolved flag in the centre
  await page.evaluate(() => {
    const img = new ImageData(300, 300);
    img.data.fill(220);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    const flags = [
      {
        box: [100, 100, 200, 140],
        reason: "institution",
        text: "DEMO EYE CLINIC",
        blanked: false,
      },
    ];
    window.__deidTest.seedWorkingPage(img, flags);
  });

  assert.equal(await page.evaluate(() => window.__deidTest.approveBtnDisabled()), true);
  assert.equal(await page.evaluate(() => window.__deidTest.getFlags().filter((f) => !f.blanked).length), 1);

  // Manual crop via tool — must NOT clear flags (remap)
  await page.evaluate(() => window.__deidTest.setTool("crop"));
  // Use pointer here (desktop test) to crop a region that still contains the flag
  await page.locator("#overlayCanvas").boundingBox();
  await page.evaluate(() => {
    const el = document.getElementById("overlayCanvas");
    const r = el.getBoundingClientRect();
    const fire = (type, fx, fy) => {
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "mouse",
          clientX: r.left + fx * r.width,
          clientY: r.top + fy * r.height,
          buttons: type === "pointerup" ? 0 : 1,
        })
      );
    };
    fire("pointerdown", 0.1, 0.1);
    fire("pointermove", 0.9, 0.9);
    fire("pointerup", 0.9, 0.9);
  });
  await page.waitForTimeout(300);

  let flags = await page.evaluate(() => window.__deidTest.getFlags());
  assert.ok(flags.some((f) => !f.blanked), `flags should remain after crop: ${JSON.stringify(flags)}`);
  assert.equal(await page.evaluate(() => window.__deidTest.approveBtnDisabled()), true);

  // Undo must restore prior flags + image
  await page.evaluate(() => window.__deidTest.clickUndo());
  flags = await page.evaluate(() => window.__deidTest.getFlags());
  assert.ok(
    flags.some((f) => !f.blanked && /CLINIC/i.test(f.text || "")),
    `undo should restore clinic flag: ${JSON.stringify(flags)}`
  );
  assert.equal(await page.evaluate(() => window.__deidTest.approveBtnDisabled()), true);
  assert.equal(await page.evaluate(() => window.__deidTest.getApproved()), false);

  // Rotate must remap, not wipe
  await page.evaluate(() => window.__deidTest.clickRotate());
  await page.waitForTimeout(300);
  flags = await page.evaluate(() => window.__deidTest.getFlags());
  assert.ok(flags.some((f) => !f.blanked), `flags should remain after rotate: ${JSON.stringify(flags)}`);
  assert.equal(await page.evaluate(() => window.__deidTest.approveBtnDisabled()), true);

  console.log("flags-undo e2e OK — crop/rotate remap + undo restore; Approve gated");
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
