/**
 * Core public API — re-exports for OcuLens / TypeScript porting.
 * @module core/index
 */

export { detectDevice, detectDeviceOrGeneric } from "./detect.js";
export {
  CROP,
  DEVICE_KEYWORDS,
  DEVICE_LABELS,
  LABELS,
  DATE_LABELS,
  ID_LABELS,
  ID_DATE_LABELS,
  RX,
  CJK,
  SERIAL_LABEL_RX,
  SERIAL_VALUE_RX,
  MAX_SHIFT,
  norm,
  isIdentToken,
} from "./rules.js";
export { unrotateBox, rotSize, clampBox, uprightScore } from "./geometry.js";
export { deskewAngle, rotate90, rotateSmall } from "./deskew.js";
export {
  anchorShift,
  computeCropWindows,
  applyCrop,
  fillWhite,
  cropImageData,
  cutRows,
} from "./crop.js";
export {
  labelMasks,
  collectFlags,
  lineSafetyFlags,
  serialHits,
  remainingIdentifiers,
  INSTITUTION_EN,
  INSTITUTION_ZH,
  SIGNATURE_LINE,
  HK_PHONE,
  CLINICAL_LINE,
  CLINICAL_LATIN_TOKEN,
  isClinicalLine,
  isClinicalLatinToken,
  isGenuineHanText,
  shouldAutoBlankCjkWord,
  filterClinicalSafeAutoBlanks,
  boxOverlapsClinicalLatin,
  hasClearIdentifier,
} from "./phi.js";
export {
  detectBarcodeFlags,
  detectDenseHighContrastRegions,
  decodeAnyCodes,
  loadJsQR,
  expandLinearBarcodeBox,
  setBarcodeDecoders,
} from "./barcode.js";
export {
  detectQrFinderFlags,
  expandQrCodeBox,
  findFinderPatterns,
} from "./qrfind.js";
export { remapFlagsAfterCrop, remapFlagsAfterRotate90 } from "./flagmap.js";
export {
  deidPage,
  blankFlag,
  cloneImageData,
  toImageData,
  ocrAllRotations,
} from "./pipeline.js";
export {
  encodeImage,
  makeExportName,
  buildPdfFromJpeg,
  buildMultiPagePdf,
  copyImageToClipboard,
} from "./export.js";
