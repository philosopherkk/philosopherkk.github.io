/**
 * Rotated + PDF QR e2e — fake payload only.
 * Asserts full-size flags, Approve blocked until blanked, exports decode nothing.
 */
import QRCode from "qrcode";
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { gotoDeidWithTestHook } from "../../tests/deid-harness/inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const FIX = path.join(__dirname, "fixtures-synthetic");
const PORT = 8795;
const PAYLOAD = "PATIENT CHAN TAI MAN HKID A123456(7) DOB 01-03-1980";

function contentType(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".pdf")) return "application/pdf";
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
        res.end("");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType(filePath) });
      res.end(fs.readFileSync(filePath));
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

function zbarReadsPayload(filePath) {
  const z = spawnSync("zbarimg", ["--quiet", "--raw", filePath], { encoding: "utf8" });
  if (z.error && z.error.code === "ENOENT") return { available: false, text: "" };
  const text = `${z.stdout || ""}${z.stderr || ""}`;
  return { available: true, text, hits: /CHAN TAI MAN|A123456/i.test(text) };
}

async function main() {
  fs.mkdirSync(FIX, { recursive: true });
  const qrPng = await QRCode.toBuffer(PAYLOAD, {
    width: 200,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  fs.writeFileSync(path.join(FIX, "qr-rot-source.png"), qrPng);

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });

  const cases = [
    { deg: 10, place: "mid" },
    { deg: 10, place: "corner" },
    { deg: 25, place: "mid" },
    { deg: 25, place: "corner" },
    { deg: 45, place: "mid" },
    { deg: 45, place: "corner" },
  ];

  for (const viewport of [
    { width: 1100, height: 900, label: "desktop" },
    { width: 390, height: 844, label: "mobile" },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${PORT}/deid/`, { waitUntil: "networkidle" });

    for (const c of cases) {
      const result = await page.evaluate(
        async ({ qrUrl, deg, place, payload }) => {
          const { detectBarcodeFlags, decodeAnyCodes, encodeImage, fillWhite } = await import(
            "./core/index.js"
          );
          const resp = await fetch(qrUrl);
          const blob = await resp.blob();
          const bmp = await createImageBitmap(blob);
          const pageW = 800;
          const pageH = 1100;
          const canvas = document.createElement("canvas");
          canvas.width = pageW;
          canvas.height = pageH;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, pageW, pageH);
          ctx.fillStyle = "#000";
          ctx.font = "16px sans-serif";
          ctx.fillText("SYNTHETIC — FAKE DATA", 40, 36);
          ctx.fillText("Right Eye (OD) MD -1.20 dB PSD 1.50 dB", 40, 70);

          const qrSize = 200;
          const rad = (deg * Math.PI) / 180;
          const ext = Math.ceil(
            (qrSize * Math.abs(Math.cos(rad)) + qrSize * Math.abs(Math.sin(rad))) / 2
          );
          let cx;
          let cy;
          if (place === "corner") {
            cx = pageW - ext - 24;
            cy = pageH - ext - 24;
          } else {
            cx = pageW / 2;
            cy = pageH / 2;
          }
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rad);
          ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
          ctx.restore();
          bmp.close();

          const img = ctx.getImageData(0, 0, pageW, pageH);
          const flags = await detectBarcodeFlags(img);
          const codeFlags = flags.filter(
            (f) =>
              f.reason === "barcode" ||
              f.reason === "qr_finder" ||
              f.reason === "dense_code_region"
          );
          const sizes = codeFlags.map((f) => ({
            w: f.box[2] - f.box[0],
            h: f.box[3] - f.box[1],
            box: f.box,
            reason: f.reason,
            text: f.text,
          }));
          const fullSized = sizes.some((s) => s.w >= 100 && s.h >= 100);

          // Expected AABB of rotated QR (approx)
          const expectSide = qrSize * (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)));
          const covers = sizes.some((s) => s.w >= expectSide * 0.55 && s.h >= expectSide * 0.55);

          fillWhite(
            img,
            codeFlags.map((f) => f.box)
          );
          const after = await decodeAnyCodes(img);
          const pngBlob = await encodeImage(img, "image/png");
          const jpgBlob = await encodeImage(img, "image/jpeg", 0.92);
          const decodeBlob = async (b) => {
            const bm = await createImageBitmap(b);
            const c2 = document.createElement("canvas");
            c2.width = bm.width;
            c2.height = bm.height;
            c2.getContext("2d").drawImage(bm, 0, 0);
            const id = c2.getContext("2d").getImageData(0, 0, c2.width, c2.height);
            bm.close();
            return decodeAnyCodes(id);
          };

          return {
            deg,
            place,
            flagCount: codeFlags.length,
            sizes,
            fullSized,
            covers,
            after,
            pngDecoded: await decodeBlob(pngBlob),
            jpgDecoded: await decodeBlob(jpgBlob),
            pngBuf: Array.from(new Uint8Array(await pngBlob.arrayBuffer())),
            payloadMention: codeFlags.some(
              (f) => (f.text || "").includes("CHAN") || (f.text || "").includes("A123456")
            ),
            expectSide,
          };
        },
        {
          qrUrl: `http://127.0.0.1:${PORT}/deid/tests/fixtures-synthetic/qr-rot-source.png`,
          deg: c.deg,
          place: c.place,
          payload: PAYLOAD,
        }
      );

      assert.ok(
        result.flagCount >= 1,
        `${viewport.label} ${c.deg}° ${c.place}: must flag QR, got 0 (${JSON.stringify(result.sizes)})`
      );
      assert.ok(
        result.fullSized && result.covers,
        `${viewport.label} ${c.deg}° ${c.place}: flag too small ${JSON.stringify(result.sizes)} expect~${result.expectSide}`
      );
      assert.deepEqual(
        result.after,
        [],
        `${viewport.label} ${c.deg}° ${c.place}: still decodes after blank ${JSON.stringify(result.after)}`
      );
      assert.deepEqual(result.pngDecoded, []);
      assert.deepEqual(result.jpgDecoded, []);

      const outPng = path.join(FIX, `qr-rot-${c.deg}-${c.place}-blanked.png`);
      fs.writeFileSync(outPng, Buffer.from(result.pngBuf));
      const zb = zbarReadsPayload(outPng);
      if (zb.available) {
        assert.equal(
          zb.hits,
          false,
          `${viewport.label} ${c.deg}° ${c.place}: zbarimg still reads PHI: ${zb.text}`
        );
      }
      console.log(`OK rotated QR ${viewport.label} ${c.deg}° ${c.place} flags=${result.flagCount}`);
    }
    await page.close();
  }

  // Approve gating: seed mid 25° via harness, confirm Approve disabled until blanked
  {
    const page = await browser.newPage();
    await gotoDeidWithTestHook(page, `http://127.0.0.1:${PORT}`);
    const gated = await page.evaluate(async (qrUrl) => {
      const { detectBarcodeFlags } = await import("/deid/core/index.js");
      const resp = await fetch(qrUrl);
      const bmp = await createImageBitmap(await resp.blob());
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 600, 600);
      ctx.translate(300, 300);
      ctx.rotate((25 * Math.PI) / 180);
      ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
      bmp.close();
      const img = ctx.getImageData(0, 0, 600, 600);
      const flags = await detectBarcodeFlags(img);
      window.__deidTest.seedWorkingPage(
        img,
        flags.map((f) => ({ ...f, blanked: false }))
      );
      return {
        disabled: window.__deidTest.approveBtnDisabled(),
        n: window.__deidTest.getFlags().filter((f) => !f.blanked).length,
      };
    }, `http://127.0.0.1:${PORT}/deid/tests/fixtures-synthetic/qr-rot-source.png`);
    assert.equal(gated.n >= 1, true, `Approve gate flags: ${gated.n}`);
    assert.equal(gated.disabled, true, "Approve must be blocked while QR flag open");
    await page.close();
    console.log("OK Approve gated on rotated QR flags");
  }

  // PDF-rendered page with upright QR near bottom (crop must not be the only defense)
  {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/deid/`, { waitUntil: "networkidle" });
    const pdfResult = await page.evaluate(async (qrUrl) => {
      const { detectBarcodeFlags, decodeAnyCodes, encodeImage, fillWhite, buildMultiPagePdf } =
        await import("./core/index.js");
      const { renderPdfPages } = await import("./ui/loader.js");
      const resp = await fetch(qrUrl);
      const bmp = await createImageBitmap(await resp.blob());
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 850;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 600, 850);
      ctx.fillStyle = "#000";
      ctx.font = "18px sans-serif";
      ctx.fillText("SYNTHETIC PDF PAGE — FAKE DATA", 40, 40);
      ctx.fillText("Right Eye (OD) MD -1.20 dB", 40, 80);
      // Place QR near bottom so auto-crop of some layouts would risk cutting it
      ctx.drawImage(bmp, 200, 620);
      bmp.close();
      const pageImg = ctx.getImageData(0, 0, 600, 850);
      const jpegBlob = await encodeImage(pageImg, "image/jpeg", 0.92);
      const jpegBuf = new Uint8Array(await jpegBlob.arrayBuffer());
      const pdf = buildMultiPagePdf([{ bytes: jpegBuf, width: 600, height: 850 }], 72);
      const rendered = await renderPdfPages(pdf, 150);
      const img = rendered[0];
      const flags = await detectBarcodeFlags(img);
      const codeFlags = flags.filter(
        (f) =>
          f.reason === "barcode" ||
          f.reason === "qr_finder" ||
          f.reason === "dense_code_region"
      );
      const sizes = codeFlags.map((f) => ({
        w: f.box[2] - f.box[0],
        h: f.box[3] - f.box[1],
        reason: f.reason,
      }));
      fillWhite(
        img,
        codeFlags.map((f) => f.box)
      );
      const after = await decodeAnyCodes(img);
      const pngBlob = await encodeImage(img, "image/png");
      const bm = await createImageBitmap(pngBlob);
      const c2 = document.createElement("canvas");
      c2.width = bm.width;
      c2.height = bm.height;
      c2.getContext("2d").drawImage(bm, 0, 0);
      const id = c2.getContext("2d").getImageData(0, 0, c2.width, c2.height);
      bm.close();
      return {
        flagCount: codeFlags.length,
        sizes,
        after,
        pngDecoded: await decodeAnyCodes(id),
        pngBuf: Array.from(new Uint8Array(await pngBlob.arrayBuffer())),
        rendered: { w: img.width, h: img.height },
      };
    }, `http://127.0.0.1:${PORT}/deid/tests/fixtures-synthetic/qr-rot-source.png`);

    assert.ok(
      pdfResult.flagCount >= 1,
      `PDF QR must be flagged: ${JSON.stringify(pdfResult.sizes)}`
    );
    assert.ok(
      pdfResult.sizes.some((s) => s.w >= 80 && s.h >= 80),
      `PDF QR flag too small: ${JSON.stringify(pdfResult.sizes)}`
    );
    assert.deepEqual(pdfResult.after, []);
    assert.deepEqual(pdfResult.pngDecoded, []);
    const pdfOut = path.join(FIX, "qr-pdf-blanked.png");
    fs.writeFileSync(pdfOut, Buffer.from(pdfResult.pngBuf));
    const zb = zbarReadsPayload(pdfOut);
    if (zb.available) assert.equal(zb.hits, false, `zbar on PDF export: ${zb.text}`);
    console.log("OK PDF-rendered QR flagged and blanked");
    await page.close();
  }

  // Harness must not live under /deid/
  assert.equal(fs.existsSync(path.join(REPO, "deid/tests/harness")), false);
  assert.equal(fs.existsSync(path.join(REPO, "tests/deid-harness/install-test-hook.js")), true);

  console.log("qr-rotated-pdf e2e OK");
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
