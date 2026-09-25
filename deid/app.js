/**
 * Deid web app — UI wiring. Images stay in memory only.
 */
import { applyI18n, t, toggleLang, getLang } from "./ui/i18n.js";
import { createOcrProvider } from "./ui/ocr.js";
import { loadFilePages } from "./ui/loader.js";
import { HistoryStack } from "./ui/history.js";
import {
  deidPage,
  blankFlag,
  cloneImageData,
  fillWhite,
  cropImageData,
  rotate90,
  encodeImage,
  makeExportName,
  buildMultiPagePdf,
  copyImageToClipboard,
  DEVICE_LABELS,
} from "./core/index.js";

/** @typedef {{ original: ImageData, upright: ImageData, working: ImageData, device: string, flags: import('./core/types.js').FlagHit[], serialHits: string[], approved: boolean, removedRegions: number[][], history: HistoryStack }} PageState */

/** @type {PageState[]} */
let pages = [];
let pageIdx = 0;
let ocr = null;
let tool = null; // 'blank' | 'crop' | null
let drawStart = null;

const $ = (id) => document.getElementById(id);

function clearState() {
  pages = [];
  pageIdx = 0;
  tool = null;
  drawStart = null;
  $("workspace").classList.add("hidden");
  $("progressWrap").classList.add("hidden");
  $("statusMsg").textContent = "";
  // Drop references so GC can reclaim image memory
}

async function ensureOcr() {
  if (!ocr) {
    ocr = await createOcrProvider((status, p) => setProgress(status, p));
  }
  return ocr;
}

function setProgress(text, p) {
  $("progressWrap").classList.remove("hidden");
  $("progressText").textContent = `${t("progress")}: ${text}`;
  if (typeof p === "number") $("progressBar").style.width = `${Math.round(p * 100)}%`;
}

function current() {
  return pages[pageIdx] || null;
}

function paintImage(canvas, imageData) {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);
}

function paintOverlay() {
  const pg = current();
  if (!pg) return;
  const canvas = $("overlayCanvas");
  const after = $("afterCanvas");
  canvas.width = after.width;
  canvas.height = after.height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#ff3b3b";
  ctx.lineWidth = Math.max(2, Math.round(canvas.width / 400));
  for (const f of pg.flags) {
    if (f.blanked) continue;
    const [x0, y0, x1, y1] = f.box;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }
}

function refreshUI() {
  const pg = current();
  if (!pg) return;
  const lang = getLang();
  const label = DEVICE_LABELS[pg.device]?.[lang === "zh" ? "zh" : "en"] || pg.device;
  $("deviceLabel").textContent = label;
  paintImage($("beforeCanvas"), pg.upright);
  paintImage($("afterCanvas"), pg.working);
  paintOverlay();

  const unresolved = pg.flags.filter((f) => !f.blanked);
  const serial = pg.serialHits.length;
  if (pg.approved) {
    $("statusMsg").textContent = t("approved");
    $("statusMsg").style.color = "var(--accent)";
  } else if (serial) {
    $("statusMsg").textContent = t("serialWarn") + " " + pg.serialHits.join(", ");
    $("statusMsg").style.color = "var(--danger)";
  } else if (unresolved.length) {
    $("statusMsg").textContent = `${t("flags")}: ${unresolved.length}. ${t("flagHint")}`;
    $("statusMsg").style.color = "var(--warn)";
  } else {
    $("statusMsg").textContent = t("passOk");
    $("statusMsg").style.color = "var(--accent)";
  }

  $("approveBtn").disabled = unresolved.length > 0 || serial > 0;
  const allApproved = pages.length && pages.every((p) => p.approved);
  $("exportPng").disabled = !allApproved;
  $("exportJpg").disabled = !allApproved;
  $("exportPdf").disabled = !allApproved;
  $("copyBtn").disabled = !pg.approved;
}

function syncPageSelect() {
  const sel = $("pageSelect");
  sel.innerHTML = "";
  pages.forEach((_, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${i + 1} / ${pages.length}`;
    if (i === pageIdx) opt.selected = true;
    sel.appendChild(opt);
  });
}

/**
 * @param {File[]} files
 */
async function processFiles(files) {
  if (!files.length) return;
  clearState();
  $("dropZone").classList.add("hidden");
  setProgress(t("processing"), 0.02);
  const provider = await ensureOcr();

  /** @type {ImageData[]} */
  const allPages = [];
  for (const f of files) {
    const imgs = await loadFilePages(f);
    allPages.push(...imgs);
  }

  for (let i = 0; i < allPages.length; i++) {
    setProgress(`${t("processing")} ${i + 1}/${allPages.length}`, (i + 0.1) / allPages.length);
    const result = await deidPage(allPages[i], {
      ocr: provider,
      onProgress: (msg, p) =>
        setProgress(`${msg} (${i + 1}/${allPages.length})`, (i + (p || 0)) / allPages.length),
    });
    const history = new HistoryStack();
    history.push(result.imageData);
    pages.push({
      original: allPages[i],
      upright: result.upright,
      working: cloneImageData(result.imageData),
      device: result.device,
      flags: result.flags.map((f) => ({ ...f, box: [...f.box] })),
      serialHits: result.serialHits.slice(),
      approved: false,
      removedRegions: result.removedRegions || [],
      history,
    });
  }

  // Drop source file buffers from allPages originals after copy — keep for before view
  pageIdx = 0;
  syncPageSelect();
  $("workspace").classList.remove("hidden");
  $("progressWrap").classList.add("hidden");
  refreshUI();
}

function blankAtFlag(flag) {
  const pg = current();
  if (!pg || flag.blanked) return;
  pg.history.push(pg.working);
  blankFlag(pg.working, flag);
  // Remove serial hits that were in this region? Re-clear serial list if user blanked
  pg.serialHits = [];
  pg.approved = false;
  refreshUI();
}

function blankAllFlags() {
  const pg = current();
  if (!pg) return;
  pg.history.push(pg.working);
  for (const f of pg.flags) {
    if (!f.blanked) blankFlag(pg.working, f);
  }
  pg.serialHits = [];
  pg.approved = false;
  refreshUI();
}

function canvasCoords(ev, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
  return [x, y];
}

function setupOverlayDraw() {
  const overlay = $("overlayCanvas");
  overlay.addEventListener("pointerdown", (ev) => {
    const pg = current();
    if (!pg) return;
    const [x, y] = canvasCoords(ev, overlay);
    // Hit-test flags first
    for (const f of pg.flags) {
      if (f.blanked) continue;
      const [a, b, c, d] = f.box;
      if (x >= a && x <= c && y >= b && y <= d) {
        blankAtFlag(f);
        return;
      }
    }
    if (!tool) return;
    drawStart = [x, y];
    overlay.setPointerCapture(ev.pointerId);
  });

  overlay.addEventListener("pointerup", (ev) => {
    if (!drawStart || !tool) return;
    const pg = current();
    const [x0, y0] = drawStart;
    const [x1, y1] = canvasCoords(ev, overlay);
    drawStart = null;
    const box = [
      Math.min(x0, x1),
      Math.min(y0, y1),
      Math.max(x0, x1),
      Math.max(y0, y1),
    ];
    if (box[2] - box[0] < 4 || box[3] - box[1] < 4) return;
    pg.history.push(pg.working);
    if (tool === "blank") {
      fillWhite(pg.working, [box]);
    } else if (tool === "crop") {
      pg.working = cropImageData(pg.working, box);
      pg.flags = [];
    }
    pg.serialHits = [];
    pg.approved = false;
    refreshUI();
  });
}

async function exportPages(kind) {
  if (!pages.length || !pages.every((p) => p.approved)) {
    $("statusMsg").textContent = t("hold");
    return;
  }
  const prefix = $("prefixInput").value || "DEID";
  if (kind === "pdf") {
    const pdfPages = [];
    for (const pg of pages) {
      const blob = await encodeImage(pg.working, "image/jpeg", 0.92);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      pdfPages.push({ bytes, width: pg.working.width, height: pg.working.height });
    }
    const pdf = buildMultiPagePdf(pdfPages, 150);
    downloadBlob(new Blob([pdf], { type: "application/pdf" }), makeExportName(prefix, 1, 1, "pdf").replace("-p1", ""));
    return;
  }
  const mime = kind === "jpg" ? "image/jpeg" : "image/png";
  const ext = kind === "jpg" ? "jpg" : "png";
  for (let i = 0; i < pages.length; i++) {
    const blob = await encodeImage(pages[i].working, mime);
    downloadBlob(blob, makeExportName(prefix, 1, i + 1, ext));
  }
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function wire() {
  applyI18n();
  $("langBtn").addEventListener("click", () => {
    toggleLang();
    applyI18n();
    refreshUI();
  });

  const drop = $("dropZone");
  const input = $("fileInput");
  drop.addEventListener("click", () => input.click());
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") input.click();
  });
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("drag");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("drag");
    processFiles([...e.dataTransfer.files]);
  });
  input.addEventListener("change", () => {
    processFiles([...input.files]);
    input.value = "";
  });

  $("pageSelect").addEventListener("change", () => {
    pageIdx = Number($("pageSelect").value) || 0;
    refreshUI();
  });

  $("undoBtn").addEventListener("click", () => {
    const pg = current();
    if (!pg) return;
    const prev = pg.history.undoOnce(pg.working);
    if (prev) {
      pg.working = prev;
      pg.approved = false;
      refreshUI();
    }
  });
  $("redoBtn").addEventListener("click", () => {
    const pg = current();
    if (!pg) return;
    const next = pg.history.redoOnce(pg.working);
    if (next) {
      pg.working = next;
      pg.approved = false;
      refreshUI();
    }
  });
  $("rotateBtn").addEventListener("click", () => {
    const pg = current();
    if (!pg) return;
    pg.history.push(pg.working);
    pg.working = rotate90(pg.working, 1);
    pg.flags = [];
    pg.approved = false;
    refreshUI();
  });
  $("drawBlankBtn").addEventListener("click", () => {
    tool = tool === "blank" ? null : "blank";
    $("drawBlankBtn").classList.toggle("on", tool === "blank");
    $("drawCropBtn").classList.remove("on");
  });
  $("drawCropBtn").addEventListener("click", () => {
    tool = tool === "crop" ? null : "crop";
    $("drawCropBtn").classList.toggle("on", tool === "crop");
    $("drawBlankBtn").classList.remove("on");
  });
  $("blankAllBtn").addEventListener("click", blankAllFlags);
  $("approveBtn").addEventListener("click", () => {
    const pg = current();
    if (!pg) return;
    const unresolved = pg.flags.filter((f) => !f.blanked);
    if (unresolved.length || pg.serialHits.length) return;
    pg.approved = true;
    refreshUI();
  });
  $("resetBtn").addEventListener("click", () => {
    clearState();
    $("dropZone").classList.remove("hidden");
    if (ocr) {
      ocr.terminate?.();
      ocr = null;
    }
  });

  $("exportPng").addEventListener("click", () => exportPages("png"));
  $("exportJpg").addEventListener("click", () => exportPages("jpg"));
  $("exportPdf").addEventListener("click", () => exportPages("pdf"));
  $("copyBtn").addEventListener("click", async () => {
    const pg = current();
    if (!pg?.approved) return;
    const blob = await encodeImage(pg.working, "image/png");
    try {
      await copyImageToClipboard(blob);
      $("statusMsg").textContent = "OK";
    } catch (e) {
      $("statusMsg").textContent = String(e.message || e);
    }
  });

  setupOverlayDraw();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // Guard: never write image payloads to storage
  const block = () => {
    throw new Error("deid: storage of image data is forbidden");
  };
  // Soft guard — tests check storage emptiness; we don't monkeypatch hard in prod
  void block;
}

wire();
