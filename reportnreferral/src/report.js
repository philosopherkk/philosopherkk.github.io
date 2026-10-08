/**
 * Patient-friendly report (Traditional Chinese for Hong Kong, or English).
 * Content comes only from the offline glossary plus the structured model, so
 * free-text notes (including any brand names) are never echoed to the patient.
 */
import { UNIVERSAL_WARNINGS } from "./glossary.js";
import { tokenizeVA } from "./extract.js";

const EYE = {
  en: { R: "Right eye", L: "Left eye", B: "Both eyes", U: "" },
  zh: { R: "右眼", L: "左眼", B: "雙眼", U: "" },
};

const COPY = {
  en: {
    title: "Your Eye Examination Summary",
    subtitle: "A plain-language summary prepared from your doctor's clinical notes",
    visit: "Date of visit: [date]",
    doctor: "Doctor: [name]",
    visionH: "How well you can see today",
    visionIntro:
      "Vision is measured with a letter chart. In Hong Kong, 6/6 is the standard for normal vision. The second number tells you how large the letters must be before you can read them.",
    pressureH: "Eye pressure",
    pressureIntro:
      "Eye pressure is one of several checks. Your doctor looks at it together with the appearance of the optic nerve, your visual field and other findings, and what is right can differ from person to person.",
    foundH: "What your doctor found",
    foundNone:
      "The notes did not list a specific eye condition. If you have questions, please ask your doctor at your next visit.",
    suspected: "Possible, needs further checks to confirm",
    negH: "Things that were checked and not found (as noted)",
    treatH: "Treatment and eye drops mentioned in your notes",
    testsH: "Tests you had or may need",
    nextH: "What happens next",
    nextBring: "Please bring your glasses and all your eye drops to every visit.",
    nextNoFollow: "Your doctor will tell you when to come back for review.",
    warnH: UNIVERSAL_WARNINGS.en.heading,
    noteH: "Please remember",
    note: "This summary was prepared from your doctor's clinical notes to help you understand your eye visit. It does not replace a discussion with your registered doctor. If anything is unclear, please ask at your next visit.",
    sign: "Prepared by: [doctor's name and signature]",
    unaided: "without glasses",
    corrected: "with glasses",
    pinhole: "with a pinhole",
    pinholeNote:
      "A pinhole test helps show how much of the blur may be due to focusing (glasses power) rather than eye disease.",
  },
  zh: {
    title: "你的眼睛檢查摘要",
    subtitle: "根據醫生診症記錄整理的簡明說明",
    visit: "診症日期：［日期］",
    doctor: "醫生：［姓名］",
    visionH: "你今次的視力",
    visionIntro:
      "視力以視力表量度。在香港，6/6 代表正常視力；斜線後面的數字愈大，表示要把字放得愈大才看得清楚。",
    pressureH: "眼壓",
    pressureIntro:
      "眼壓只是眼睛檢查項目之一。醫生會結合視神經的外觀、視野及其他檢查結果一併考慮，而適合的眼壓水平亦因人而異。",
    foundH: "醫生的檢查發現",
    foundNone: "記錄中沒有列出特定的眼疾。如有疑問，請在下次覆診時向醫生查詢。",
    suspected: "可能有此情況，需要進一步檢查才能確定",
    negH: "已檢查但沒有發現的項目（按記錄）",
    treatH: "記錄中提及的治療及眼藥水",
    testsH: "你已做或可能需要做的檢查",
    nextH: "接下來的安排",
    nextBring: "每次覆診請帶備眼鏡及所有正在使用的眼藥水。",
    nextNoFollow: "醫生會告訴你甚麼時候需要回來覆診。",
    warnH: UNIVERSAL_WARNINGS.zh.heading,
    noteH: "請留意",
    note: "這份摘要是根據醫生的診症記錄整理，目的是幫助你了解今次的眼睛檢查，不能代替與註冊醫生的面談。如有任何不清楚的地方，請在下次覆診時向醫生查詢。",
    sign: "撰寫：［醫生姓名及簽署］",
    unaided: "未戴眼鏡",
    corrected: "戴眼鏡",
    pinhole: "針孔測試",
    pinholeNote: "針孔測試有助判斷視力模糊有多少是因為對焦（眼鏡度數）而非眼疾所致。",
  },
};

/* ---------- vision ---------- */

function snellen(value) {
  const m = /^(6|20)\/(\d{1,3}(?:\.\d)?)/.exec(value);
  return m ? { numerator: Number(m[1]), denominator: Number(m[2]) } : null;
}

function visionBand(value) {
  const s = snellen(value);
  if (!s) return null;
  const ratio = s.denominator / s.numerator;
  if (ratio <= 1) return "normal";
  if (ratio <= 1.5) return "near";
  if (ratio <= 3) return "mild";
  if (ratio <= 6) return "moderate";
  if (ratio <= 10) return "marked";
  return "severe";
}

const BAND = {
  en: {
    normal: "normal vision",
    near: "close to normal",
    mild: "a little below normal",
    moderate: "moderately below normal",
    marked: "well below normal",
    severe: "very low",
  },
  zh: {
    normal: "正常視力",
    near: "接近正常",
    mild: "稍低於正常",
    moderate: "中度低於正常",
    marked: "明顯低於正常",
    severe: "非常低",
  },
};

const SPECIAL = {
  CF: {
    en: "Counting fingers: you could count fingers only at close range.",
    zh: "數手指：只能在近距離數出手指數目。",
  },
  HM: {
    en: "Hand movements: you could only tell that a hand was moving in front of you.",
    zh: "手動：只能分辨眼前有手在移動。",
  },
  PL: {
    en: "Light perception: you could tell light from dark only.",
    zh: "光感：只能分辨光與暗。",
  },
  NPL: { en: "No light perception: no light could be seen.", zh: "無光感：看不到光線。" },
};

function explainVision(value, lang) {
  if (SPECIAL[value]) return SPECIAL[value][lang];
  const s = snellen(value);
  if (!s) return "";
  const band = BAND[lang][visionBand(value)];
  if (lang === "en") {
    const unit = s.numerator === 6 ? "metres" : "feet";
    if (s.denominator === s.numerator) {
      return `This is ${band}: you can read at ${s.numerator} ${unit} what a person with normal vision reads at ${s.numerator} ${unit}.`;
    }
    return `This is ${band}: what you can see at ${s.numerator} ${unit}, a person with normal vision could see at ${s.denominator} ${unit}.`;
  }
  const unit = s.numerator === 6 ? "米" : "英尺";
  if (s.denominator === s.numerator) {
    return `屬於${band}：你在 ${s.numerator} ${unit}看到的，與正常視力的人相同。`;
  }
  return `屬於${band}：你在 ${s.numerator} ${unit}外看到的細節，正常視力的人在 ${s.denominator} ${unit}外已可看到。`;
}

function formatVision(str, lang) {
  const c = COPY[lang];
  const tokens = tokenizeVA(str);
  if (!tokens.length) return { text: str.trim(), note: "" };
  const main = tokens.filter((t) => t.kind !== "ph");
  const ph = tokens.filter((t) => t.kind === "ph");
  const parts = main.map((t) =>
    t.kind === "unaided"
      ? `${t.value} (${c.unaided})`
      : t.kind === "corrected"
        ? `${t.value} (${c.corrected})`
        : t.value,
  );
  ph.forEach((t) => parts.push(`${c.pinhole} ${t.value}`));
  const lead = main[0] || ph[0];
  let note = explainVision(lead.value, lang);
  if (ph.length) note = `${note} ${c.pinholeNote}`.trim();
  return { text: parts.join(lang === "zh" ? "；" : "; "), note };
}

function explainPressure(raw, lang) {
  const v = parseFloat(raw);
  if (Number.isNaN(v)) return "";
  if (lang === "en") {
    if (v > 21) return "This is higher than the usual range (about 10 to 21 mmHg).";
    if (v < 10) return "This is lower than the usual range (about 10 to 21 mmHg).";
    return "This is within the usual range (about 10 to 21 mmHg).";
  }
  if (v > 21) return "這高於一般範圍（約 10 至 21 毫米汞柱）。";
  if (v < 10) return "這低於一般範圍（約 10 至 21 毫米汞柱）。";
  return "這在一般範圍內（約 10 至 21 毫米汞柱）。";
}

/* ---------- follow-up ---------- */

const UNIT_EN = { day: "day", week: "week", month: "month", year: "year" };
const UNIT_ZH = { day: "日", week: "個星期", month: "個月", year: "年" };

export function followUpPhrase(f, lang) {
  if (!f) return "";
  const range = f.m ? (lang === "en" ? `${f.n} to ${f.m}` : `${f.n} 至 ${f.m}`) : String(f.n);
  const plural = (f.m || f.n) > 1;
  if (lang === "en") return `about ${range} ${UNIT_EN[f.unit]}${plural ? "s" : ""}`;
  return `約 ${range} ${UNIT_ZH[f.unit]}`;
}

/* ---------- builder ---------- */

export function buildPatientReport(model, opts = {}) {
  const lang = opts.lang === "en" ? "en" : "zh";
  const includeWarnings = opts.includeWarnings !== false;
  const includeExplainers = opts.includeExplainers !== false;
  const c = COPY[lang];
  const eyeLabel = EYE[lang];
  const blocks = [];
  const sep = lang === "zh" ? "：" : ": ";

  blocks.push({ t: "p", text: `${c.visit}      ${c.doctor}` });

  const vaRows = ["R", "L"].filter((k) => (model.va[k] || "").trim());
  if (vaRows.length) {
    blocks.push({ t: "h", text: c.visionH });
    blocks.push({ t: "p", text: c.visionIntro });
    for (const k of vaRows) {
      const { text, note } = formatVision(model.va[k], lang);
      blocks.push({ t: "item", title: `${eyeLabel[k]}${sep}${text}`, text: note });
    }
  }

  const iopRows = ["R", "L"].filter((k) => String(model.iop[k] || "").trim());
  if (iopRows.length) {
    blocks.push({ t: "h", text: c.pressureH });
    blocks.push({ t: "p", text: c.pressureIntro });
    for (const k of iopRows) {
      const raw = String(model.iop[k]).trim();
      const unit = lang === "zh" ? "毫米汞柱" : "mmHg";
      blocks.push({
        t: "item",
        title: `${eyeLabel[k]}${sep}${raw} ${unit}`,
        text: explainPressure(raw, lang),
      });
    }
  }

  const shown = model.dx.filter((d) => d.status !== "negated");
  blocks.push({ t: "h", text: c.foundH });
  if (!shown.length) {
    blocks.push({ t: "p", text: c.foundNone });
  } else {
    for (const d of shown) {
      const name = lang === "en" ? d.entry.en : d.entry.zh;
      const eye = eyeLabel[d.eye] ? `${eyeLabel[d.eye]}${sep}` : "";
      const tag =
        d.status === "suspected"
          ? lang === "en"
            ? ` (${c.suspected})`
            : `（${c.suspected}）`
          : "";
      blocks.push({
        t: "item",
        title: `${eye}${name}${tag}`,
        text: includeExplainers ? (lang === "en" ? d.entry.plainEn : d.entry.plainZh) : "",
      });
    }
  }

  const negatives = model.dx.filter((d) => d.status === "negated");
  if (negatives.length) {
    blocks.push({ t: "h", text: c.negH });
    blocks.push({
      t: "ul",
      items: negatives.map((d) => (lang === "en" ? d.entry.en : d.entry.zh)),
    });
  }

  if (model.treatments.length || model.drops.length) {
    blocks.push({ t: "h", text: c.treatH });
    for (const tx of model.treatments) {
      blocks.push({
        t: "item",
        title: lang === "en" ? tx.en : tx.zh,
        text: includeExplainers ? (lang === "en" ? tx.plainEn : tx.plainZh) : "",
      });
    }
    for (const d of model.drops) {
      blocks.push({
        t: "item",
        title: lang === "en" ? d.en : d.zh,
        text: lang === "en" ? d.noteEn : d.noteZh,
      });
    }
  }

  if (model.tests.length) {
    blocks.push({ t: "h", text: c.testsH });
    for (const test of model.tests) {
      blocks.push({
        t: "item",
        title: lang === "en" ? test.en : test.zh,
        text: includeExplainers ? (lang === "en" ? test.plainEn : test.plainZh) : "",
      });
    }
  }

  blocks.push({ t: "h", text: c.nextH });
  if (model.followUp) {
    const when = followUpPhrase(model.followUp, lang);
    blocks.push({
      t: "p",
      text:
        lang === "en"
          ? `Your doctor would like to see you again in ${when}.`
          : `醫生希望在${when}後再見你覆診。`,
    });
  } else {
    blocks.push({ t: "p", text: c.nextNoFollow });
  }
  blocks.push({ t: "p", text: c.nextBring });

  if (includeWarnings) {
    const u = UNIVERSAL_WARNINGS[lang];
    const extra = [];
    for (const d of shown) {
      const w = lang === "en" ? d.entry.warnEn : d.entry.warnZh;
      if (w && !extra.includes(w)) extra.push(w);
    }
    blocks.push({ t: "h", text: u.heading });
    blocks.push({ t: "ul", items: [...u.items, ...extra] });
    blocks.push({ t: "alert", text: u.action });
  }

  blocks.push({ t: "h", text: c.noteH });
  blocks.push({ t: "note", text: c.note });
  blocks.push({ t: "sig", text: c.sign });

  return { lang: lang === "zh" ? "zh-HK" : "en", title: c.title, subtitle: c.subtitle, blocks };
}
