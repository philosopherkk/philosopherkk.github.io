const STR = {
  zh: {
    title: "影像去識別化",
    subtitle: "Scan De-identifier",
    tagline: "全程在本機處理，影像不會上載。",
    disclaimer:
      "僅為自動化輔助。分享前請自行檢查結果。本工具並非經認證的去識別化產品。",
    drop: "拖放 PDF／JPG／PNG，或點擊選擇／拍照",
    processing: "處理中…",
    device: "偵測裝置",
    before: "裁切前",
    after: "裁切後",
    flags: "仍須處理的標記",
    flagHint: "點紅色方框以空白覆蓋。全部處理並按「核准」後才能匯出。",
    blankAll: "全部空白覆蓋",
    approve: "核准此頁",
    approved: "已核准",
    export: "匯出",
    exportPng: "PNG",
    exportJpg: "JPEG",
    exportPdf: "PDF（純圖像）",
    copy: "複製到剪貼簿",
    prefix: "檔名前綴",
    reset: "清除／重設",
    undo: "復原",
    redo: "重做",
    rotate: "旋轉 90°",
    drawBlank: "框選空白",
    drawCrop: "框選裁切",
    lang: "English",
    pages: "頁",
    serialWarn: "仍偵測到序號／S/N — 請手動空白後再核准。",
    passOk: "此頁未發現未處理標記。",
    hold: "未核准 — 不可匯出",
    privacy: "私隱：無伺服器、無分析、無第三方請求。影像只存於記憶體。",
    progress: "進度",
    help:
      "框選空白／裁切：啟用後在「裁切後」圖上拖曳。條碼／QR：支援 BarcodeDetector 的瀏覽器會自動標記；否則以高對比區塊提示，請人手覆核。OCR 資料首次使用時才下載並快取。",
  },
  en: {
    title: "Scan De-identifier",
    subtitle: "影像去識別化",
    tagline: "Fully on-device — nothing is uploaded.",
    disclaimer:
      "Automated aid only. Always check the result yourself before sharing. Not a certified de-identification tool.",
    drop: "Drop PDF / JPG / PNG, or tap to choose / camera",
    processing: "Processing…",
    device: "Detected device",
    before: "Before",
    after: "After",
    flags: "Flags still needing action",
    flagHint: "Tap a red box to blank it. Approve every page before export.",
    blankAll: "Blank all flags",
    approve: "Approve page",
    approved: "Approved",
    export: "Export",
    exportPng: "PNG",
    exportJpg: "JPEG",
    exportPdf: "PDF (image-only)",
    copy: "Copy to clipboard",
    prefix: "Filename prefix",
    reset: "Clear / reset",
    undo: "Undo",
    redo: "Redo",
    rotate: "Rotate 90°",
    drawBlank: "Draw blank",
    drawCrop: "Draw crop",
    lang: "繁體中文",
    pages: "Pages",
    serialWarn: "Serial / S/N still detected — blank manually before approve.",
    passOk: "No unresolved flags on this page.",
    hold: "Not approved — export blocked",
    privacy: "Privacy: no server, no analytics, no third-party requests. Images stay in memory only.",
    progress: "Progress",
    help:
      "Draw blank/crop: enable a tool, then drag on the After image. Barcodes/QR: flagged via BarcodeDetector when available; otherwise dense high-contrast regions are suggested — always review. OCR language/wasm packs download once on first use and are cached.",
  },
};

let lang = "zh";

export function getLang() {
  return lang;
}

export function toggleLang() {
  lang = lang === "zh" ? "en" : "zh";
  return lang;
}

export function setLang(l) {
  lang = l === "en" ? "en" : "zh";
}

export function t(key) {
  return STR[lang][key] || STR.en[key] || key;
}

export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (k) el.textContent = t(k);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const k = el.getAttribute("data-i18n-placeholder");
    if (k) el.setAttribute("placeholder", t(k));
  });
  document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
}
