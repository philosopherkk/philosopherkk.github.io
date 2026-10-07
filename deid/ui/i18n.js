const STR = {
  zh: {
    title: "影像去識別化",
    subtitle: "Scan De-identifier",
    tagline: "全程在本機處理，影像不會上載。",
    disclaimer:
      "僅為自動化輔助。分享前請自行檢查結果。本工具並非經認證的去識別化產品。",
    drop: "拖放 PDF／JPG／PNG 到此處，或使用下方按鈕：選擇相片或 PDF／拍照。",
    chooseFile: "選擇相片或 PDF / Choose photo or PDF",
    takePhoto: "拍照 / Take photo",
    processing: "處理中…",
    device: "偵測裝置",
    before: "裁切前",
    after: "裁切後",
    flags: "仍須處理的標記",
    flagHint:
      "點紅色方框或以「全部空白覆蓋」處理（含中文姓名等覆核標記）。未清完標記時「核准」維持停用；全部處理並核准後才能匯出。",
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
      "上傳：「選擇相片或 PDF」開相簿／檔案，「拍照」另開相機；不支援 HEIC／HEIF，請改 JPEG／PNG。框選空白／裁切：啟用後在「裁切後」圖上拖曳。條碼／QR：本機 jsQR／ZXing 與尋像偵測（含約 48px 模糊碼）會標紅。中文姓名會標為覆核標記（不會自動空白），請點紅框或「全部空白覆蓋」；未清完標記時「核准」維持停用。OCR 資料首次使用時才下載並快取。",
    heicUnsupported:
      "無法解碼 HEIC／HEIF。請在 iPhone「設定 → 相機 → 格式」改為「高兼容性」，或以 JPEG／PNG 匯出後再試。",
  },
  en: {
    title: "Scan De-identifier",
    subtitle: "影像去識別化",
    tagline: "Fully on-device — nothing is uploaded.",
    disclaimer:
      "Automated aid only. Always check the result yourself before sharing. Not a certified de-identification tool.",
    drop: "Drop PDF / JPG / PNG here, or use the buttons below: Choose photo or PDF / Take photo.",
    chooseFile: "Choose photo or PDF / 選擇相片或 PDF",
    takePhoto: "Take photo / 拍照",
    processing: "Processing…",
    device: "Detected device",
    before: "Before",
    after: "After",
    flags: "Flags still needing action",
    flagHint:
      "Tap a red box or use Blank all (including Chinese-name review flags). Approve stays disabled until every flag is resolved; approve each page before export.",
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
      "Upload: Choose photo or PDF (library/Files) or Take photo; HEIC/HEIF is not supported—use JPEG/PNG. Draw blank/crop: enable a tool, then drag on the After image. Barcodes/QR: on-device jsQR/ZXing plus finder detection (including ~48px smudged codes) are flagged red. Chinese names appear as review flags (not auto-blanked)—tap a red box or Blank all; Approve stays disabled until every flag is resolved. OCR packs download once on first use and are cached.",
    heicUnsupported:
      "Cannot decode HEIC/HEIF. On iPhone set Camera → Formats → Most Compatible, or export as JPEG/PNG and try again.",
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
