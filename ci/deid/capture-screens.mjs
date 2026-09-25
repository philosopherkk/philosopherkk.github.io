/**
 * Capture UI screenshots with synthetic fixtures (stub OCR for speed/reliability).
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const OUT = path.join(__dirname, "fixtures-synthetic");
const ART = "/opt/cursor/artifacts/screenshots";
const PORT = 8766;

fs.mkdirSync(ART, { recursive: true });

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const filePath = path.join(REPO, urlPath.replace(/^\//, ""));
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      const ext = path.extname(filePath);
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".wasm": "application/wasm",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".traineddata": "application/octet-stream",
      };
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      res.end(fs.readFileSync(filePath));
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

const server = await startServer();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`http://127.0.0.1:${PORT}/deid/`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(OUT, "ui-mobile-home.png"), fullPage: true });
await page.screenshot({ path: path.join(ART, "deid-mobile-home.png"), fullPage: true });

// Desktop + process synthetic via pipeline inject into UI state
await page.setViewportSize({ width: 1100, height: 900 });
await page.goto(`http://127.0.0.1:${PORT}/deid/`, { waitUntil: "networkidle" });

await page.evaluate(async (fixUrl) => {
  const { deidPage, cloneImageData } = await import("./core/index.js");
  const { HistoryStack } = await import("./ui/history.js");
  const resp = await fetch(fixUrl);
  const blob = await resp.blob();
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext("2d").drawImage(bmp, 0, 0);
  const imageData = c.getContext("2d").getImageData(0, 0, c.width, c.height);
  bmp.close();

  const ocr = {
    async recognize() {
      return [
        { text: "ZEISS", conf: 90, x0: 20, y0: 10, x1: 80, y1: 28 },
        { text: "SINGLE", conf: 90, x0: 90, y0: 10, x1: 160, y1: 28 },
        { text: "FIELD", conf: 90, x0: 170, y0: 10, x1: 230, y1: 28 },
        { text: "ANALYSIS", conf: 90, x0: 240, y0: 10, x1: 340, y1: 28 },
        { text: "SITA", conf: 90, x0: 20, y0: 150, x1: 70, y1: 168 },
        { text: "STANDARD", conf: 90, x0: 80, y0: 150, x1: 180, y1: 168 },
        { text: "THRESHOLD", conf: 90, x0: 190, y0: 150, x1: 300, y1: 168 },
        { text: "TEST", conf: 90, x0: 310, y0: 150, x1: 360, y1: 168 },
        { text: "PATTERN", conf: 90, x0: 20, y0: 280, x1: 100, y1: 298 },
        { text: "DEVIATION", conf: 90, x0: 110, y0: 280, x1: 220, y1: 298 },
        { text: "FIXATION", conf: 90, x0: 40, y0: 110, x1: 140, y1: 128 },
        { text: "PATIENT", conf: 90, x0: 20, y0: 36, x1: 100, y1: 54 },
        { text: "CHAN", conf: 90, x0: 110, y0: 36, x1: 160, y1: 54 },
        { text: "A123456(7)", conf: 90, x0: 200, y0: 36, x1: 320, y1: 54 },
      ];
    },
  };
  const result = await deidPage(imageData, { ocr });
  // Drive minimal DOM update like app
  document.getElementById("dropZone").classList.add("hidden");
  document.getElementById("workspace").classList.remove("hidden");
  document.getElementById("deviceLabel").textContent = result.device;
  const before = document.getElementById("beforeCanvas");
  const after = document.getElementById("afterCanvas");
  before.width = result.upright.width;
  before.height = result.upright.height;
  before.getContext("2d").putImageData(result.upright, 0, 0);
  after.width = result.imageData.width;
  after.height = result.imageData.height;
  after.getContext("2d").putImageData(result.imageData, 0, 0);
  const overlay = document.getElementById("overlayCanvas");
  overlay.width = after.width;
  overlay.height = after.height;
  const octx = overlay.getContext("2d");
  octx.strokeStyle = "#ff3b3b";
  octx.lineWidth = 3;
  for (const f of result.flags) {
    if (f.blanked) continue;
    const [x0, y0, x1, y1] = f.box;
    octx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }
  document.getElementById("statusMsg").textContent = `device=${result.device} flags=${result.flags.length}`;
  return result.device;
}, `http://127.0.0.1:${PORT}/ci/deid/fixtures-synthetic/hfa.png`);

await page.screenshot({ path: path.join(OUT, "ui-desktop-hfa-synthetic.png"), fullPage: true });
await page.screenshot({ path: path.join(ART, "deid-desktop-hfa-synthetic.png"), fullPage: true });

// Hub card screenshot
await page.setViewportSize({ width: 900, height: 1100 });
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".card")];
  const deid = cards.find((c) => c.textContent.includes("De-identifier") || c.textContent.includes("去識別"));
  deid?.scrollIntoView({ block: "center" });
});
await page.screenshot({ path: path.join(ART, "deid-hub-card.png"), fullPage: false });

console.log("screenshots written");
await browser.close();
server.close();
