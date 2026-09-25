/**
 * END-TO-END UI pipeline: file input → OCR → flags → Blank all → Approve → export.
 * Synthetic mocks only. Covers 60° QR, 2-page PDF (upright + 35°), colour-map QR,
 * and a damaged QR. Runs on desktop and mobile viewports.
 */
import QRCode from "qrcode";
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const FIX = path.join(__dirname, "fixtures-synthetic");
const PORT = 8810;
const PAYLOAD = "PATIENT CHAN TAI MAN HKID A123456(7) DOB 01-03-1980";

function contentType(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".pdf")) return "application/pdf";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".traineddata")) return "application/octet-stream";
  if (p.endsWith(".svg")) return "image/svg+xml";
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

function zbarClear(filePath) {
  const z = spawnSync("zbarimg", ["--quiet", "--raw", filePath], { encoding: "utf8" });
  if (z.error && z.error.code === "ENOENT") return { available: false };
  const text = `${z.stdout || ""}${z.stderr || ""}`;
  return { available: true, text, hits: /CHAN TAI MAN|A123456/i.test(text) };
}

async function main() {
  fs.mkdirSync(FIX, { recursive: true });
  const qrPng = await QRCode.toBuffer(PAYLOAD, { width: 180, margin: 2, errorCorrectionLevel: "M" });
  fs.writeFileSync(path.join(FIX, "ui-qr-source.png"), qrPng);

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const origin = `http://127.0.0.1:${PORT}`;

  // Compose fixture files in-browser
  {
    const page = await browser.newPage();
    await page.goto(`${origin}/deid/`, { waitUntil: "domcontentloaded" });
    const data = await page.evaluate(async (qrUrl) => {
      const { buildMultiPagePdf } = await import("/deid/core/index.js");
      const bmp = await createImageBitmap(await (await fetch(qrUrl)).blob());
      const toPng = async (c) => {
        const blob = await new Promise((r) => c.toBlob(r, "image/png"));
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
      };
      const clinical = (ctx, y0 = 140) => {
        ctx.fillStyle = "#000";
        ctx.font = "18px sans-serif";
        // Place below generic keep top (0.12) so auto-crop retains the lines
        ctx.fillText("SYNTHETIC UI MOCK — FAKE DATA", 30, y0);
        ctx.fillText("Right Eye (OD) MD -1.20 dB PSD 1.50 dB", 30, y0 + 34);
        ctx.fillText("Left Eye (OS) MD -0.80 dB PSD 1.10 dB", 30, y0 + 64);
      };

      const c60 = document.createElement("canvas");
      c60.width = 700;
      c60.height = 950;
      const x60 = c60.getContext("2d");
      x60.fillStyle = "#fff";
      x60.fillRect(0, 0, 700, 950);
      clinical(x60);
      x60.save();
      x60.translate(350, 500);
      x60.rotate((60 * Math.PI) / 180);
      x60.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
      x60.restore();

      const cD = document.createElement("canvas");
      cD.width = 700;
      cD.height = 950;
      const xd = cD.getContext("2d");
      xd.fillStyle = "#fff";
      xd.fillRect(0, 0, 700, 950);
      clinical(xd);
      xd.drawImage(bmp, 260, 360);
      xd.fillStyle = "rgba(180,180,180,0.85)";
      xd.fillRect(255, 355, 50, 40);
      xd.fillStyle = "rgba(90,90,90,0.9)";
      xd.beginPath();
      xd.arc(350, 450, 22, 0, Math.PI * 2);
      xd.fill();

      const cM = document.createElement("canvas");
      cM.width = 700;
      cM.height = 950;
      const xm = cM.getContext("2d");
      xm.fillStyle = "#fff";
      xm.fillRect(0, 0, 700, 950);
      clinical(xm);
      for (const [ox, oy] of [
        [40, 280],
        [280, 280],
      ]) {
        for (let y = 0; y < 200; y += 2) {
          for (let x = 0; x < 200; x += 2) {
            const h = (x / 200) * 360;
            const l = 0.35 + (y / 200) * 0.4;
            const s = 0.75;
            const a = s * Math.min(l, 1 - l);
            const f = (n) => {
              const k = (n + h / 30) % 12;
              return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            };
            xm.fillStyle = `rgb(${Math.round(f(0) * 255)},${Math.round(f(8) * 255)},${Math.round(f(4) * 255)})`;
            xm.fillRect(ox + x, oy + y, 2, 2);
          }
        }
      }
      xm.drawImage(bmp, 500, 560);

      const mk = (deg, label) => {
        const c = document.createElement("canvas");
        c.width = 600;
        c.height = 800;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 600, 800);
        ctx.fillStyle = "#000";
        ctx.font = "18px sans-serif";
        // Below generic keep top (0.12 * 800 ≈ 96)
        ctx.fillText(label, 30, 130);
        ctx.fillText("Right Eye (OD) MD -1.20 dB PSD 1.50 dB", 30, 164);
        if (deg === 0) {
          ctx.drawImage(bmp, 210, 400);
        } else {
          ctx.save();
          ctx.translate(300, 420);
          ctx.rotate((deg * Math.PI) / 180);
          ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
          ctx.restore();
        }
        return c;
      };
      const p1 = mk(0, "SYNTHETIC PDF P1 — FAKE DATA");
      const p2 = mk(35, "SYNTHETIC PDF P2 — FAKE DATA");
      const pdfPages = [];
      for (const c of [p1, p2]) {
        const jpegBlob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
        pdfPages.push({
          bytes: new Uint8Array(await jpegBlob.arrayBuffer()),
          width: c.width,
          height: c.height,
        });
      }
      const pdf = buildMultiPagePdf(pdfPages, 72);
      bmp.close();
      return {
        png60: await toPng(c60),
        pngDamaged: await toPng(cD),
        pngMap: await toPng(cM),
        pdf: Array.from(pdf),
      };
    }, `${origin}/ci/deid/fixtures-synthetic/ui-qr-source.png`);

    fs.writeFileSync(path.join(FIX, "ui-qr-60.png"), Buffer.from(data.png60));
    fs.writeFileSync(path.join(FIX, "ui-qr-damaged.png"), Buffer.from(data.pngDamaged));
    fs.writeFileSync(path.join(FIX, "ui-qr-colormap.png"), Buffer.from(data.pngMap));
    fs.writeFileSync(path.join(FIX, "ui-qr-two-page.pdf"), Buffer.from(data.pdf));
    await page.close();
  }

  async function runCase(viewport, label, filePath, opts = {}) {
    const context = await browser.newContext({
      viewport,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    await page.goto(`${origin}/deid/`, { waitUntil: "networkidle" });
    await page.setInputFiles("#fileInput", filePath);

    await page.waitForSelector("#workspace:not(.hidden)", { timeout: 180000 });
    await page.waitForSelector("#progressWrap.hidden", { timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(400);

    const pages = opts.pdfPages || 1;

    for (let pi = 0; pi < pages; pi++) {
      if (pages > 1) {
        await page.selectOption("#pageSelect", String(pi));
        await page.waitForTimeout(250);
      }

      const before = await page.evaluate(() => ({
        approveDisabled: document.getElementById("approveBtn").disabled,
        status: document.getElementById("statusMsg")?.textContent || "",
      }));
      assert.equal(
        before.approveDisabled,
        true,
        `${label} page ${pi}: Approve must be blocked initially (status=${before.status})`
      );

      await page.click("#blankAllBtn");
      await page.waitForTimeout(300);
      await page.waitForFunction(() => !document.getElementById("approveBtn").disabled, {
        timeout: 90000,
      });

      const cleared = await page.evaluate(() => {
        const c = document.getElementById("afterCanvas");
        const ctx = c.getContext("2d");
        const { width: W, height: H } = c;
        // Clinical lines sit near the top of the *kept* crop (~first 120px of after canvas)
        let clinicalDark = 0;
        for (let x = 30; x < Math.min(W - 30, 420); x += 2) {
          for (let y = 5; y < Math.min(120, H); y += 2) {
            const d = ctx.getImageData(x, y, 1, 1).data;
            if (d[0] < 80) clinicalDark++;
          }
        }
        let colorful = 0;
        for (let y = Math.floor(H * 0.15); y < Math.floor(H * 0.45); y += 6) {
          for (let x = 40; x < Math.min(260, W); x += 6) {
            const d = ctx.getImageData(x, y, 1, 1).data;
            const max = Math.max(d[0], d[1], d[2]);
            const min = Math.min(d[0], d[1], d[2]);
            if (max - min > 40 && max > 80) colorful++;
          }
        }
        return { clinicalDark, colorful, W, H };
      });

      assert.ok(
        cleared.clinicalDark > 30,
        `${label} page ${pi}: clinical lines wiped (clinicalDark=${cleared.clinicalDark})`
      );
      if (opts.expectColorMaps) {
        assert.ok(
          cleared.colorful > 40,
          `${label}: colour maps wiped (colorful=${cleared.colorful})`
        );
      }

      await page.click("#approveBtn");
      await page.waitForTimeout(500);
    }

    await page.waitForFunction(() => !document.getElementById("exportPng").disabled, {
      timeout: 30000,
    });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#exportPng"),
    ]);
    const outName = `ui-export-${label.replace(/\s+/g, "-")}.png`;
    const outPath = path.join(FIX, outName);
    await download.saveAs(outPath);

    const decoded = await page.evaluate(async (url) => {
      const { decodeAnyCodes } = await import("/deid/core/index.js");
      const bmp = await createImageBitmap(await (await fetch(url)).blob());
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext("2d").drawImage(bmp, 0, 0);
      bmp.close();
      const id = c.getContext("2d").getImageData(0, 0, c.width, c.height);
      return decodeAnyCodes(id);
    }, `${origin}/ci/deid/fixtures-synthetic/${outName}`);
    assert.deepEqual(decoded, [], `${label}: export still decodes ${JSON.stringify(decoded)}`);

    const zb = zbarClear(outPath);
    if (zb.available) {
      assert.equal(zb.hits, false, `${label}: zbarimg reads PHI: ${zb.text}`);
    }

    console.log(`OK UI pipeline ${label}`);
    await context.close();
  }

  for (const vp of [
    { width: 1100, height: 900, tag: "desktop" },
    { width: 390, height: 844, tag: "mobile" },
  ]) {
    await runCase(vp, `${vp.tag}-60deg`, path.join(FIX, "ui-qr-60.png"));
    await runCase(vp, `${vp.tag}-damaged`, path.join(FIX, "ui-qr-damaged.png"));
    await runCase(vp, `${vp.tag}-colormap`, path.join(FIX, "ui-qr-colormap.png"), {
      expectColorMaps: true,
    });
    await runCase(vp, `${vp.tag}-pdf`, path.join(FIX, "ui-qr-two-page.pdf"), { pdfPages: 2 });
  }

  console.log("ui-pipeline e2e OK");
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
