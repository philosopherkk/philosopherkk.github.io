/**
 * Round-10: PNG (desktop + mobile) Chinese fake name must remain a reviewable
 * cjk_name flag (unresolved > 0) before Blank all — same as the PDF path.
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
const FIX = path.join(__dirname, "fixtures-synthetic");
const PORT = 8818;

function contentType(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".traineddata")) return "application/octet-stream";
  if (p.endsWith(".wasm")) return "application/wasm";
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

async function main() {
  fs.mkdirSync(FIX, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const origin = `http://127.0.0.1:${PORT}`;

  // Build PNG with Chinese fake name + clinical line
  {
    const page = await browser.newPage();
    await page.goto(`${origin}/deid/`, { waitUntil: "domcontentloaded" });
    const bytes = await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 700;
      c.height = 900;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 700, 900);
      ctx.fillStyle = "#000";
      ctx.font = "42px \"Noto Sans CJK TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif";
      // Single clear name line below generic keep top (~0.12)
      ctx.fillText("陳大文", 48, 168);
      ctx.font = "20px sans-serif";
      ctx.fillText("SYNTHETIC PNG — FAKE DATA", 40, 220);
      ctx.fillText("Right Eye (OD) MD -1.20 dB PSD 1.50 dB", 40, 260);
      ctx.fillText("Left Eye (OS) MD -0.80 dB PSD 1.10 dB", 40, 300);
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    fs.writeFileSync(path.join(FIX, "cjk-name-png.png"), Buffer.from(bytes));
    await page.close();
  }

  // Also assert via pipeline API (deterministic) that PNG path leaves cjk_name unblanked
  {
    const page = await browser.newPage();
    await page.goto(`${origin}/deid/`, { waitUntil: "networkidle" });
    const pipe = await page.evaluate(async (url) => {
      const { deidPage } = await import("/deid/core/index.js");
      const { createOcrProvider } = await import("/deid/ui/ocr.js");
      const ocr = await createOcrProvider();
      const bmp = await createImageBitmap(await (await fetch(url)).blob());
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext("2d").drawImage(bmp, 0, 0);
      bmp.close();
      const id = c.getContext("2d").getImageData(0, 0, c.width, c.height);
      const result = await deidPage(id, { ocr, forceDevice: "generic", autoBlankBackstop: true });
      await ocr.terminate?.();
      const unresolved = result.flags.filter((f) => !f.blanked);
      return {
        passed: result.passed,
        unresolved: unresolved.length,
        cjk: unresolved.filter((f) => f.reason === "cjk_name").map((f) => f.text),
        reasons: unresolved.map((f) => f.reason),
      };
    }, `${origin}/ci/deid/fixtures-synthetic/cjk-name-png.png`);
    assert.ok(
      pipe.cjk.some((t) => /陳大文|大文|陳/.test(t)),
      `pipeline PNG: expected Han name in cjk flags, got ${JSON.stringify(pipe)}`);
    assert.ok(
      pipe.cjk.some((t) => /陳|大文/.test(t || "")),
      `pipeline PNG: expected Han name text in cjk flags, got ${JSON.stringify(pipe)}`
    );
    assert.ok(
      pipe.cjk.length >= 1,
      `pipeline PNG: expected cjk_name flag, got ${JSON.stringify(pipe)}`
    );
    assert.equal(pipe.passed, false, "pipeline PNG: passed must be false before blank");
    assert.ok(pipe.unresolved > 0, "pipeline PNG: unresolved > 0");
    console.log("cjk-name-flag pipeline OK", JSON.stringify(pipe));
    await page.close();
  }

  async function runViewport(tag, viewport) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await gotoDeidWithTestHook(page, origin);
    await page.setInputFiles("#fileInput", path.join(FIX, "cjk-name-png.png"));
    await page.waitForSelector("#workspace:not(.hidden)", { timeout: 180000 });
    await page.waitForSelector("#progressWrap.hidden", { timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(600);

    const info = await page.evaluate(() => {
      const flags = window.__deidTest.getFlags() || [];
      const unresolved = flags.filter((f) => !f.blanked);
      return {
        unresolved: unresolved.length,
        cjk: unresolved.filter((f) => f.reason === "cjk_name"),
        approveDisabled: window.__deidTest.approveBtnDisabled(),
        reasons: unresolved.map((f) => f.reason),
      };
    });

    assert.ok(
      info.cjk.length >= 1,
      `${tag}: expected cjk_name flag before Blank all; got ${JSON.stringify(info)}`
    );
    assert.ok(info.unresolved > 0, `${tag}: unresolved must be > 0`);
    assert.equal(info.approveDisabled, true, `${tag}: Approve must stay disabled`);

    await page.click("#blankAllBtn");
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({
      unresolved: window.__deidTest.getFlags().filter((f) => !f.blanked).length,
      approveDisabled: window.__deidTest.approveBtnDisabled(),
    }));
    assert.equal(after.unresolved, 0, `${tag}: after Blank all unresolved must be 0`);
    assert.equal(after.approveDisabled, false, `${tag}: Approve must enable after Blank all`);

    console.log(`cjk-name-flag ${tag} OK`, JSON.stringify(info));
    await context.close();
  }

  await runViewport("desktop", { width: 1280, height: 900 });
  await runViewport("mobile", { width: 390, height: 844 });

  await browser.close();
  server.close();
  console.log("cjk-name-flag e2e OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
