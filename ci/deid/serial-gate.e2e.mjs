/**
 * Serial flags must survive rotate×4 + crop; Approve stays gated until blanked.
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { gotoDeidWithTestHook } from "../deid-harness/inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const PORT = 8791;

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
  await gotoDeidWithTestHook(page, `http://127.0.0.1:${PORT}`);

  await page.evaluate(() => {
    const img = new ImageData(400, 400);
    img.data.fill(230);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    // Paint a dark serial-like band so blanking is visible
    for (let y = 160; y < 200; y++) {
      for (let x = 80; x < 280; x++) {
        const i = (y * 400 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 30;
      }
    }
    const flags = [
      {
        box: [80, 160, 280, 200],
        reason: "serial",
        text: "750123",
        blanked: false,
      },
    ];
    window.__deidTest.seedWorkingPage(img, flags);
  });

  assert.equal(await page.evaluate(() => window.__deidTest.approveBtnDisabled()), true);
  assert.ok(
    await page.evaluate(() =>
      window.__deidTest.getFlags().some((f) => f.reason === "serial" && !f.blanked)
    )
  );

  // Rotate 4 times — serial flag must remain and Approve stay disabled
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.__deidTest.clickRotate());
    await page.waitForTimeout(250);
    assert.equal(
      await page.evaluate(() => window.__deidTest.approveBtnDisabled()),
      true,
      `Approve must stay disabled after rotate ${i + 1}`
    );
    assert.ok(
      await page.evaluate(() =>
        window.__deidTest.getFlags().some((f) => f.reason === "serial" && !f.blanked)
      ),
      `serial flag missing after rotate ${i + 1}`
    );
  }

  // Crop a region that still contains the serial band
  await page.evaluate(() => window.__deidTest.setTool("crop"));
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
    fire("pointerdown", 0.05, 0.05);
    fire("pointermove", 0.95, 0.95);
    fire("pointerup", 0.95, 0.95);
  });
  await page.waitForTimeout(800);

  assert.equal(await page.evaluate(() => window.__deidTest.approveBtnDisabled()), true);
  assert.ok(
    await page.evaluate(() =>
      window.__deidTest.getFlags().some((f) => f.reason === "serial" && !f.blanked)
    ),
    "serial flag must remain after crop"
  );

  // Blank the serial flag via Blank all — Approve enables
  await page.click("#blankAllBtn");
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.__deidTest.approveBtnDisabled()), false);
  assert.equal(
    await page.evaluate(() => window.__deidTest.getFlags().filter((f) => !f.blanked).length),
    0
  );

  console.log("serial-gate e2e OK — rotate×4 + crop keep serial; blank enables Approve");
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
