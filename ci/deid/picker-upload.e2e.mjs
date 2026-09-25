/**
 * Hotfix e2e: file picker must open the system chooser (no capture on main input),
 * camera is a separate input, and PNG/JPEG/PDF (incl. empty MIME) load via #fileInput.
 * Synthetic fixtures only. Emulates iPhone WebKit, Android Chromium, desktop.
 */
import { chromium, webkit } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const FIX = path.join(__dirname, "fixtures-synthetic");
const ART = "/opt/cursor/artifacts";
const PORT = 8815;

fs.mkdirSync(ART, { recursive: true });
fs.mkdirSync(FIX, { recursive: true });

function contentType(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".pdf")) return "application/pdf";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".traineddata")) return "application/octet-stream";
  if (p.endsWith(".svg")) return "image/svg+xml";
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

function ensureFixtures() {
  if (!fs.existsSync(path.join(FIX, "hfa.png"))) {
    spawnSync("node", [path.join(__dirname, "generate-fixtures.mjs")], {
      stdio: "inherit",
      cwd: __dirname,
    });
  }
  const jpg = path.join(FIX, "picker-sample.jpg");
  if (!fs.existsSync(jpg)) {
    const r = spawnSync(
      "ffmpeg",
      ["-y", "-i", path.join(FIX, "hfa.png"), "-q:v", "5", jpg],
      { encoding: "utf8" }
    );
    if (r.status !== 0) {
      throw new Error(`ffmpeg jpeg failed: ${r.stderr || r.stdout}`);
    }
  }
}

async function buildFixturesInBrowser(browser, origin) {
  const page = await browser.newPage();
  await page.goto(`${origin}/deid/`, { waitUntil: "domcontentloaded" });
  const data = await page.evaluate(async () => {
    const { buildMultiPagePdf } = await import("/deid/core/index.js");
    const mk = async (label) => {
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 480;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = "#111";
      ctx.font = "22px sans-serif";
      ctx.fillText("SYNTHETIC PICKER MOCK — FAKE DATA", 24, 48);
      ctx.fillText(label, 24, 88);
      ctx.fillText("Patient: CHAN TAI MAN  HKID A123456(7)", 24, 130);
      ctx.fillText("Right Eye (OD) MD -1.20 dB PSD 1.50 dB", 24, 170);
      const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return { bytes: Array.from(bytes), width: 640, height: 480 };
    };
    const p1 = await mk("Page 1 of 2");
    const p2 = await mk("Page 2 of 2");
    const pdf = buildMultiPagePdf(
      [
        { bytes: new Uint8Array(p1.bytes), width: p1.width, height: p1.height },
        { bytes: new Uint8Array(p2.bytes), width: p2.width, height: p2.height },
      ],
      72
    );
    return { pdf: Array.from(pdf) };
  });
  await page.close();
  const pdfPath = path.join(FIX, "picker-two-page.pdf");
  fs.writeFileSync(pdfPath, Buffer.from(data.pdf));
  return pdfPath;
}

async function assertPickerMarkup(page) {
  const attrs = await page.evaluate(() => {
    const main = document.getElementById("fileInput");
    const cam = document.getElementById("cameraInput");
    const choose = document.querySelector('label[for="fileInput"]');
    const take = document.querySelector('label[for="cameraInput"]');
    return {
      mainCapture: main?.getAttribute("capture"),
      mainAccept: main?.getAttribute("accept") || "",
      mainHiddenDisplay: getComputedStyle(main).display,
      camCapture: cam?.getAttribute("capture"),
      camAccept: cam?.getAttribute("accept") || "",
      chooseTag: choose?.tagName,
      takeTag: take?.tagName,
      chooseFor: choose?.getAttribute("for"),
      takeFor: take?.getAttribute("for"),
    };
  });
  assert.equal(attrs.mainCapture, null, "main #fileInput must not have capture");
  assert.ok(attrs.mainAccept.includes("application/pdf"), "accept must include application/pdf");
  assert.ok(attrs.mainAccept.includes(".pdf"), "accept must include .pdf");
  assert.notEqual(attrs.mainHiddenDisplay, "none", "main input must not be display:none");
  assert.equal(attrs.camCapture, "environment");
  assert.equal(attrs.camAccept, "image/*");
  assert.equal(attrs.chooseTag, "LABEL");
  assert.equal(attrs.takeTag, "LABEL");
  assert.equal(attrs.chooseFor, "fileInput");
  assert.equal(attrs.takeFor, "cameraInput");
}

async function waitWorkspace(page, pages = 1, timeout = 180_000) {
  await page.waitForSelector("#workspace:not(.hidden)", { timeout });
  await page.waitForFunction(
    (n) => {
      const sel = document.getElementById("pageSelect");
      return sel && sel.options.length === n;
    },
    pages,
    { timeout }
  );
  const afterW = await page.evaluate(() => document.getElementById("afterCanvas").width);
  assert.ok(afterW > 0, "page must render to afterCanvas");
}

async function resetHome(page) {
  await page.click("#resetBtn");
  await page.waitForSelector("#dropZone:not(.hidden)");
}

async function approveAllAndExportPdf(page) {
  const n = await page.locator("#pageSelect option").count();
  for (let i = 0; i < n; i++) {
    await page.selectOption("#pageSelect", String(i));
    const blocked = await page.evaluate(() => document.getElementById("approveBtn").disabled);
    if (blocked) {
      await page.click("#blankAllBtn");
      await page.waitForFunction(() => !document.getElementById("approveBtn").disabled, null, {
        timeout: 60_000,
      });
    }
    await page.click("#approveBtn");
    await page.waitForFunction(
      () => /核准|Approved/i.test(document.getElementById("statusMsg")?.textContent || ""),
      null,
      { timeout: 90_000 }
    );
  }
  await page.waitForFunction(() => !document.getElementById("exportPdf").disabled, null, {
    timeout: 10_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    page.click("#exportPdf"),
  ]);
  const dl = await download.path();
  assert.ok(dl, "export PDF download expected");
  const head = fs.readFileSync(dl).subarray(0, 5).toString("utf8");
  assert.equal(head, "%PDF-", "exported file must be PDF");
}

async function runViewport(browserType, device, origin, paths, { doExport = false } = {}) {
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({ ...device });
    const page = await context.newPage();
    const external = [];
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (u.origin !== origin) external.push(req.url());
    });

    await page.goto(`${origin}/deid/`, { waitUntil: "networkidle" });
    await assertPickerMarkup(page);

    await page.locator("#dropZone").screenshot({
      path: path.join(ART, `deid-picker-${device.tag}.png`),
    });

    await page.setInputFiles("#fileInput", paths.png);
    await waitWorkspace(page, 1);
    await resetHome(page);

    await page.setInputFiles("#fileInput", paths.jpg);
    await waitWorkspace(page, 1);
    await resetHome(page);

    await page.setInputFiles("#fileInput", paths.pdf);
    await waitWorkspace(page, 2);
    assert.equal(await page.locator("#pageSelect option").count(), 2);
    await page.locator("#workspace").screenshot({
      path: path.join(ART, `deid-picker-pdf-${device.tag}.png`),
    });

    if (doExport) {
      await approveAllAndExportPdf(page);
    }

    await resetHome(page);

    // PDF with empty file.type (common on iOS/Android when MIME is missing)
    await page.setInputFiles("#fileInput", {
      name: "empty-mime.pdf",
      mimeType: "",
      buffer: fs.readFileSync(paths.pdf),
    });
    await waitWorkspace(page, 2);
    assert.equal(await page.locator("#pageSelect option").count(), 2);

    assert.equal(external.length, 0, `no cross-origin requests: ${external.slice(0, 3)}`);
    await context.close();
  } finally {
    await browser.close();
  }
}

async function main() {
  ensureFixtures();
  const server = await startServer();
  const origin = `http://127.0.0.1:${PORT}`;

  const boot = await chromium.launch({ headless: true });
  const pdfPath = await buildFixturesInBrowser(boot, origin);
  await boot.close();

  assert.equal(fs.readFileSync(pdfPath).subarray(0, 5).toString("utf8"), "%PDF-");

  const paths = {
    png: path.join(FIX, "hfa.png"),
    jpg: path.join(FIX, "picker-sample.jpg"),
    pdf: pdfPath,
  };

  const viewports = [
    {
      type: webkit,
      device: {
        tag: "iphone",
        viewport: { width: 390, height: 844 },
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        isMobile: true,
        hasTouch: true,
      },
      doExport: false,
    },
    {
      type: chromium,
      device: {
        tag: "android",
        viewport: { width: 412, height: 915 },
        userAgent:
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        isMobile: true,
        hasTouch: true,
      },
      doExport: false,
    },
    {
      type: chromium,
      device: {
        tag: "desktop",
        viewport: { width: 1100, height: 900 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      doExport: true,
    },
  ];

  for (const vp of viewports) {
    console.log(`picker e2e: ${vp.device.tag}…`);
    await runViewport(vp.type, vp.device, origin, paths, { doExport: vp.doExport });
    console.log(`picker e2e: ${vp.device.tag} OK`);
  }

  {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    await page.goto(`${origin}/deid/`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(ART, "deid-picker-desktop-home.png"), fullPage: true });
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await mobile.goto(`${origin}/deid/`, { waitUntil: "networkidle" });
    await mobile.screenshot({ path: path.join(ART, "deid-picker-mobile-home.png"), fullPage: true });
    await browser.close();
  }

  server.close();
  console.log("picker-upload e2e OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
