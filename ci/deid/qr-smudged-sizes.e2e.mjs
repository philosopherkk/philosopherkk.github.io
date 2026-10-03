/**
 * Round-10: smudged QR at 50 / 72 / 120px + smudged finder at 120px.
 * Also assert zero code flags on HFA / Pentacam mocks (crude + realistic phone photo)
 * with clinical pixels unchanged (maxDiff 0).
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
const PORT = 8817;
const PAYLOAD = "PATIENT CHAN TAI MAN HKID A123456(7) DOB 01-03-1980";
/** Shorter payload so 50px modules stay large enough for a surviving finder after smudge. */
const PAYLOAD_SMALL = "A123456(7) CHAN";

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
  const sizes = [50, 72, 120];
  for (const size of sizes) {
    const payload = size <= 50 ? PAYLOAD_SMALL : PAYLOAD;
    const buf = await QRCode.toBuffer(payload, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    fs.writeFileSync(path.join(FIX, `qr-smudge-src-${size}.png`), buf);
  }

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const origin = `http://127.0.0.1:${PORT}`;
  await page.goto(`${origin}/deid/`, { waitUntil: "domcontentloaded" });

  const results = await page.evaluate(
    async ({ origin, sizes }) => {
      const { detectQrFinderFlags, detectBarcodeFlags } = await import("/deid/core/index.js");
      const report = {};

      const smudgeLeftAndBlot = (ctx, ox, oy, size) => {
        // Wipe left quiet-zone + finders (destroys TL/BL); centre blot. Leaves TR finder.
        const wipeW = Math.max(10, Math.floor(size * (size <= 50 ? 0.32 : 0.38)));
        ctx.fillStyle = "#d0d0d0";
        ctx.fillRect(ox - 2, oy - 2, wipeW, size + 4);
        ctx.fillStyle = "rgba(40,40,40,0.92)";
        ctx.beginPath();
        ctx.arc(ox + size * 0.55, oy + size * 0.55, Math.max(4, size * 0.14), 0, Math.PI * 2);
        ctx.fill();
      };

      const smudgeOneFinder = (ctx, ox, oy, size) => {
        const fw = Math.max(8, Math.floor(size * 0.28));
        ctx.fillStyle = "#c8c8c8";
        ctx.fillRect(ox - 1, oy - 1, fw, fw);
        ctx.fillStyle = "rgba(60,60,60,0.85)";
        ctx.beginPath();
        ctx.arc(ox + fw * 0.45, oy + fw * 0.45, fw * 0.35, 0, Math.PI * 2);
        ctx.fill();
      };

      const pageCanvas = (bmp, ox, oy, size, smudgeFn) => {
        const W = 700;
        const H = 900;
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#000";
        ctx.font = "18px sans-serif";
        ctx.fillText("SYNTHETIC — FAKE DATA", 30, 140);
        ctx.fillText("Right Eye (OD) MD -1.20 dB", 30, 174);
        ctx.drawImage(bmp, ox, oy);
        if (smudgeFn) smudgeFn(ctx, ox, oy, size);
        return ctx.getImageData(0, 0, W, H);
      };

      for (const size of sizes) {
        const bmp = await createImageBitmap(
          await (await fetch(`${origin}/ci/deid/fixtures-synthetic/qr-smudge-src-${size}.png`)).blob()
        );
        const id = pageCanvas(bmp, 280, 360, size, smudgeLeftAndBlot);
        const flags = detectQrFinderFlags(id);
        const codeFlags = await detectBarcodeFlags(id);
        const hit = [...flags, ...codeFlags].some((f) =>
          /qr_finder|qr_texture|dense_code_region|barcode/.test(f.reason)
        );
        report[`smudge_${size}`] = {
          hit,
          reasons: [...flags, ...codeFlags].map((f) => f.reason),
        };
        bmp.close();
      }

      {
        const size = 120;
        const bmp = await createImageBitmap(
          await (await fetch(`${origin}/ci/deid/fixtures-synthetic/qr-smudge-src-120.png`)).blob()
        );
        const id = pageCanvas(bmp, 280, 360, size, smudgeOneFinder);
        const flags = detectQrFinderFlags(id);
        const codeFlags = await detectBarcodeFlags(id);
        report.smudge_finder_120 = {
          hit: [...flags, ...codeFlags].some((f) =>
            /qr_finder|qr_texture|dense_code_region|barcode/.test(f.reason)
          ),
          reasons: [...flags, ...codeFlags].map((f) => f.reason),
        };
        bmp.close();
      }

      {
        const size = 120;
        const bmp = await createImageBitmap(
          await (await fetch(`${origin}/ci/deid/fixtures-synthetic/qr-smudge-src-120.png`)).blob()
        );
        const id = pageCanvas(bmp, 280, 360, size, null);
        const flags = detectQrFinderFlags(id);
        const codeFlags = await detectBarcodeFlags(id);
        report.texture_120 = {
          hit: [...flags, ...codeFlags].some((f) =>
            /qr_finder|qr_texture|dense_code_region|barcode/.test(f.reason)
          ),
          reasons: [...flags, ...codeFlags].map((f) => f.reason),
        };
        bmp.close();
      }

      return report;
    },
    { origin, sizes }
  );

  for (const size of sizes) {
    const r = results[`smudge_${size}`];
    assert.ok(r?.hit, `smudged ${size}px QR must flag; got ${JSON.stringify(r)}`);
  }
  assert.ok(
    results.smudge_finder_120?.hit,
    `120px with smudged finder must flag; got ${JSON.stringify(results.smudge_finder_120)}`
  );
  assert.ok(
    results.texture_120?.hit,
    `intact 120px QR must flag; got ${JSON.stringify(results.texture_120)}`
  );

  const clinical = await page.evaluate(async (origin) => {
    const { detectQrFinderFlags, detectBarcodeFlags } = await import("/deid/core/index.js");
    const maxDiff = (a, b) => {
      let m = 0;
      for (let i = 0; i < a.data.length; i++) {
        const d = Math.abs(a.data[i] - b.data[i]);
        if (d > m) m = d;
      }
      return m;
    };
    const load = async (name) => {
      const bmp = await createImageBitmap(
        await (await fetch(`${origin}/ci/deid/fixtures-synthetic/${name}`)).blob()
      );
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      return ctx.getImageData(0, 0, c.width, c.height);
    };
    const check = async (name) => {
      const img = await load(name);
      const before = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
      const flags = [
        ...detectQrFinderFlags(img),
        ...(await detectBarcodeFlags(img)),
      ].filter((f) => /qr_finder|qr_texture|dense_code_region|barcode/.test(f.reason));
      return { name, flagCount: flags.length, reasons: flags.map((f) => f.reason), maxDiff: maxDiff(before, img) };
    };

    const crude = [
      await check("hfa.png"),
      await check("pentacam_holladay.png"),
      await check("pentacam_axl.png"),
    ];

    const hfa = await load("hfa.png");
    const c = document.createElement("canvas");
    c.width = hfa.width;
    c.height = hfa.height;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((7 * Math.PI) / 180);
    ctx.filter = "blur(1.2px)";
    const bmp = await createImageBitmap(hfa);
    ctx.drawImage(bmp, -c.width / 2, -c.height / 2);
    bmp.close();
    ctx.restore();
    const phone = ctx.getImageData(0, 0, c.width, c.height);
    const beforePhone = new ImageData(new Uint8ClampedArray(phone.data), phone.width, phone.height);
    const phoneFlags = [
      ...detectQrFinderFlags(phone),
      ...(await detectBarcodeFlags(phone)),
    ].filter((f) => /qr_finder|qr_texture|dense_code_region|barcode/.test(f.reason));
    return {
      crude,
      phone: {
        flagCount: phoneFlags.length,
        reasons: phoneFlags.map((f) => f.reason),
        maxDiff: maxDiff(beforePhone, phone),
      },
    };
  }, origin);

  for (const row of clinical.crude) {
    assert.equal(row.flagCount, 0, `crude ${row.name} must have 0 code flags: ${JSON.stringify(row)}`);
    assert.equal(row.maxDiff, 0, `crude ${row.name} clinical pixels must be identical (maxDiff 0)`);
  }
  assert.equal(
    clinical.phone.flagCount,
    0,
    `blurred/tilted HFA phone photo must have 0 code flags: ${JSON.stringify(clinical.phone)}`
  );
  assert.equal(clinical.phone.maxDiff, 0, "phone-photo clinical pixels must be identical (maxDiff 0)");

  console.log("qr-smudged-sizes e2e OK", JSON.stringify({ results, clinical }, null, 2));
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
