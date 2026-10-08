/**
 * Rule-based extraction of structured ophthalmic facts from pasted notes.
 * Deterministic and offline. The UI lets the doctor correct every field.
 */
import { ALLERGY_RX, CONDITIONS, DROP_CLASSES, SYSTEMIC, TESTS, TREATMENTS } from "./glossary.js";
import { foldWidth, wordSource } from "./text.js";

const CATEGORIES = [
  ["dx", CONDITIONS],
  ["test", TESTS],
  ["tx", TREATMENTS],
  ["drop", DROP_CLASSES],
];

let compiled = null;
function compileAll() {
  if (compiled) return compiled;
  compiled = [];
  for (const [cat, list] of CATEGORIES) {
    for (const entry of list) {
      const wordParts = [...(entry.words || []), ...(entry.zhWords || [])].map(wordSource);
      const abbrParts = (entry.abbr || []).map(wordSource);
      compiled.push({
        cat,
        entry,
        rxWords: wordParts.length ? new RegExp(wordParts.join("|"), "gi") : null,
        rxAbbr: abbrParts.length ? new RegExp(abbrParts.join("|"), "g") : null,
      });
    }
  }
  return compiled;
}

const EYE_MARKERS = [
  {
    eye: "B",
    rx: /(?<![A-Za-z])(?:OU|BE|B\/E)(?![A-Za-z])|\b(?:both eyes?|bilateral(?:ly)?|bilat)\b|雙眼|双眼|兩眼|两眼|雙側/gi,
  },
  {
    eye: "R",
    rx: /(?<![A-Za-z])(?:OD|RE|R\/E|Rt)(?![A-Za-z])|\b(?:right(?: eye)?|rt eye|r eye)\b|右眼|右側/gi,
  },
  {
    eye: "L",
    rx: /(?<![A-Za-z])(?:OS|LE|L\/E|Lt)(?![A-Za-z])|\b(?:left(?: eye)?|lt eye|l eye)\b|左眼|左側/gi,
  },
];
// Case-sensitive abbreviations must not be matched case-insensitively.
const EYE_ABBR_ONLY = /^(?:OU|BE|B\/E|OD|RE|R\/E|Rt|OS|LE|L\/E|Lt)$/;
const LETTER_MARKERS = [
  { eye: "R", rx: /(?<![A-Za-z])R(?![A-Za-z])(?=\s*[:=]?\s*[\dCHPNL(])|(?<=\()R(?=\))/g },
  { eye: "L", rx: /(?<![A-Za-z])L(?![A-Za-z])(?=\s*[:=]?\s*[\dCHPNL(])|(?<=\()L(?=\))/g },
];

function collectMarkers(text, withLetters = false) {
  const out = [];
  const lists = withLetters ? [...EYE_MARKERS, ...LETTER_MARKERS] : EYE_MARKERS;
  for (const { eye, rx } of lists) {
    for (const m of text.matchAll(rx)) {
      const t = m[0];
      const looksAbbr = /^[A-Za-z/]{1,3}$/.test(t);
      if (looksAbbr && t.length > 1 && !EYE_ABBR_ONLY.test(t)) continue;
      out.push({ eye, start: m.index, end: m.index + t.length });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

function clauseBounds(text, start, end, rx) {
  let s = 0;
  let e = text.length;
  rx.lastIndex = 0;
  for (const m of text.matchAll(rx)) {
    const sepEnd = m.index + m[0].length;
    if (sepEnd <= start) s = sepEnd;
    else if (m.index >= end) {
      e = m.index;
      break;
    }
  }
  return [s, e];
}

const CLAUSE_SEP = /[\n;。]|\.(?=\s|$)/g;
const SUBCLAUSE_SEP = /[\n;。,]|\.(?=\s|$)|\bbut\b|\bhowever\b|但是?/gi;

function eyeFor(markers, text, start, end) {
  const [cs, ce] = clauseBounds(text, start, end, CLAUSE_SEP);
  let best = null;
  for (const mk of markers) {
    if (mk.start < cs || mk.end > ce) continue;
    const gap = mk.end <= start ? start - mk.end : mk.start >= end ? mk.start - end : 0;
    const score = gap + (mk.end <= start ? 0 : 0.5);
    if (!best || score < best.score) best = { eye: mk.eye, score };
  }
  return best ? best.eye : null;
}

const NEG_BEFORE =
  /(?<![A-Za-z])(?:no|nil|not|nor|without|neg|negative for|absent|absence of|free of|free from|denies|denied|excluded|no evidence of|no sign of|no signs of|no features of)(?![A-Za-z])|沒有|没有|無|无|未見|未见|未有|不見|排除|否定|並無|并无|不是/i;
const NEG_AFTER =
  /^\s*[:=]?\s*(?:nil|negative|neg|absent|excluded|ruled out|not seen|not present|not found|not detected|已排除|沒有|没有)/i;
const SUSPECT_BEFORE =
  /(?<![A-Za-z])(?:r\/o|rule[sd]? out|query|suspect(?:ed)?|possible|probable|likely|to exclude)(?![A-Za-z])|\?|疑似|懷疑|怀疑|可能|待排除/i;

function statusFor(text, start, end) {
  const [s, e] = clauseBounds(text, start, end, SUBCLAUSE_SEP);
  const before = text.slice(Math.max(s, start - 45), start);
  const after = text.slice(end, Math.min(e, end + 24));
  if (NEG_AFTER.test(after)) return "negated";
  if (NEG_BEFORE.test(before) && !/(?:r\/o|rule[sd]? out)\s*$/i.test(before)) return "negated";
  if (SUSPECT_BEFORE.test(text.slice(Math.max(s, start - 30), start))) return "suspected";
  return "present";
}

function collectCandidates(text) {
  const raw = [];
  for (const c of compileAll()) {
    for (const rx of [c.rxWords, c.rxAbbr]) {
      if (!rx) continue;
      rx.lastIndex = 0;
      for (const m of text.matchAll(rx)) {
        raw.push({
          cat: c.cat,
          id: c.entry.id,
          entry: c.entry,
          start: m.index,
          end: m.index + m[0].length,
        });
      }
    }
  }
  raw.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const kept = [];
  for (const c of raw) {
    if (!kept.some((k) => c.start < k.end && k.start < c.end)) kept.push(c);
  }
  return kept.sort((a, b) => a.start - b.start);
}

function mergeCandidates(text, cands, markers) {
  const groups = new Map();
  for (const c of cands) {
    const key = `${c.cat}:${c.id}`;
    const status = statusFor(text, c.start, c.end);
    const eye = c.cat === "dx" ? eyeFor(markers, text, c.start, c.end) : null;
    if (!groups.has(key))
      groups.set(key, {
        cat: c.cat,
        id: c.id,
        entry: c.entry,
        statuses: [],
        eyes: new Set(),
        pos: c.start,
      });
    const g = groups.get(key);
    g.statuses.push(status);
    if (eye && status !== "negated") g.eyes.add(eye);
  }
  const out = [];
  for (const g of groups.values()) {
    const status = g.statuses.includes("present")
      ? "present"
      : g.statuses.includes("suspected")
        ? "suspected"
        : "negated";
    let eyes = [...g.eyes];
    if (eyes.includes("B") || (eyes.includes("R") && eyes.includes("L"))) eyes = ["B"];
    out.push({ cat: g.cat, id: g.id, entry: g.entry, status, eye: eyes[0] || "U", pos: g.pos });
  }
  return out.sort((a, b) => a.pos - b.pos);
}

/* ---------- IOP ---------- */

const IOP_WORDS = new Set([
  "od",
  "os",
  "ou",
  "re",
  "le",
  "be",
  "r",
  "l",
  "mmhg",
  "mm",
  "hg",
  "right",
  "left",
  "eye",
  "eyes",
  "both",
  "bilateral",
  "at",
  "and",
  "gat",
  "nct",
  "applanation",
  "goldmann",
  "air",
  "puff",
  "palpation",
  "rt",
  "lt",
]);

function iopSegmentLength(segment) {
  for (const m of segment.matchAll(/[A-Za-z]{2,}|[\u4e00-\u9fff]+/g)) {
    const w = m[0];
    if (/^[\u4e00-\u9fff]+$/.test(w)) {
      if (!/^(?:右眼|左眼|雙眼|双眼|兩眼|两眼|右|左|毫米汞柱)+$/.test(w)) return m.index;
    } else if (!IOP_WORDS.has(w.toLowerCase())) {
      return m.index;
    }
  }
  return segment.length;
}

function parseIop(text, markers) {
  const result = { R: "", L: "", unassigned: [] };
  const masked = [];
  const kw = /(?:\bIOP\b|\bTn\b|\btension\b|眼壓|眼压|眼內壓)\s*[:=]?/gi;
  for (const m of text.matchAll(kw)) {
    const segStart = m.index + m[0].length;
    const lineEnd = text.slice(segStart).search(/[\n;。]/);
    const hardEnd = Math.min(lineEnd === -1 ? text.length : segStart + lineEnd, segStart + 60);
    const segEnd = segStart + iopSegmentLength(text.slice(segStart, hardEnd));
    const segment = text.slice(segStart, segEnd);
    masked.push([m.index, segEnd]);

    const segMarkers = collectMarkers(segment, true).map((x) => ({ ...x }));
    const lead = markers.filter(
      (x) => x.end <= m.index && /^[\s:,(]*$/.test(text.slice(x.end, m.index)),
    );
    const nums = [];
    for (const n of segment.matchAll(/(?<![\d.])(\d{1,2}(?:\.\d)?)(?!\d)(?:\s*mm\s?Hg)?/g)) {
      const v = parseFloat(n[1]);
      if (v < 3 || v > 70) continue;
      nums.push({ value: n[1], start: n.index, end: n.index + n[0].length });
    }
    if (!nums.length) continue;

    if (!segMarkers.length && lead.length) {
      const eye = lead[lead.length - 1].eye;
      for (const n of nums) assignIop(result, eye, n.value);
      continue;
    }
    if (!segMarkers.length) {
      if (nums.length >= 2) {
        assignIop(result, "R", nums[0].value);
        assignIop(result, "L", nums[1].value);
      } else {
        result.unassigned.push(nums[0].value);
      }
      continue;
    }
    for (const n of nums) {
      let best = null;
      for (const mk of segMarkers) {
        const gap = mk.end <= n.start ? n.start - mk.end : mk.start - n.end;
        const score = gap + (mk.end <= n.start ? 0 : 0.5);
        if (!best || score < best.score) best = { eye: mk.eye, score };
      }
      assignIop(result, best.eye, n.value);
    }
  }
  return { result, masked };
}

function assignIop(result, eye, value) {
  if (eye === "B") {
    if (!result.R) result.R = value;
    if (!result.L) result.L = value;
  } else if (!result[eye]) {
    result[eye] = value;
  }
}

/* ---------- Visual acuity ---------- */

const VA_TOKEN =
  /(?<![\d./])(?:6|20)\/\d{1,3}(?:\.\d)?(?:\s?[+-]\d)?(?![\d/])|(?<![A-Za-z])(?:NPL|NLP|CF|HM|PL|LP)(?![A-Za-z])|\b(?:counting fingers|hand movements?|light perception|no light perception)\b/gi;
const VA_KEYWORD =
  /\b(?:VA|BCVA|UCVA|vision|visual acuity|acuity|Snellen|PH|pinhole)\b|視力|视力|針孔/i;

function kindFor(text, start, end) {
  const before = text.slice(Math.max(0, start - 14), start).toLowerCase();
  const after = text.slice(end, end + 18).toLowerCase();
  if (
    /(?:^|[^a-z])(?:ph|pinhole)\s*[:=]?\s*$|針孔\s*[:=]?\s*$/.test(before) ||
    /^\s*(?:ph|pinhole)\b/.test(after)
  )
    return "ph";
  if (
    /(?:^|[^a-z])(?:bcva|cc|corrected|with glasses|w\/ glasses)\s*[:=]?\s*$|戴眼鏡\s*$|矯正\s*$/.test(
      before,
    ) ||
    /^\s*(?:cc|with glasses|corrected)\b/.test(after)
  )
    return "corrected";
  if (
    /(?:^|[^a-z])(?:ucva|sc|unaided|uncorrected|without glasses|naked)\s*[:=]?\s*$|裸眼\s*$|未戴眼鏡\s*$/.test(
      before,
    ) ||
    /^\s*(?:sc|unaided|uncorrected)\b/.test(after)
  )
    return "unaided";
  return "";
}

function normaliseVaToken(raw) {
  const t = raw.trim();
  const up = t.toUpperCase().replace(/\s+/g, " ");
  const map = {
    "COUNTING FINGERS": "CF",
    "HAND MOVEMENT": "HM",
    "HAND MOVEMENTS": "HM",
    "LIGHT PERCEPTION": "PL",
    LP: "PL",
    "NO LIGHT PERCEPTION": "NPL",
    NLP: "NPL",
  };
  return map[up] || t.replace(/\s+/g, "");
}

export function tokenizeVA(text) {
  const tokens = [];
  const folded = foldWidth(text);
  for (const m of folded.matchAll(VA_TOKEN)) {
    tokens.push({
      value: normaliseVaToken(m[0]),
      kind: kindFor(folded, m.index, m.index + m[0].length),
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return tokens;
}

export function formatVaTokens(tokens) {
  return tokens
    .map((t) => (t.kind === "ph" ? `PH ${t.value}` : t.kind ? `${t.value} ${t.kind}` : t.value))
    .join(", ");
}

function parseVa(text, markers, maskRanges) {
  let masked = text;
  for (const [s, e] of maskRanges)
    masked = masked.slice(0, s) + " ".repeat(e - s) + masked.slice(e);
  const va = { R: [], L: [] };
  const vaMarkers = collectMarkers(masked, true);
  for (const t of tokenizeVA(masked)) {
    const [cs, ce] = clauseBounds(masked, t.start, t.end, CLAUSE_SEP);
    const clause = masked.slice(cs, ce);
    const hasKeyword = VA_KEYWORD.test(clause);
    const eye = eyeFor(vaMarkers, masked, t.start, t.end);
    if (!eye) continue;
    if (!hasKeyword && !/^6\//.test(t.value)) continue;
    const targets = eye === "B" ? ["R", "L"] : [eye];
    for (const k of targets) va[k].push({ value: t.value, kind: t.kind });
  }
  return { R: formatVaTokens(va.R), L: formatVaTokens(va.L) };
}

/* ---------- Other fields ---------- */

function parseDemographics(text) {
  const sexMap = (s) => {
    const x = s.toLowerCase();
    if (x === "m" || x === "male" || x === "man" || x === "男") return "M";
    return "F";
  };
  const full =
    /(?<![\d/.])(\d{1,3})\s*-?\s*(?:y\/?o|yo|yrs?|years?(?:[- ]old)?|歲|岁)?[\s,]*(male|female|man|woman|lady|男|女|M|F)(?![A-Za-z\u4e00-\u9fff])/;
  const m = text.match(full);
  if (m) {
    const age = parseInt(m[1], 10);
    if (age >= 1 && age <= 110) return { age, sex: sexMap(m[2]) };
  }
  const ageOnly = text.match(
    /(?<![\d/.])(\d{1,3})\s*-?\s*(?:y\/?o|yo|yrs?|years?(?:[- ]old)?|歲|岁)(?![A-Za-z])/i,
  );
  if (ageOnly) {
    const age = parseInt(ageOnly[1], 10);
    if (age >= 1 && age <= 110) return { age, sex: "" };
  }
  return { age: null, sex: "" };
}

const UNIT_MAP = [
  [/^(?:days?|d|日|天)$/i, "day"],
  [/^(?:weeks?|wks?|w|星期|週|周)$/i, "week"],
  [/^(?:months?|mths?|mos?|m|個月|个月|月)$/i, "month"],
  [/^(?:years?|yrs?|年)$/i, "year"],
];

function parseFollowUp(text) {
  const zhLead =
    /(\d{1,2})(?:\s*(?:-|–|~|至)\s*(\d{1,2}))?\s*(個月|个月|星期|週|周|日|天|年|月)\s*[後后內]?\s*(?:再|回來|返)?\s*(?:復診|覆診|覆檢|復檢|再看|跟進)/;
  const lead = text.match(zhLead);
  if (lead) {
    const unitEntry = UNIT_MAP.find(([r]) => r.test(lead[3]));
    if (unitEntry)
      return {
        n: parseInt(lead[1], 10),
        m: lead[2] ? parseInt(lead[2], 10) : null,
        unit: unitEntry[1],
      };
  }
  const cue =
    /(?<![A-Za-z])(?:review|rv|r\/v|f\/u|fu|follow[\s-]?up|return|revisit|see again|recheck|復診|覆診|覆檢|復檢|再看|跟進)(?![A-Za-z])/gi;
  for (const m of text.matchAll(cue)) {
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 45);
    const slash = tail.match(/(\d{1,2})\s*\/\s*(52|12|7)(?![\d])/);
    if (slash) {
      const unit = { 52: "week", 12: "month", 7: "day" }[slash[2]];
      return { n: parseInt(slash[1], 10), m: null, unit };
    }
    const rx =
      /(\d{1,2})(?:\s*(?:-|–|~|to|至)\s*(\d{1,2}))?\s*(days?|d|weeks?|wks?|w|months?|mths?|mos?|m|years?|yrs?|日|天|星期|週|周|個月|个月|月|年)(?![A-Za-z])/i;
    const t = tail.match(rx);
    if (t) {
      const unitEntry = UNIT_MAP.find(([r]) => r.test(t[3]));
      if (unitEntry)
        return { n: parseInt(t[1], 10), m: t[2] ? parseInt(t[2], 10) : null, unit: unitEntry[1] };
    }
  }
  return null;
}

function parseSystemic(text) {
  return SYSTEMIC.filter((s) => s.rx.some((r) => new RegExp(r, "i").test(text))).map((s) => s.id);
}

const FINDING_KEYWORDS =
  /\b(?:lens|cornea|fundus|disc|cup|macula|retina|AC|anterior chamber|iris|conjunctiva|lids?|vitreous|slit lamp|SLE|CDR|C:D)\b|眼底|角膜|晶體|視網膜|視神經|黃斑|前房/i;

/**
 * @param {string} rawText screened notes
 * @returns structured model
 */
export function extract(rawText) {
  const text = foldWidth(rawText || "");
  const markers = collectMarkers(text);
  const cands = collectCandidates(text);
  const merged = mergeCandidates(text, cands, markers);
  const { result: iop, masked } = parseIop(text, markers);
  const va = parseVa(text, markers, masked);
  const demo = parseDemographics(text);

  const dx = merged.filter((m) => m.cat === "dx");
  const model = {
    age: demo.age,
    sex: demo.sex,
    va,
    iop: { R: iop.R, L: iop.L },
    iopUnassigned: iop.unassigned,
    dx: dx.map((d) => ({ id: d.id, entry: d.entry, status: d.status, eye: d.eye })),
    tests: merged.filter((m) => m.cat === "test" && m.status !== "negated").map((m) => m.entry),
    treatments: merged.filter((m) => m.cat === "tx" && m.status !== "negated").map((m) => m.entry),
    drops: merged.filter((m) => m.cat === "drop" && m.status !== "negated").map((m) => m.entry),
    systemic: parseSystemic(text),
    followUp: parseFollowUp(text),
    has: {
      allergy: ALLERGY_RX.test(text),
      findings: FINDING_KEYWORDS.test(text),
      history: text.trim().length > 40,
    },
  };

  // generic "eye drops" is redundant when a specific class was named
  if (model.drops.some((d) => d.id !== "genericdrops")) {
    model.drops = model.drops.filter((d) => d.id !== "genericdrops");
  }
  // glasses mention is not a treatment plan when an operation is the plan
  return model;
}
