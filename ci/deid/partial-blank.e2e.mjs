/**
 * Partial draw-blank: a tiny 5×5 touch must NOT mark a flag blanked / enable Approve.
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
const PORT = 8792;

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
    const img = new ImageData(300, 300);
    img.data.fill(40); // dark flag interior
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    // White margins so only the flag box is dark
    for (let y = 0; y < 300; y++) {
      for (let x = 0; x < 300; x++) {
        if (x < 90 || x > 210 || y < 90 || y > 160) {
          const i = (y * 300 + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        }
      }
    }
    window.__deidTest.seedWorkingPage(img, [
      {
        box: [100, 100, 200, 150],
        reason: "institution",
        text: "DEMO EYE CLINIC",
        blanked: false,
      },
    ]);
  });

  assert.equal(await page.evaluate(() => window.__deidTest.approveBtnDisabled()), true);

  // Draw a 5×5 blank inside the flag — must NOT clear the flag
  await page.evaluate(() => window.__deidTest.setTool("blank"));
  await page.evaluate(() => {
    const el = document.getElementById("overlayCanvas");
    const r = el.getBoundingClientRect();
    // Flag is ~100–200 / 300 → fractions ~0.33–0.67. Draw ~5px at centre.
    const fx0 = 140 / 300;
    const fy0 = 120 / 300;
    const fx1 = 145 / 300;
    const fy1 = 125 / 300;
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
    fire("pointerdown", fx0, fy0);
    fire("pointermove", fx1, fy1);
    fire("pointerup", fx1, fy1);
  });
  await page.waitForTimeout(200);

  const after = await page.evaluate(() => ({
    disabled: window.__deidTest.approveBtnDisabled(),
    unresolved: window.__deidTest.getFlags().filter((f) => !f.blanked).length,
    blanked: window.__deidTest.getFlags().filter((f) => f.blanked).length,
  }));
  assert.equal(after.unresolved, 1, `5×5 touch must not blank flag: ${JSON.stringify(after)}`);
  assert.equal(after.blanked, 0, `flag must stay unblanked: ${JSON.stringify(after)}`);
  assert.equal(after.disabled, true, "Approve must stay disabled after partial blank");

  console.log("partial-blank e2e OK — 5×5 touch leaves Approve disabled");
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
