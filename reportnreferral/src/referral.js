/**
 * Referral letter to Hospital Authority ophthalmology (English only).
 * Tone changes the wording of courtesy, urgency and closing lines; the clinical
 * facts and the urgency category never change with tone.
 */
import { URGENCY_RANK } from "./glossary.js";
import { followUpPhrase } from "./report.js";

export const TONES = [
  { level: 1, name: "Concise", hint: "Brief and strictly clinical" },
  { level: 2, name: "Courteous", hint: "Polite, professional" },
  { level: 3, name: "Warm", hint: "Friendly and appreciative" },
  { level: 4, name: "Compassionate", hint: "Caring, acknowledges workload and the patient" },
  { level: 5, name: "Angelic", hint: "Deeply gracious and heartfelt" },
];

export const URGENCIES = [
  { id: "routine", label: "Routine", subject: "Routine" },
  { id: "semi", label: "Semi-urgent (Priority 2)", subject: "Semi-urgent (Priority 2)" },
  { id: "urgent", label: "Urgent (Priority 1)", subject: "Urgent (Priority 1)" },
  {
    id: "emergency",
    label: "Emergency: same day",
    subject: "EMERGENCY: same-day assessment requested",
  },
];

export const CLUSTERS = [
  "Any / not specified",
  "Hong Kong East Cluster",
  "Hong Kong West Cluster",
  "Kowloon Central Cluster",
  "Kowloon East Cluster",
  "Kowloon West Cluster",
  "New Territories East Cluster",
  "New Territories West Cluster",
];

export const REQUESTS = [
  { id: "assess", label: "Assessment and management", phrase: "assessment and management" },
  { id: "opinion", label: "Specialist opinion", phrase: "your specialist opinion" },
  { id: "surgery", label: "Evaluation for surgery", phrase: "evaluation for surgical treatment" },
  { id: "laser", label: "Evaluation for laser", phrase: "evaluation for laser treatment" },
  {
    id: "injection",
    label: "Assessment for intravitreal injection",
    phrase: "assessment for intravitreal injection treatment",
  },
  {
    id: "shared",
    label: "Shared care / ongoing follow-up",
    phrase: "shared care and ongoing follow-up",
  },
];

const EYE = { R: "Right eye", L: "Left eye", B: "Both eyes", U: "" };

const OPENING = [
  (who) => `I would be grateful if you could assess ${who}.`,
  (who) => `Thank you for seeing ${who}, whom I am referring for ophthalmology assessment.`,
  (who) =>
    `Thank you very much for taking the time to see ${who}. I would be most grateful for your help and expertise.`,
  (who) =>
    `I know how heavy your clinic sessions are, and I am deeply grateful for your kindness in considering ${who}, whom I would be so glad to have in your care.`,
  (who) =>
    `With sincere respect for the compassionate work that you and your team do every day, I humbly and gratefully ask for your gracious help with ${who}, whose care I entrust to your gentle and expert hands.`,
];

const URGENCY_LINE = {
  routine: [
    null,
    null,
    () => "This is a routine referral, and I am grateful for whatever appointment can be offered.",
    () =>
      "This is a routine referral, and I am truly grateful for any appointment that can be offered.",
    () =>
      "This is a routine referral, and I am humbly grateful for whatever appointment you are able to offer.",
  ],
  semi: [
    () => "This referral is semi-urgent (Priority 2).",
    () => "I would be grateful if the patient could be seen on a semi-urgent basis (Priority 2).",
    () =>
      "Because of the findings below, I would be especially grateful if the patient could be seen on a semi-urgent basis (Priority 2).",
    () =>
      "I realise how many patients need your help; in view of the findings below I respectfully ask whether the patient might be seen on a semi-urgent basis (Priority 2), and I am very grateful for any priority you can give.",
    () =>
      "I am very conscious of the many patients who are waiting, and I ask with humility and gratitude whether, in view of the findings below, the patient might be seen on a semi-urgent basis (Priority 2).",
  ],
  urgent: [
    () => "This referral is urgent (Priority 1).",
    () => "I would be grateful if the patient could be seen on an urgent basis (Priority 1).",
    () =>
      "Because of the findings below, I would be especially grateful if the patient could be seen urgently (Priority 1).",
    () =>
      "I realise how many patients need your help; in view of the findings below I respectfully ask whether the patient might be seen urgently (Priority 1), and I am very grateful for any priority you can give.",
    () =>
      "I am very conscious of the many patients who are waiting, and I ask with humility and gratitude whether, in view of the findings below, the patient might be seen urgently (Priority 1).",
  ],
  emergency: [
    () => "Same-day assessment is requested.",
    () => "I would be grateful for same-day assessment.",
    () =>
      "I would be most grateful if the patient could be assessed today in view of the findings below.",
    () =>
      "In view of the findings below I respectfully ask that the patient be assessed today, and I am deeply grateful for your help at short notice.",
    () =>
      "I ask with the greatest respect, and with heartfelt thanks for your help at such short notice, that the patient be assessed today in view of the findings below.",
  ],
};

const CONCERNS_LEAD = [
  "Patient concerns / circumstances:",
  "Patient concerns and circumstances:",
  "Things the patient has shared that may help you:",
  "Some personal circumstances I would like you to be aware of, so that the patient can be cared for with understanding:",
  "Some personal circumstances that I felt you would want to know, so that the patient can be cared for with the utmost understanding:",
];

const CLOSING = [
  "Thank you.",
  "Thank you for your help. Please contact me if further information would be useful.",
  "Thank you again for your kind help. Please do not hesitate to contact me if any further information would be useful.",
  "Thank you from the bottom of my heart for your kindness, and for all that you and your colleagues do for our patients. Please contact me at any time if I can help in any way.",
  "With deepest gratitude, warmest regards and the highest respect for the care you give, I thank you most sincerely. Please contact me at any time; it would be my privilege to help in any way I can.",
];

export function sampleOpening(level) {
  return OPENING[clampTone(level) - 1]("this patient");
}

const clampTone = (n) => Math.min(5, Math.max(1, Math.round(Number(n) || 3)));

export function suggestUrgency(model) {
  let best = { level: "routine", reasons: [] };
  for (const d of model.dx) {
    if (d.status === "negated") continue;
    const rank = URGENCY_RANK[d.entry.urgency];
    if (rank > URGENCY_RANK[best.level]) best = { level: d.entry.urgency, reasons: [d.entry.en] };
    else if (rank === URGENCY_RANK[best.level] && rank > 1) best.reasons.push(d.entry.en);
  }
  return best;
}

export function completeness(model, notes, question) {
  const hasVa = Boolean((model.va.R || "").trim() || (model.va.L || "").trim());
  const hasIop = Boolean(String(model.iop.R || "").trim() || String(model.iop.L || "").trim());
  return [
    { id: "dx", label: "Diagnosis / impression", ok: model.dx.some((d) => d.status !== "negated") },
    { id: "va", label: "Visual acuity", ok: hasVa },
    { id: "iop", label: "Intraocular pressure", ok: hasIop },
    {
      id: "findings",
      label: "Examination findings (lens, disc, macula, etc.)",
      ok: model.has.findings,
    },
    {
      id: "question",
      label: "What you are asking for",
      ok: Boolean((question || "").trim()) || model.dx.length > 0,
    },
    { id: "systemic", label: "Relevant systemic history", ok: model.systemic.length > 0 },
    { id: "allergy", label: "Allergy status", ok: model.has.allergy },
    {
      id: "meds",
      label: "Current eye medication",
      ok: model.drops.length > 0 || /medication|meds\b|current drugs|用藥|藥物/i.test(notes || ""),
    },
  ];
}

const SYSTEMIC_NAMES = {
  dm: "diabetes mellitus",
  htn: "hypertension",
  lipid: "hyperlipidaemia",
  ihd: "ischaemic heart disease / stroke",
  ckd: "chronic kidney disease",
  asthma: "asthma",
};

function who(model) {
  if (!model.age) return "this patient";
  const noun = model.sex === "M" ? "man" : model.sex === "F" ? "woman" : "patient";
  return `this ${model.age}-year-old ${noun}`;
}

function dxLine(d) {
  const eye = EYE[d.eye] ? `${EYE[d.eye]}: ` : "";
  const unspecified = d.eye === "U" ? " [laterality to confirm]" : "";
  const status = d.status === "suspected" ? " (suspected)" : "";
  return `${eye}${d.entry.en}${status}${unspecified}`;
}

/**
 * @param {object} model structured model (after doctor edits)
 * @param {object} opts { tone, urgency, cluster, request, question, concerns, notes, includeNotes, informed }
 */
export function buildReferral(model, opts = {}) {
  const tone = clampTone(opts.tone);
  const idx = tone - 1;
  const urgency = URGENCIES.find((u) => u.id === opts.urgency) || URGENCIES[0];
  const request = REQUESTS.find((r) => r.id === opts.request) || REQUESTS[0];
  const cluster = opts.cluster && !/^Any/.test(opts.cluster) ? ` (${opts.cluster})` : "";
  const blocks = [];

  blocks.push({
    t: "kv",
    rows: [
      ["Date", "[date]"],
      ["To", `Ophthalmology Specialist Outpatient Clinic, Hospital Authority${cluster}`],
      ["From", "[referring doctor: name, qualifications, HKMC registration no., contact details]"],
      ["Re", `Referral for ophthalmology assessment: ${urgency.subject}`],
      ["Patient", "[name / HKID / HA case no. / date of birth: add from your own records]"],
    ],
  });

  blocks.push({ t: "p", text: "Dear Colleague," });
  blocks.push({ t: "p", text: OPENING[idx](who(model)) });
  const urgencyLine = URGENCY_LINE[urgency.id][idx];
  if (urgencyLine) blocks.push({ t: "p", text: urgencyLine() });

  blocks.push({ t: "h", text: "Reason for referral" });
  const active = model.dx.filter((d) => d.status !== "negated");
  if (active.length) blocks.push({ t: "ul", items: active.map(dxLine) });
  else blocks.push({ t: "p", text: "[reason for referral: please add]" });
  blocks.push({ t: "p", text: `I would be grateful for ${request.phrase}.` });
  if ((opts.question || "").trim()) {
    blocks.push({ t: "p", text: `Specific question: ${opts.question.trim()}` });
  }

  const rows = [];
  const va = [];
  if ((model.va.R || "").trim()) va.push(`Right ${model.va.R.trim()}`);
  if ((model.va.L || "").trim()) va.push(`Left ${model.va.L.trim()}`);
  if (va.length) rows.push(["Visual acuity", va.join("; ")]);
  const iop = [];
  if (String(model.iop.R || "").trim()) iop.push(`Right ${String(model.iop.R).trim()} mmHg`);
  if (String(model.iop.L || "").trim()) iop.push(`Left ${String(model.iop.L).trim()} mmHg`);
  if (iop.length) rows.push(["Intraocular pressure", iop.join("; ")]);
  if (model.systemic.length) {
    rows.push([
      "Relevant systemic history",
      model.systemic.map((s) => SYSTEMIC_NAMES[s]).join(", "),
    ]);
  }
  if (model.tests.length)
    rows.push(["Investigations mentioned", model.tests.map((t) => t.en).join("; ")]);
  if (model.treatments.length)
    rows.push(["Treatment mentioned", model.treatments.map((t) => t.en).join("; ")]);
  if (model.drops.length)
    rows.push(["Medication classes mentioned", model.drops.map((d) => d.en).join("; ")]);
  if (model.followUp)
    rows.push([
      "Review planned",
      `in ${followUpPhrase(model.followUp, "en")} (in the absence of referral)`,
    ]);
  const negatives = model.dx.filter((d) => d.status === "negated");
  if (negatives.length)
    rows.push(["Pertinent negatives (as recorded)", negatives.map((d) => d.entry.en).join(", ")]);
  if (rows.length) {
    blocks.push({ t: "h", text: "Clinical summary" });
    blocks.push({ t: "kv", rows });
  }

  if (opts.includeNotes && (opts.notes || "").trim()) {
    blocks.push({ t: "h", text: "Clinical notes as recorded (personal identifiers removed)" });
    blocks.push({ t: "pre", text: opts.notes.trim() });
  }

  if ((opts.concerns || "").trim()) {
    blocks.push({ t: "h", text: "Patient concerns and circumstances" });
    blocks.push({ t: "p", text: CONCERNS_LEAD[idx] });
    blocks.push({ t: "p", text: opts.concerns.trim() });
  }

  if (opts.informed) {
    blocks.push({
      t: "p",
      text: "The patient has been informed of this referral and the reason for it.",
    });
  }

  blocks.push({ t: "p", text: CLOSING[idx] });
  blocks.push({ t: "p", text: "Yours sincerely," });
  blocks.push({
    t: "sig",
    text: "[referring doctor's name, qualifications and HKMC registration no.]",
  });

  return {
    lang: "en",
    title: "Referral to Ophthalmology, Hospital Authority",
    subtitle: `Tone: ${TONES[idx].name} · Priority: ${urgency.label}`,
    blocks,
  };
}
