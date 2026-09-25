/**
 * Device crop rules, keywords, PHI regexes — ported from deid.py.
 * @module core/rules
 */

/** @type {Record<string, import('./types.js').CropSpec>} */
export const CROP = {
  pentacam_holladay: {
    keep: [0.0, 0.098, 1.0, 1.0],
    erase: [[0.0, 0.088, 0.343, 0.233]],
    anchors: [{ prefixes: ["holladay"], xRange: [0.15, 0.6], yRange: [0.0, 0.15], expectedY0: 0.066 }],
  },
  pentacam_axl: {
    keep: [0.0, 0.155, 1.0, 0.85],
    erase: [[0.318, 0.198, 0.682, 0.39]],
    anchors: [
      { prefixes: ["software"], xRange: [0.0, 0.1], yRange: [0.75, 0.95], expectedY0: 0.8585 },
      { prefixes: ["exam"], xRange: [0.0, 0.1], yRange: [0.08, 0.2], expectedY0: 0.129 },
    ],
  },
  pentacam_screen: {
    keep: [0.0, 0.207, 1.0, 0.9],
    erase: [],
    anchors: [{ prefixes: ["oculus"], xRange: [0.0, 0.06], yRange: [0.08, 0.2], expectedY0: 0.125 }],
  },
  pentacam_cataract: {
    keep: [0.0, 0.207, 1.0, 0.9],
    erase: [[0.505, 0.541, 0.62, 0.628]],
    anchors: [{ prefixes: ["oculus"], xRange: [0.0, 0.06], yRange: [0.08, 0.2], expectedY0: 0.125 }],
  },
  topcon: {
    keep: [0.0, 0.137, 1.0, 0.952],
    erase: [[0.06, 0.17, 0.4, 0.199]],
    anchors: [
      { prefixes: ["capture"], xRange: [0.04, 0.2], yRange: [0.1, 0.25], expectedY0: 0.178 },
      { prefixes: ["macula"], xRange: [0.6, 1.0], yRange: [0.0, 0.15], expectedY0: 0.0905 },
    ],
  },
  topcon_letter: {
    keep: [0.08, 0.287, 0.935, 0.633],
    erase: [[0.15, 0.297, 0.31, 0.317]],
    anchors: [],
  },
  hfa: {
    keep: [0.04, 0.133, 1.0, 0.834],
    erase: [[0.75, 0.152, 1.0, 0.213]],
    anchors: [
      { prefixes: ["fixation"], xRange: [0.03, 0.16], yRange: [0.12, 0.24], expectedY0: 0.166 },
      { prefixes: ["date"], xRange: [0.7, 0.9], yRange: [0.12, 0.24], expectedY0: 0.165 },
    ],
  },
  alscan: {
    keep: [0.0, 0.106, 1.0, 0.952],
    erase: [],
    anchors: [{ prefixes: ["calculation"], xRange: [0.0, 0.1], yRange: [0.05, 0.12], expectedY0: 0.081 }],
  },
  toric: {
    keep: [0.0, 0.122, 1.0, 0.85],
    erase: [],
    anchors: [{ prefixes: ["os", "od"], xRange: [0.1, 0.25], yRange: [0.1, 0.2], expectedY0: 0.147 }],
  },
  nidek_rs: {
    keep: [0.0, 0.041, 1.0, 0.955],
    erase: [[0.42, 0.082, 0.6, 0.109]],
    cut: [[0.082, 0.12]],
    anchors: [{ prefixes: ["thicknessmap"], xRange: [0.0, 0.1], yRange: [0.09, 0.16], expectedY0: 0.1242 }],
  },
  cirrus: {
    keep: [0.0, 0.126, 1.0, 0.824],
    erase: [],
    anchors: [{ prefixes: ["technician"], xRange: [0.05, 0.25], yRange: [0.06, 0.16], expectedY0: 0.11 }],
  },
  /** Generic fallback: crop a conservative header+footer band. */
  generic: {
    keep: [0.0, 0.12, 1.0, 0.9],
    erase: [],
    anchors: [],
  },
};

export const MAX_SHIFT = 0.035;

/** @type {Record<string, string[]>} */
export const DEVICE_KEYWORDS = {
  alscan: ["nidek", "al scan", "calculation date", "optical biometer", "camellin"],
  pentacam_holladay: ["holladay report", "ekr65", "equiv k readings", "relative pachymetry"],
  topcon: ["topcon", "macula report", "maestro", "maestro2", "shadowgram", "capture date"],
  hfa: [
    "single field analysis",
    "threshold test",
    "sita standard",
    "zeiss",
    "fixation monitor",
    "pattern deviation",
  ],
  pentacam_axl: [
    "pentacam axl",
    "planning date",
    "iol seq",
    "refraction seq",
    "iol toricity",
    "iol database",
    "printout",
    "astig res",
    "cor diseases",
  ],
  pentacam_screen: [
    "corneal power distribution",
    "exam info",
    "exam time",
    "zone dia",
    "power calculations",
    "edit calculation zone",
    "zone diameter",
  ],
  pentacam_cataract: [
    "cataract pre op",
    "exam info",
    "exam time",
    "segment",
    "thinnest",
    "pachy vertex",
  ],
  nidek_rs: [
    "oct setting",
    "macula map",
    "etdrs 9 sector",
    "sector volume",
    "normative database",
    "gullstrand",
    "fovea min",
    "area whole vol",
    "retina scan",
    "sqi",
    "ssi",
  ],
  cirrus: [
    "cirrus",
    "onh and rnfl",
    "rnfl thickness",
    "rnfl symmetry",
    "ganglion cell",
    "macular cube",
    "optic disc cube",
    "signal strength",
    "rnfl clock",
    "rnfl quadrants",
  ],
  topcon_letter: ["patient code", "ophthalmic surgery", "cataract center", "fax"],
  toric: [
    "tecnis",
    "surgeon name",
    "patient information",
    "incision location",
    "calculated orientation",
    "residual refraction",
  ],
};

/** Labels whose values follow on the right (or below). */
export const LABELS = new Set([
  "name",
  "names",
  "lastname",
  "firstname",
  "surname",
  "patient",
  "patientname",
  "pat",
  "patid",
  "patientid",
  "id",
  "pid",
  "mrn",
  "hkid",
  "dob",
  "birth",
  "dateofbirth",
  "birthdate",
  "sex",
  "gender",
  "examiner",
  "operator",
  "physician",
  "doctor",
  "dr",
  "surgeon",
  "surgeonname",
  "technician",
  "hospital",
  "clinic",
  "address",
  "tel",
  "phone",
  "mobile",
  "age",
  "patientage",
  "ethnicity",
  "created",
  "printout",
  "signature",
  "referring",
  "calculation",
  "capture",
]);

export const DATE_LABELS = new Set([
  "date",
  "time",
  "examdate",
  "examtime",
  "capturedate",
  "planning",
]);

export const BELOW = new Set([
  "surgeonname",
  "patientinformation",
  "patientage",
  "patientname",
]);

export const STOP = new Set([
  "eye",
  "od",
  "os",
  "ou",
  "left",
  "right",
  "fixation",
  "stimulus",
  "background",
  "strategy",
  "qs",
  "examinfo",
  "scan",
  "image",
  "analysis",
  "eyestatus",
]);

/** Backstop identity labels (no report-structure words). */
export const ID_LABELS = new Set([
  "name",
  "names",
  "lastname",
  "firstname",
  "surname",
  "patient",
  "patientname",
  "pat",
  "patid",
  "patientid",
  "pid",
  "mrn",
  "hkid",
  "dob",
  "birth",
  "dateofbirth",
  "birthdate",
  "sex",
  "gender",
  "examiner",
  "operator",
  "physician",
  "doctor",
  "dr",
  "surgeon",
  "surgeonname",
  "technician",
  "hospital",
  "clinic",
  "address",
  "tel",
  "phone",
  "mobile",
  "ethnicity",
  "signature",
  "referring",
  "printout",
  "created",
]);

export const ID_DATE_LABELS = new Set([
  "date",
  "examdate",
  "examtime",
  "capturedate",
  "planning",
  "printdate",
]);

const MONTHS = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";

/** PHI / date / ID regexes (same intent as deid.py RX). */
export const RX = [
  /(?<![\d.])\d{1,4}([/.\-])\d{1,2}\1\d{2,4}(?![\d.])/,
  new RegExp(`\\b\\d{1,2}[/\\-]${MONTHS}[/\\-]\\d{2,4}\\b`, "i"),
  new RegExp(`^${MONTHS}\\.?$`, "i"),
  /\b\d{1,2}:\d{2}:\d{2}\b/,
  /\b[A-Z]{1,2}\d{6}\s*\(?[0-9A]\)?/,
  /\b[A-Z]{1,3}\d{4,}[\-]?\d*\b/,
  /\b\d{7,}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?852[-\s]?)?(?:[2-9]\d{3}[-\s]?\d{4})\b/,
];

export const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
export const WHITELIST =
  /^(\(01\)\d{14}.*|ZC[BT]\d+|EKR\d+|HFA\d*|SITA|ZCB00|ETDRS|\d+\.\d+\.\d+\.\d+)$/i;

export const SERIAL_LABEL_RX =
  /^((s\s*[/\\|]\s*n|s[il1]n|sn|s\.n\.?|sno)[:#.]?(\d\S*)?|(serial|ser\.?no)\S*)$/i;
export const SERIAL_TEXT_RX =
  /(?<![a-z])(s\s*[/\\|]\s*n(?![a-z])|serial(\s*(no|number|#))?)/i;
export const SERIAL_VALUE_RX = [/^\d{6}$/, /^[A-Z]{1,4}-?\d{5,}$/, /^\d{3,4}-\d{4,6}$/];

/**
 * Normalize OCR token for label matching.
 * @param {string} t
 * @returns {string}
 */
export function norm(t) {
  return t.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * @param {string} t
 * @returns {boolean}
 */
export function isIdentToken(t) {
  const s = t.replace(/^[\s:;,.[\]{}|]+|[\s:;,.[\]{}|]+$/g, "");
  if (WHITELIST.test(s)) return false;
  // Skip month-only (RX[2]) when alone — handled with neighbours in labelMasks
  return RX[0].test(s) || RX[1].test(s) || RX[3].test(s) || RX[4].test(s) ||
    RX[5].test(s) || RX[6].test(s) || RX[7].test(s) || RX[8].test(s);
}

/**
 * Human-readable device names for UI.
 * @type {Record<string, {en: string, zh: string}>}
 */
export const DEVICE_LABELS = {
  pentacam_holladay: { en: "Pentacam Holladay", zh: "Pentacam Holladay" },
  pentacam_axl: { en: "Pentacam AXL", zh: "Pentacam AXL" },
  pentacam_screen: { en: "Pentacam Corneal Power", zh: "Pentacam 角膜屈力" },
  pentacam_cataract: { en: "Pentacam Cataract Pre-OP", zh: "Pentacam 白內障術前" },
  topcon: { en: "Topcon Maestro 3D Macula", zh: "Topcon Maestro 黃斑" },
  topcon_letter: { en: "Topcon (clinic letterhead)", zh: "Topcon（診所信箋）" },
  hfa: { en: "Zeiss HFA SFA", zh: "Zeiss HFA 單視野" },
  alscan: { en: "NIDEK AL-Scan", zh: "NIDEK AL-Scan" },
  toric: { en: "Tecnis Toric Calculator", zh: "Tecnis 散光 IOL 計算" },
  nidek_rs: { en: "NIDEK RS-3000 OCT", zh: "NIDEK RS-3000 OCT" },
  cirrus: { en: "Zeiss Cirrus OCT", zh: "Zeiss Cirrus OCT" },
  generic: { en: "Generic (fallback)", zh: "通用（後備）" },
};
