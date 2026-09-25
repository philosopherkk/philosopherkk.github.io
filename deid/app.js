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
  detectBarcodeFlags,
  decodeAnyCodes,
  remapFlagsAfterCrop,
  remapFlagsAfterRotate90,
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
  $("overlayCanvas")?.classList.remove("drawing");
  $("drawBlankBtn")?.classList.remove("on");
  $("drawCropBtn")?.classList.remove("on");
  $("workspace").classList.add("hidden");
  $("progressWrap").classList.add("hidden");
  $("statusMsg").textContent = "";
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
    const flags0 = result.flags.map((f) => ({ ...f, box: [...f.box] }));
    const serials0 = result.serialHits.slice();
    history.push(result.imageData, flags0, serials0);
    pages.push({
      original: allPages[i],
      upright: result.upright,
      working: cloneImageData(result.imageData),
      device: result.device,
      flags: flags0.map((f) => ({ ...f, box: [...f.box] })),
      serialHits: serials0.slice(),
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
  pg.history.push(pg.working, pg.flags, pg.serialHits);
  blankFlag(pg.working, flag);
  pg.approved = false;
  refreshUI();
}

function blankAllFlags() {
  const pg = current();
  if (!pg) return;
  pg.history.push(pg.working, pg.flags, pg.serialHits);
  for (const f of pg.flags) {
    if (!f.blanked) blankFlag(pg.working, f);
  }
  pg.approved = false;
  refreshUI();
}

/**
 * After crop/rotate: remap existing flags and re-run barcode detection on the new image.
 * Approve stays gated until every flag is blanked.
 * @param {PageState} pg
 * @param {'crop'|'rotate90'|'none'} [mode]
 * @param {{ cropBox?: [number,number,number,number], prevW?: number, prevH?: number }} [geom]
 */
async function refreshFlagsAfterGeom(pg, mode = "none", geom = {}) {
  let flags = pg.flags.map((f) => ({ ...f, box: [...f.box] }));
  if (mode === "crop" && geom.cropBox) {
    flags = remapFlagsAfterCrop(flags, geom.cropBox);
  } else if (mode === "rotate90") {
    flags = remapFlagsAfterRotate90(flags, geom.prevW || pg.working.width, geom.prevH || pg.working.height, 1);
  }
  // Drop blanked flags that no longer apply; keep unresolved ones remapped
  flags = flags.filter((f) => {
    const [x0, y0, x1, y1] = f.box;
    return x1 > x0 && y1 > y0 && x0 < pg.working.width && y0 < pg.working.height;
  });
  try {
    const codes = await detectBarcodeFlags(pg.working);
    for (const c of codes) {
      // Avoid duplicating overlaps
      const dup = flags.some((f) => boxesOverlap(f.box, c.box));
      if (!dup) flags.push({ ...c, box: [...c.box], blanked: false });
    }
  } catch {
    /* optional */
  }
  pg.flags = flags;
  // Serial hits are image-text — clear until re-OCR; keep Approve gated via flags
  // If no flags remain after remap, do NOT auto-approve — require user check only if truly empty
  pg.serialHits = [];
  pg.approved = false;
}

/** @param {[number,number,number,number]} a @param {[number,number,number,number]} b */
function boxesOverlap(a, b) {
  return Math.min(a[2], b[2]) > Math.max(a[0], b[0]) && Math.min(a[3], b[3]) > Math.max(a[1], b[1]);
}

function setTool(next) {
  tool = next;
  const overlay = $("overlayCanvas");
  overlay.classList.toggle("drawing", tool === "blank" || tool === "crop");
  $("drawBlankBtn").classList.toggle("on", tool === "blank");
  $("drawCropBtn").classList.toggle("on", tool === "crop");
}

function canvasCoords(ev, canvas) {
  const rect = canvas.getBoundingClientRect();
  const clientX = ev.clientX ?? ev.touches?.[0]?.clientX ?? ev.changedTouches?.[0]?.clientX;
  const clientY = ev.clientY ?? ev.touches?.[0]?.clientY ?? ev.changedTouches?.[0]?.clientY;
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  return [x, y];
}

function hitFlagAt(pg, x, y) {
  for (const f of pg.flags) {
    if (f.blanked) continue;
    const [a, b, c, d] = f.box;
    if (x >= a && x <= c && y >= b && y <= d) return f;
  }
  return null;
}

function finishDraw(pg, x0, y0, x1, y1) {
  const box = [
    Math.min(x0, x1),
    Math.min(y0, y1),
    Math.max(x0, x1),
    Math.max(y0, y1),
  ];
  if (box[2] - box[0] < 4 || box[3] - box[1] < 4) return;
  pg.history.push(pg.working, pg.flags, pg.serialHits);
  if (tool === "blank") {
    fillWhite(pg.working, [box]);
    // Mark overlapping flags blanked
    for (const f of pg.flags) {
      if (!f.blanked && boxesOverlap(f.box, box)) f.blanked = true;
    }
    pg.approved = false;
    refreshUI();
  } else if (tool === "crop") {
    const prevW = pg.working.width;
    const prevH = pg.working.height;
    void prevW;
    void prevH;
    pg.working = cropImageData(pg.working, box);
    refreshFlagsAfterGeom(pg, "crop", { cropBox: box }).then(() => refreshUI());
  }
}

function setupOverlayDraw() {
  const overlay = $("overlayCanvas");

  const onDown = (ev) => {
    const pg = current();
    if (!pg) return;
    const [x, y] = canvasCoords(ev, overlay);
    const hit = hitFlagAt(pg, x, y);
    if (hit) {
      ev.preventDefault();
      blankAtFlag(hit);
      return;
    }
    if (!tool) return;
    ev.preventDefault();
    drawStart = [x, y];
    if (ev.pointerId != null) {
      try {
        overlay.setPointerCapture(ev.pointerId);
      } catch {
        /* older Safari */
      }
    }
  };

  const onMove = (ev) => {
    if (!drawStart || !tool) return;
    ev.preventDefault();
  };

  const onUp = (ev) => {
    if (!drawStart || !tool) return;
    ev.preventDefault();
    const pg = current();
    const [x0, y0] = drawStart;
    const [x1, y1] = canvasCoords(ev, overlay);
    drawStart = null;
    if (ev.pointerId != null) {
      try {
        overlay.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
    }
    finishDraw(pg, x0, y0, x1, y1);
  };

  overlay.addEventListener("pointerdown", onDown, { passive: false });
  overlay.addEventListener("pointermove", onMove, { passive: false });
  overlay.addEventListener("pointerup", onUp, { passive: false });
  overlay.addEventListener("pointercancel", () => {
    drawStart = null;
  });

  // Native touch path (iPhone / Playwright CDP touch) — do not rely on pointer synthesis
  overlay.addEventListener(
    "touchstart",
    (ev) => {
      if (!current()) return;
      onDown(ev);
    },
    { passive: false }
  );
  overlay.addEventListener(
    "touchmove",
    (ev) => {
      if (!drawStart || !tool) return;
      ev.preventDefault();
    },
    { passive: false }
  );
  overlay.addEventListener(
    "touchend",
    (ev) => {
      if (!drawStart || !tool) return;
      onUp(ev);
    },
    { passive: false }
  );
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
    const prev = pg.history.undoOnce(pg.working, pg.flags, pg.serialHits);
    if (prev) {
      pg.working = prev.image;
      pg.flags = prev.flags.map((f) => ({ ...f, box: [...f.box] }));
      pg.serialHits = prev.serialHits.slice();
      pg.approved = false;
      refreshUI();
    }
  });
  $("redoBtn").addEventListener("click", () => {
    const pg = current();
    if (!pg) return;
    const next = pg.history.redoOnce(pg.working, pg.flags, pg.serialHits);
    if (next) {
      pg.working = next.image;
      pg.flags = next.flags.map((f) => ({ ...f, box: [...f.box] }));
      pg.serialHits = next.serialHits.slice();
      pg.approved = false;
      refreshUI();
    }
  });
  $("rotateBtn").addEventListener("click", () => {
    const pg = current();
    if (!pg) return;
    pg.history.push(pg.working, pg.flags, pg.serialHits);
    const prevW = pg.working.width;
    const prevH = pg.working.height;
    pg.working = rotate90(pg.working, 1);
    refreshFlagsAfterGeom(pg, "rotate90", { prevW, prevH }).then(() => refreshUI());
  });
  $("drawBlankBtn").addEventListener("click", () => {
    setTool(tool === "blank" ? null : "blank");
  });
  $("drawCropBtn").addEventListener("click", () => {
    setTool(tool === "crop" ? null : "crop");
  });
  $("blankAllBtn").addEventListener("click", blankAllFlags);
  $("approveBtn").addEventListener("click", () => {
    void tryApprove();
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
}

/**
 * Post-blank Approve: re-decode with jsQR + ZXing multi-format (1D+QR).
 * Block Approve and re-flag if anything still decodes.
 */
async function tryApprove() {
  const pg = current();
  if (!pg) return;
  const unresolved = pg.flags.filter((f) => !f.blanked);
  if (unresolved.length || pg.serialHits.length) return;

  $("approveBtn").disabled = true;
  $("statusMsg").textContent = t("processing");
  try {
    const leftover = await decodeAnyCodes(pg.working);
    if (leftover.length) {
      const codes = await detectBarcodeFlags(pg.working);
      for (const c of codes) {
        const dup = pg.flags.some((f) => boxesOverlap(f.box, c.box));
        if (!dup) pg.flags.push({ ...c, box: [...c.box], blanked: false });
      }
      // If detectors returned nothing but decode still found text, force a full-page hold
      if (!pg.flags.some((f) => !f.blanked)) {
        pg.flags.push({
          box: [0, 0, pg.working.width, Math.min(48, pg.working.height)],
          reason: "barcode",
          text: leftover[0],
          blanked: false,
        });
      }
      pg.approved = false;
      $("statusMsg").textContent = `${t("flags")}: ${leftover.length}. ${t("flagHint")}`;
      $("statusMsg").style.color = "var(--warn)";
      refreshUI();
      return;
    }
    pg.approved = true;
    refreshUI();
  } catch (e) {
    pg.approved = false;
    $("statusMsg").textContent = String(e.message || e);
    $("statusMsg").style.color = "var(--danger)";
    refreshUI();
  }
}

/**
 * Minimal controller for Playwright harness only (not assigned to window here).
 * Pixel sampling and flag introspection live in tests/harness/, not this page.
 */
export function getAppController() {
  return {
    setTool,
    current,
    refreshUI,
    syncPageSelect,
    getTool: () => tool,
    get pages() {
      return pages;
    },
    setPages(next) {
      pages = next;
    },
    setPageIdx(i) {
      pageIdx = i;
    },
    hideDropShowWorkspace() {
      $("dropZone").classList.add("hidden");
      $("workspace").classList.remove("hidden");
    },
    clickUndo: () => $("undoBtn").click(),
    clickRotate: () => $("rotateBtn").click(),
    approveBtnDisabled: () => $("approveBtn").disabled,
    getApproved: () => !!current()?.approved,
  };
}

wire();
