/**
 * Best-effort screening for personal identifiers in pasted clinical text.
 * Runs entirely offline. It is a safety net, not a guarantee: the doctor stays
 * responsible for what is pasted. Detection runs on a length-preserving
 * width-folded copy so offsets map back onto the original text.
 */
import { allEnglishTokens } from "./glossary.js";
import { foldWidth } from "./text.js";

const ZH_SURNAMES =
  "陳黃李張劉林梁吳何鄭周蔡葉馮謝鍾郭潘楊羅曾許蕭盧朱邱蘇徐余呂杜袁胡董丁姚馬譚方鄧鄒彭汪藍韓洪文高白江孫戴莫史崔魏薛廖賴簡莊嚴賀倪溫沈陸蔣鄺屈岑甄司徒歐陽區尹符傅趙錢王田石唐宋鄔邵萬關章游麥談殷" +
  "陈黄刘梁吴郑叶冯谢钟郭潘杨罗曾许萧卢朱邱苏徐吕杜袁胡董姚马谭邓邹彭汪蓝韩洪孙戴莫崔魏薛廖赖简庄严贺陆蒋邝赵钱关";
const ZH_TITLES =
  "(?:先生|女士|小姐|太太|夫人|婆婆|伯伯|阿伯|阿婆|伯母|叔叔|醫生|医生|博士|教授|君|同學|同学)";
const ZH_NAME_STOP = [
  "黃斑",
  "高度",
  "高眼",
  "高血",
  "白內",
  "周邊",
  "周圍",
  "馬凡",
  "江湖",
  "文字",
  "石灰",
  "方法",
  "方向",
  "文件",
  "白天",
  "白色",
];

const SURNAMES_NORMAL = [
  "chan",
  "wong",
  "lee",
  "cheung",
  "lau",
  "leung",
  "lam",
  "chow",
  "cheng",
  "tsang",
  "yip",
  "yeung",
  "fung",
  "chu",
  "tam",
  "kwok",
  "poon",
  "tse",
  "tsui",
  "yuen",
  "mak",
  "choi",
  "chung",
  "fong",
  "hung",
  "kwan",
  "lui",
  "pang",
  "shek",
  "szeto",
  "chiu",
  "cheuk",
  "ngai",
  "ngan",
  "leong",
  "shum",
  "suen",
  "tsoi",
  "yim",
  "yau",
  "chik",
  "chong",
  "sze",
  "lok",
  "yan",
  "kwong",
  "kwok",
  "wai",
  "hui",
  "cheong",
  "cheuk",
];
// Short surnames that are also ordinary words or abbreviations: only flagged when written in capitals.
const SURNAMES_AMBIGUOUS = [
  "ho",
  "ng",
  "ma",
  "man",
  "law",
  "tang",
  "yu",
  "lo",
  "ip",
  "so",
  "au",
  "siu",
  "wu",
  "kan",
  "kong",
  "lai",
  "li",
  "liu",
  "to",
  "tai",
  "wan",
  "sin",
  "sit",
  "sum",
  "cho",
  "chin",
  "hon",
  "kam",
  "pun",
  "mo",
  "mui",
  "tong",
];

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const SURNAME_ALT = [
  ...SURNAMES_NORMAL.flatMap((s) => [cap(s), s.toUpperCase()]),
  ...SURNAMES_AMBIGUOUS.map((s) => s.toUpperCase()),
].join("|");
const SURNAME_UPPER_ALT = [...SURNAMES_NORMAL, ...SURNAMES_AMBIGUOUS]
  .map((s) => s.toUpperCase())
  .join("|");

const COMMON_WORDS = [
  "patient",
  "pt",
  "review",
  "plan",
  "history",
  "hx",
  "right",
  "left",
  "both",
  "visual",
  "vision",
  "eye",
  "eyes",
  "acuity",
  "anterior",
  "posterior",
  "segment",
  "slit",
  "lamp",
  "fundus",
  "examination",
  "exam",
  "assessment",
  "impression",
  "diagnosis",
  "medication",
  "medications",
  "allergy",
  "allergies",
  "social",
  "family",
  "systemic",
  "ocular",
  "current",
  "chief",
  "complaint",
  "presenting",
  "intraocular",
  "pressure",
  "refraction",
  "glasses",
  "follow",
  "followup",
  "refer",
  "referral",
  "urgent",
  "routine",
  "today",
  "discussed",
  "advise",
  "advised",
  "start",
  "started",
  "stop",
  "continue",
  "repeat",
  "check",
  "and",
  "the",
  "with",
  "for",
  "no",
  "nil",
  "not",
  "normal",
  "mild",
  "moderate",
  "severe",
  "early",
  "late",
  "high",
  "low",
  "good",
  "poor",
  "clear",
  "stable",
  "improved",
  "worse",
  "from",
  "since",
  "after",
  "before",
  "about",
  "please",
  "thank",
  "thanks",
  "clinic",
  "hospital",
  "department",
  "specialist",
  "outpatient",
  "dear",
  "colleague",
  "doctor",
  "hong",
  "kong",
  "kowloon",
  "new",
  "territories",
  "island",
  "optic",
  "disc",
  "cup",
  "ratio",
  "macula",
  "retina",
  "lens",
  "cornea",
  "conjunctiva",
  "iris",
  "pupil",
  "vitreous",
  "angle",
  "chamber",
  "lid",
  "lids",
  "lashes",
  "orbit",
  "nerve",
  "field",
  "fields",
  "test",
  "scan",
  "photo",
  "laser",
  "surgery",
  "operation",
  "drops",
  "ointment",
  "tablets",
  "tablet",
  "daily",
  "weekly",
  "monthly",
  "weeks",
  "months",
  "years",
  "days",
  "male",
  "female",
  "man",
  "woman",
  "boy",
  "girl",
  "age",
  "aged",
  "year",
  "old",
  "known",
  "case",
  "presents",
  "presented",
  "complains",
  "complained",
  "denies",
  "noted",
  "seen",
  "see",
  "saw",
  "treated",
  "treatment",
  "therapy",
  "result",
  "results",
  "finding",
  "findings",
  "unremarkable",
  "remarkable",
  "significant",
  "background",
  "otherwise",
  "well",
  "fit",
  "blood",
  "sugar",
  "diabetes",
  "diabetic",
  "hypertension",
  "cholesterol",
  "smoker",
  "alcohol",
  "drug",
  "drugs",
  "dose",
  "dosage",
  "twice",
  "once",
  "night",
  "morning",
  "pre",
  "post",
  "operative",
  "postoperative",
  "preoperative",
  "day",
  "week",
  "month",
  "primary",
  "secondary",
  "bilateral",
  "unilateral",
  "date",
  "time",
  "name",
  "number",
  "contact",
  "address",
  "phone",
  "mobile",
  "email",
];
const STOP_WORDS = new Set([...COMMON_WORDS, ...allEnglishTokens()]);

const isCapWord = (w) => /^[A-Z][a-z'’-]+$/.test(w);
const isStop = (w) => STOP_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, ""));
const NAME_LABEL_WORDS = new Set([
  "hkid",
  "id",
  "tel",
  "phone",
  "mobile",
  "dob",
  "age",
  "sex",
  "address",
  "hn",
  "mrn",
  "dx",
  "va",
  "iop",
  "pt",
  "case",
  "file",
  "gender",
  "ref",
]);
const GIVEN_NAME_OK = new Set(["man", "hong", "kong"]);
const isStopGiven = (w) => isStop(w) && !GIVEN_NAME_OK.has(w.toLowerCase());

const LABELS = {
  name: "Name",
  id: "ID number",
  record: "Record / case number",
  phone: "Phone number",
  email: "Email address",
  url: "Web link",
  date: "Date",
  dob: "Date of birth",
  address: "Address",
  age: "Age 90 or over",
  contact: "Messaging / social ID",
};

const REPLACEMENTS = {
  name: "[removed: name]",
  id: "[removed: ID]",
  record: "[removed: record no.]",
  phone: "[removed: phone]",
  email: "[removed: email]",
  url: "[removed: link]",
  date: "[removed: date]",
  dob: "[removed: born]",
  address: "[removed: address]",
  age: "90+ years",
  contact: "[removed: contact]",
};

function push(out, type, severity, start, end, original) {
  if (end <= start) return;
  out.push({
    type,
    label: LABELS[type],
    severity,
    start,
    end,
    text: original.slice(start, end),
    replacement: REPLACEMENTS[type],
  });
}

function validDate(a, b) {
  return (a <= 12 && b <= 31) || (a <= 31 && b <= 12);
}

const MONTHS =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

const MONTHS_CAP =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const DATE_VALUE = new RegExp(
  [
    "\\d{1,4}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{1,4}",
    `\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\.?,?\\s+\\d{2,4}`,
    `(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{2,4}`,
    "\\d{4}\\s*年\\s*\\d{1,2}\\s*月(?:\\s*\\d{1,2}\\s*[日號号])?",
    "\\d{4}",
  ].join("|"),
  "i",
);

/** Each detector receives the folded text and the original and returns raw findings. */
const DETECTORS = [
  function hkid(f, o, out) {
    const rx = /(?<![A-Za-z0-9])[A-Z]{1,2}\s?\d{6}\s?(?:\(\s?[0-9A]\s?\)|[0-9A](?![A-Za-z0-9]))/g;
    for (const m of f.matchAll(rx)) push(out, "id", "certain", m.index, m.index + m[0].length, o);
    const loose = /(?<![A-Za-z0-9])[A-Z]{1,2}\s?\d{6}(?![A-Za-z0-9])/g;
    for (const m of f.matchAll(loose))
      push(out, "id", "possible", m.index, m.index + m[0].length, o);
  },

  function records(f, o, out) {
    const label =
      /(?:\bHN|\bMRN|\bCN|case\s*(?:no\.?|number|#)|file\s*(?:no\.?|number)|hosp(?:ital)?\s*(?:no\.?|number)|ref(?:erence)?\s*no\.?|病歷(?:編號|號碼|號)|檔案(?:編號|號碼|號)|病人編號|個案編號|案號|醫療證)\s*[:#.]?\s*[A-Za-z0-9\-/()]{3,}/gi;
    for (const m of f.matchAll(label))
      push(out, "record", "certain", m.index, m.index + m[0].length, o);
    const generic = /(?<![A-Za-z0-9])[A-Z]{1,4}[-\s]?\d{5,}[A-Z0-9()-]*/g;
    for (const m of f.matchAll(generic))
      push(out, "record", "possible", m.index, m.index + m[0].length, o);
    const longNum = /(?<![\d./-])\d{7,}(?![\d])/g;
    for (const m of f.matchAll(longNum))
      push(out, "record", "possible", m.index, m.index + m[0].length, o);
  },

  function phones(f, o, out) {
    const label =
      /(?:\btel\b|phone|mobile|\bcell\b|contact\s*(?:no\.?|number)?|whatsapp|電話|电话|手提|聯絡電話|聯絡)\s*(?:no\.?|number|號碼)?\s*[:#]?\s*\+?\d[\d\s-]{5,}\d/gi;
    for (const m of f.matchAll(label))
      push(out, "phone", "certain", m.index, m.index + m[0].length, o);
    const hk = /(?<![\d./])(?:\+?852[\s-]?)?[2-35-9]\d{3}[\s-]?\d{4}(?![\d])/g;
    for (const m of f.matchAll(hk)) {
      const digits = m[0].replace(/\D/g, "").slice(-8);
      const looksLikeYears = /^(?:19|20)\d{2}(?:19|20)\d{2}$/.test(digits);
      if (looksLikeYears) continue;
      push(out, "phone", "certain", m.index, m.index + m[0].length, o);
    }
    const intl = /\+\d{1,3}[\s-]?\d[\d\s-]{6,}\d/g;
    for (const m of f.matchAll(intl))
      push(out, "phone", "certain", m.index, m.index + m[0].length, o);
  },

  function emailAndUrl(f, o, out) {
    for (const m of f.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g))
      push(out, "email", "certain", m.index, m.index + m[0].length, o);
    for (const m of f.matchAll(/(?:https?:\/\/|www\.)\S+/gi))
      push(out, "url", "certain", m.index, m.index + m[0].length, o);
    const handle =
      /(?:whatsapp|wechat|weixin|微信|line\s*id|instagram|facebook|telegram)\s*(?:id)?\s*[:=]\s*\S+/gi;
    for (const m of f.matchAll(handle))
      push(out, "contact", "certain", m.index, m.index + m[0].length, o);
  },

  function dates(f, o, out) {
    const dobRx = new RegExp(
      `(?:\\bDOB|D\\.O\\.B\\.?|date\\s+of\\s+birth|birth\\s?date|出生日期|出生日|生日)\\s*[:=]?\\s*(?:${DATE_VALUE.source})?`,
      "gi",
    );
    for (const m of f.matchAll(dobRx))
      push(out, "dob", "certain", m.index, m.index + m[0].length, o);

    const numeric = /(?<![\d./])\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}(?![\d])/g;
    for (const m of f.matchAll(numeric)) {
      const parts = m[0].split(/[/\-.]/).map(Number);
      const yearFirst = String(parts[0]).length === 4 || m[0].split(/[/\-.]/)[0].length === 4;
      const [a, b] = yearFirst ? [parts[1], parts[2]] : [parts[0], parts[1]];
      if (!validDate(a, b)) continue;
      const lastLen = m[0].split(/[/\-.]/)[2].length;
      if (!yearFirst && lastLen !== 2 && lastLen !== 4) continue;
      push(out, "date", "certain", m.index, m.index + m[0].length, o);
    }
    const textual = new RegExp(
      `(?<![A-Za-z0-9])(?:\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\.?,?\\s+\\d{2,4}|(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{2,4})(?![A-Za-z0-9])`,
      "gi",
    );
    for (const m of f.matchAll(textual))
      push(out, "date", "certain", m.index, m.index + m[0].length, o);
    const partial = new RegExp(
      `(?<![A-Za-z0-9])(?:\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS_CAP})|(?:${MONTHS_CAP})\\s+\\d{1,2}(?:st|nd|rd|th)?)(?![A-Za-z0-9])`,
      "g",
    );
    for (const m of f.matchAll(partial))
      push(out, "date", "possible", m.index, m.index + m[0].length, o);
    const zh =
      /\d{4}\s*年\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*[日號号])?|\d{1,2}\s*月\s*\d{1,2}\s*[日號号]/g;
    for (const m of f.matchAll(zh)) push(out, "date", "certain", m.index, m.index + m[0].length, o);
  },

  function addresses(f, o, out) {
    const label = /(?:\baddress|\baddr\b|住址|地址|住在|居住於)\s*[:=]?\s*[^\n;]{3,80}/gi;
    for (const m of f.matchAll(label))
      push(out, "address", "certain", m.index, m.index + m[0].length, o);
    const unit =
      /(?<![A-Za-z])(?:flat|flt|rm|room|unit|blk|block|tower|twr)\.?\s*[A-Za-z]?\d+[A-Za-z]?(?:[,\s]+(?:\d+\/F|floor\s*\d+|block\s*[A-Z0-9]+|tower\s*[A-Z0-9]+))*/gi;
    for (const m of f.matchAll(unit))
      push(out, "address", "certain", m.index, m.index + m[0].length, o);
    const flatLetter = /(?<![A-Za-z])(?:Flat|Flt|Rm|Room|Unit)\.?\s+[A-Z](?![A-Za-z])/g;
    for (const m of f.matchAll(flatLetter))
      push(out, "address", "possible", m.index, m.index + m[0].length, o);
    const floor = /(?<![\d/])\d{1,3}\s*\/\s*F(?![A-Za-z])/g;
    for (const m of f.matchAll(floor))
      push(out, "address", "possible", m.index, m.index + m[0].length, o);
    const street =
      /\b\d{1,4}[A-Za-z]?\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?\s+(?:Road|Rd|Street|St|Lane|Avenue|Ave|Drive|Path|Terrace|Estate|Court|Gardens?|Mansion|Building)\b/g;
    for (const m of f.matchAll(street))
      push(out, "address", "certain", m.index, m.index + m[0].length, o);
    const estate =
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Estate|Court|Garden|Gardens|Mansion|Building|Tower|Towers|Plaza|Villa)\b/g;
    for (const m of f.matchAll(estate)) {
      if (m[0].split(/\s+/).slice(0, -1).some(isStop)) continue;
      push(out, "address", "possible", m.index, m.index + m[0].length, o);
    }
    const zhStreet =
      /[\u4e00-\u9fff]{1,10}(?:道|街|路|邨|苑|花園|大廈|新村|村)\s*\d{1,4}\s*[號号]?/g;
    for (const m of f.matchAll(zhStreet))
      push(out, "address", "possible", m.index, m.index + m[0].length, o);
    const zhUnit = /\d{1,4}\s*[號号][\s\dA-Za-z]{0,8}?[樓座室]|\d{1,5}\s*[樓座室]/g;
    for (const m of f.matchAll(zhUnit))
      push(out, "address", "possible", m.index, m.index + m[0].length, o);
    const zhEstate =
      /[\u4e00-\u9fff]{2,8}(?:邨|苑|花園|大廈|新村)(?:[\u4e00-\u9fff]{1,6}樓)?|[\u4e00-\u9fff]{1,6}樓(?=\s*\d)/g;
    for (const m of f.matchAll(zhEstate))
      push(out, "address", "possible", m.index, m.index + m[0].length, o);
  },

  function names(f, o, out) {
    const labelled =
      /(?<![A-Za-z])(?:patient(?:'s|’s)?\s*name|pt\.?\s*name|full\s*name|name)\s*[:=]\s*|(?:姓名|病人姓名|患者姓名|名字|病人名稱)\s*[:=]?\s*/gi;
    for (const m of f.matchAll(labelled)) {
      const from = m.index + m[0].length;
      const rest = f.slice(from);
      const zh = rest.match(/^[\u4e00-\u9fff]{2,5}/);
      let len = zh ? zh[0].length : 0;
      if (!zh) {
        const latin = rest.match(/^[A-Za-z][A-Za-z'’.-]*(?:[ \t]{1,2}[A-Za-z][A-Za-z'’.-]*){0,3}/);
        if (latin) {
          const kept = [];
          for (const w of latin[0].split(/[ \t]+/)) {
            if (NAME_LABEL_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, ""))) break;
            kept.push(w);
          }
          len = kept.length ? kept.join(" ").length : 0;
          if (kept.length)
            len = latin[0].indexOf(kept[kept.length - 1]) + kept[kept.length - 1].length;
        }
      }
      if (len) push(out, "name", "certain", m.index, from + len, o);
    }

    const lead =
      /(?<![A-Za-z])(?:patient|pt)\s*[:=]\s*((?:(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+)?[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,3})/g;
    for (const m of f.matchAll(lead)) {
      const words = m[1].split(/\s+/);
      if (words.some(isStop)) continue;
      push(out, "name", "certain", m.index, m.index + m[0].length, o);
    }
    const leadZh = new RegExp(
      `(?:病人|患者|病者|求診者)\\s*[:=]\\s*[${ZH_SURNAMES}][\\u4e00-\\u9fff]{1,3}`,
      "g",
    );
    for (const m of f.matchAll(leadZh))
      push(out, "name", "certain", m.index, m.index + m[0].length, o);

    const honorific =
      /(?<![A-Za-z])(?:Mr|Mrs|Ms|Miss|Mdm|Madam|Master|Prof|Dr)\.?\s+([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2})/g;
    for (const m of f.matchAll(honorific)) {
      const words = m[1].split(/\s+/);
      const keep = [];
      for (const w of words) {
        if (isStopGiven(w)) break;
        keep.push(w);
      }
      if (!keep.length) continue;
      const end = m.index + m[0].indexOf(m[1]) + keep.join(" ").length;
      push(out, "name", "certain", m.index, end, o);
    }

    const zhTitled = new RegExp(`[${ZH_SURNAMES}][\\u4e00-\\u9fff]{0,2}${ZH_TITLES}`, "g");
    for (const m of f.matchAll(zhTitled)) {
      if (ZH_NAME_STOP.some((s) => m[0].startsWith(s))) continue;
      push(out, "name", "certain", m.index, m.index + m[0].length, o);
    }

    const zhDemographic = new RegExp(
      `(?<=^|[\\s,.;:\\n])([${ZH_SURNAMES}][\\u4e00-\\u9fff]{1,2})(?=\\s*,?\\s*(?:\\d{1,3}\\s*(?:歲|岁|y\\/?o|[MF](?![A-Za-z]))|[男女](?![\\u4e00-\\u9fff])))`,
      "g",
    );
    for (const m of f.matchAll(zhDemographic)) {
      if (ZH_NAME_STOP.some((s) => m[1].startsWith(s))) continue;
      push(out, "name", "possible", m.index, m.index + m[1].length, o);
    }

    const surnameFirst = new RegExp(
      `(?<![A-Za-z])(${SURNAME_ALT}),?((?:\\s+(?:[A-Z][a-z]+(?:-[a-z]+)?|[A-Z]{3,})){1,2})(?![A-Za-z])`,
      "g",
    );
    for (const m of f.matchAll(surnameFirst)) {
      const given = m[2].trim().split(/\s+/);
      if (given.some(isStopGiven)) continue;
      push(out, "name", "possible", m.index, m.index + m[0].length, o);
    }
    const surnameLast = new RegExp(
      `(?<![A-Za-z])((?:[A-Z][a-z]+(?:-[a-z]+)?\\s+){1,2})(${SURNAME_UPPER_ALT})(?![A-Za-z])`,
      "g",
    );
    for (const m of f.matchAll(surnameLast)) {
      const given = m[1].trim().split(/\s+/);
      if (given.some(isStopGiven)) continue;
      push(out, "name", "possible", m.index, m.index + m[0].length, o);
    }

    const pair = /(?<![A-Za-z])[A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,}){1,2}(?![A-Za-z])/g;
    for (const m of f.matchAll(pair)) {
      const words = m[0].split(/\s+/);
      if (!words.every(isCapWord) || words.some(isStop)) continue;
      push(out, "name", "possible", m.index, m.index + m[0].length, o);
    }
  },

  function ageOver89(f, o, out) {
    const rx =
      /(?<![\d/.])(?:9\d|1[01]\d)\s*-?\s*(?:y\/?o|yo|yrs?|years?(?:[- ]old)?|歲|岁|y\.o\.)(?![A-Za-z])/gi;
    for (const m of f.matchAll(rx)) push(out, "age", "possible", m.index, m.index + m[0].length, o);
    const bare = /(?<![\d/.])(?:9\d|1[01]\d)\s*[MF](?![A-Za-z])/g;
    for (const m of f.matchAll(bare))
      push(out, "age", "possible", m.index, m.index + m[0].length, o);
    const labelled = /(?<![A-Za-z])aged?\s*[:=]?\s*(?:9\d|1[01]\d)(?![\d/.A-Za-z])/gi;
    for (const m of f.matchAll(labelled))
      push(out, "age", "possible", m.index, m.index + m[0].length, o);
  },
];

/** Resolve overlaps: certain beats possible, then longer span wins. */
function resolve(findings) {
  const ranked = [...findings].sort(
    (a, b) =>
      (a.severity === b.severity ? 0 : a.severity === "certain" ? -1 : 1) ||
      b.end - b.start - (a.end - a.start) ||
      a.start - b.start,
  );
  const kept = [];
  for (const f of ranked) {
    if (!kept.some((k) => f.start < k.end && k.start < f.end)) kept.push(f);
  }
  kept.sort((a, b) => a.start - b.start);
  return kept.map((f, i) => ({ ...f, id: `${f.type}-${f.start}-${i}`, key: dismissKey(f) }));
}

export function dismissKey(f) {
  return `${f.type}|${f.text.trim().toLowerCase()}`;
}

/** @returns {Array<{id,key,type,label,severity,start,end,text,replacement}>} */
export function screen(text) {
  if (!text) return [];
  const folded = foldWidth(text);
  const raw = [];
  for (const detect of DETECTORS) detect(folded, text, raw);
  return resolve(raw);
}

export function activeFindings(text, dismissed = new Set()) {
  return screen(text).filter((f) => !dismissed.has(f.key));
}

/** Replace the given findings with neutral placeholders. */
export function redact(text, findings) {
  let out = text;
  for (const f of [...findings].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, f.start) + f.replacement + out.slice(f.end);
  }
  return out;
}

export function contextSnippet(text, f, radius = 24) {
  const s = Math.max(0, f.start - radius);
  const e = Math.min(text.length, f.end + radius);
  return {
    before: (s > 0 ? "…" : "") + text.slice(s, f.start).replace(/\s+/g, " "),
    match: text.slice(f.start, f.end),
    after: text.slice(f.end, e).replace(/\s+/g, " ") + (e < text.length ? "…" : ""),
  };
}
