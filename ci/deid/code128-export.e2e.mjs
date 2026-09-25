/**
 * Code128 locate → blank → export must decode nothing (ZXing / BarcodeDetector).
 * Fixture payload matches the round-3 review mock.
 */
import bwipjs from "bwip-js";
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const FIX = path.join(__dirname, "fixtures-synthetic");
const PORT = 8790;
const PAYLOAD = "A123456(7)-CHANTAIMAN";

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
  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text: PAYLOAD,
    scale: 2,
    height: 16,
    includetext: false,
    backgroundcolor: "FFFFFF",
    paddingwidth: 12,
    paddingheight: 6,
  });
  fs.writeFileSync(path.join(FIX, "code128-phi.png"), png);

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const external = [];
  page.on("request", (req) => {
    const u = new URL(req.url());
    if (u.origin !== `http://127.0.0.1:${PORT}`) external.push(req.url());
  });

  await page.goto(`http://127.0.0.1:${PORT}/deid/`, { waitUntil: "networkidle" });

  const result = await page.evaluate(async (barUrl) => {
    const { detectBarcodeFlags, decodeAnyCodes, encodeImage, fillWhite, expandLinearBarcodeBox } =
      await import("./core/index.js");
    // expandLinearBarcodeBox may not be re-exported — import barcode module directly if needed
    const barcodeMod = await import("./core/barcode.js");
    const resp = await fetch(barUrl);
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
    // Place Code128 with quiet zone; must not clip (fixture ~scale 2)
    const bx = 80;
    const by = 480;
    ctx.drawImage(bmp, bx, by);
    const barW = bmp.width;
    const barH = bmp.height;
    if (bx + barW > 800 || by + barH > 1100) {
      throw new Error(`barcode clipped: ${barW}x${barH} at ${bx},${by}`);
    }
    bmp.close();
    let img = ctx.getImageData(0, 0, 800, 1100);

    const before = await decodeAnyCodes(img);
    const flags = await detectBarcodeFlags(img);
    const barcodeFlags = flags.filter(
      (f) => f.reason === "barcode" || f.reason === "dense_code_region"
    );
    const heights = barcodeFlags.map((f) => f.box[3] - f.box[1]);
    // Flag box must cover full bar height (not a ~24px scan-line strip)
    const tallEnough = barcodeFlags.some((f) => {
      const h = f.box[3] - f.box[1];
      return h >= Math.min(36, barH * 0.8);
    });

    fillWhite(
      img,
      barcodeFlags.map((f) => f.box)
    );
    const after = await decodeAnyCodes(img);

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

    // PDF path: encode JPEG page then re-decode from raster (same as export content)
    return {
      before,
      flagCount: barcodeFlags.length,
      flagTexts: barcodeFlags.map((f) => f.text),
      flagHeights: heights,
      barH,
      tallEnough,
      expandAvailable: typeof barcodeMod.expandLinearBarcodeBox === "function",
      after,
      pngDecoded,
      jpgDecoded,
      bx,
      by,
      barW,
    };
  }, `http://127.0.0.1:${PORT}/ci/deid/fixtures-synthetic/code128-phi.png`);

  assert.ok(
    result.before.some((t) => t.includes("A123456") || t.includes("CHANTAIMAN")),
    `Code128 must decode before blank: ${JSON.stringify(result.before)}`
  );
  assert.ok(result.flagCount >= 1, `Code128 must be flagged, got ${result.flagCount}`);
  assert.ok(
    result.flagTexts.some((t) => /A123456|CHANTAIMAN/.test(t || "")),
    JSON.stringify(result.flagTexts)
  );
  assert.ok(
    result.tallEnough,
    `1D box must expand past thin scan-line; heights=${JSON.stringify(result.flagHeights)} barH=${result.barH}`
  );
  assert.deepEqual(result.after, [], `after blank still decodes: ${JSON.stringify(result.after)}`);
  assert.deepEqual(result.pngDecoded, [], `PNG still decodes: ${JSON.stringify(result.pngDecoded)}`);
  assert.deepEqual(result.jpgDecoded, [], `JPEG still decodes: ${JSON.stringify(result.jpgDecoded)}`);
  assert.equal(external.length, 0, `cross-origin: ${external}`);

  // Optional zbarimg check when available (matches reviewer's verification)
  const { spawnSync } = await import("node:child_process");
  const zbar = spawnSync("zbarimg", ["--quiet", "--raw", path.join(FIX, "code128-phi.png")], {
    encoding: "utf8",
  });
  if (zbar.status === 0) {
    assert.ok(
      zbar.stdout.includes(PAYLOAD) || zbar.stdout.includes("A123456"),
      `fixture should be zbar-readable: ${zbar.stdout}`
    );
  }

  // Re-blank path already asserted empty; also blank via flags then zbar the exported PNG if possible
  const exportCheck = await page.evaluate(async (barUrl) => {
    const { detectBarcodeFlags, decodeAnyCodes, encodeImage, fillWhite } = await import(
      "./core/index.js"
    );
    const resp = await fetch(barUrl);
    const blob = await resp.blob();
    const bmp = await createImageBitmap(blob);
    const pageC = document.createElement("canvas");
    pageC.width = 800;
    pageC.height = 1100;
    const ctx = pageC.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 800, 1100);
    ctx.drawImage(bmp, 80, 480);
    bmp.close();
    let img = ctx.getImageData(0, 0, 800, 1100);
    const flags = await detectBarcodeFlags(img);
    fillWhite(
      img,
      flags.filter((f) => f.reason === "barcode" || f.reason === "dense_code_region").map((f) => f.box)
    );
    const pngBlob = await encodeImage(img, "image/png");
    const buf = new Uint8Array(await pngBlob.arrayBuffer());
    return { buf: Array.from(buf), leftover: await decodeAnyCodes(img) };
  }, `http://127.0.0.1:${PORT}/ci/deid/fixtures-synthetic/code128-phi.png`);

  assert.deepEqual(exportCheck.leftover, []);
  const outPng = path.join(FIX, "code128-blanked-export.png");
  fs.writeFileSync(outPng, Buffer.from(exportCheck.buf));
  if (zbar.status === 0 || spawnSync("which", ["zbarimg"]).status === 0) {
    const afterZ = spawnSync("zbarimg", ["--quiet", "--raw", outPng], { encoding: "utf8" });
    // zbarimg exits 1 when nothing found — that is success for us
    const text = (afterZ.stdout || "") + (afterZ.stderr || "");
    assert.ok(
      !/A123456|CHANTAIMAN|CODE-128/i.test(text),
      `zbarimg still reads blanked export: ${text}`
    );
  }

  console.log("code128-export e2e OK — flagged with full height, blanked, export decodes nothing");
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
