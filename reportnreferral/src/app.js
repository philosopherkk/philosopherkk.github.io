import { extract } from "./extract.js";
import { activeFindings, contextSnippet, redact, screen } from "./pii.js";
import { buildPatientReport } from "./report.js";
import {
  buildReferral,
  CLUSTERS,
  completeness,
  REQUESTS,
  sampleOpening,
  suggestUrgency,
  TONES,
  URGENCIES,
} from "./referral.js";
import { docToHtml } from "./render.js";

const EXAMPLE_CLEAN = `65M. Known DM and HTN, NKDA.
VA OD 6/12, OS 6/9 (PH 6/7.5). IOP OD 14, OS 22 mmHg.
SLE: mild nuclear sclerosis cataract OD. OS: POAG, CDR 0.8 with thinning of the inferior rim.
Gonioscopy: open angles OU. OCT RNFL and visual field ordered. No retinal detachment.
Plan: start latanoprost nocte OS. Review in 3 months.`;

const EXAMPLE_PII = `Name: CHAN Tai Man   HKID: A123456(7)   Tel: 9123 4567
DOB 05/06/1958 (65M). Address: Flat 5, 12/F, Happy Court, Kwun Tong.
Seen on 12/03/2024. Mr Chan complains of blurred vision.
VA OD 6/12, OS 6/9. IOP 14/22. Cataract OD, POAG OS.
Review in 3 months.`;

/* ---------- tiny DOM helper ---------- */

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}
const $ = (sel) => document.querySelector(sel);

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/* ---------- screened text field ---------- */

function screenedField({ id, label, hint, rows, placeholder, onChange }) {
  const dismissed = new Set();
  let findings = [];
  const ta = h("textarea", { id, rows, placeholder, spellcheck: "false", autocomplete: "off" });
  const status = h("div", { class: "screen", role: "status", "aria-live": "polite" });
  const wrap = h(
    "div",
    { class: "field" },
    h("label", { for: id }, label),
    hint ? h("p", { class: "hint" }, hint) : null,
    ta,
    status,
  );

  function renderStatus() {
    status.replaceChildren();
    status.className = "screen";
    const text = ta.value;
    ta.classList.toggle("has-issue", findings.length > 0);
    if (!text.trim()) {
      status.append("Checked for personal information as you type.");
      return;
    }
    if (!findings.length) {
      status.classList.add("ok");
      status.append(
        "No personal identifiers detected. This check is best-effort; you remain responsible.",
      );
      return;
    }
    status.classList.add("bad");
    const certain = findings.filter((f) => f.severity === "certain").length;
    status.append(
      h(
        "div",
        { class: "screen-head" },
        h(
          "span",
          {},
          `${findings.length} possible identifier${findings.length === 1 ? "" : "s"} found${certain ? ` (${certain} certain)` : ""}. Remove them to continue.`,
        ),
        h(
          "button",
          {
            type: "button",
            class: "btn sm",
            onclick: () => {
              ta.value = redact(ta.value, findings);
              refresh();
            },
          },
          "Remove all automatically",
        ),
      ),
    );
    const list = h("ul", { class: "findings" });
    for (const f of findings) {
      const snip = contextSnippet(text, f);
      list.append(
        h(
          "li",
          { class: "finding" },
          h(
            "div",
            {},
            h(
              "span",
              { class: `badge ${f.severity}` },
              `${f.label}${f.severity === "possible" ? " (possible)" : ""}`,
            ),
            h("span", { class: "snip" }, snip.before, h("mark", {}, snip.match), snip.after),
          ),
          h(
            "div",
            { class: "acts" },
            h(
              "button",
              {
                type: "button",
                class: "btn sm",
                onclick: () => {
                  ta.focus();
                  ta.setSelectionRange(f.start, f.end);
                },
              },
              "Locate",
            ),
            h(
              "button",
              {
                type: "button",
                class: "btn sm",
                onclick: () => {
                  ta.value = redact(ta.value, [f]);
                  refresh();
                },
              },
              "Remove",
            ),
            h(
              "button",
              {
                type: "button",
                class: "btn sm",
                title: "Keep this text: it is not personal information",
                onclick: () => {
                  dismissed.add(f.key);
                  refresh();
                },
              },
              "Not personal",
            ),
          ),
        ),
      );
    }
    status.append(list);
  }

  function refresh() {
    findings = activeFindings(ta.value, dismissed);
    renderStatus();
    onChange?.();
  }

  const refreshSoon = debounce(refresh, 120);
  ta.addEventListener("input", refreshSoon);
  renderStatus();

  return {
    el: wrap,
    ta,
    get value() {
      return ta.value;
    },
    set value(v) {
      ta.value = v;
      dismissed.clear();
      refresh();
    },
    get findings() {
      return findings;
    },
    recheck() {
      findings = activeFindings(ta.value, dismissed);
      renderStatus();
      return findings;
    },
  };
}

/* ---------- state ---------- */

const state = {
  mode: "patient",
  edits: { va: {}, iop: {}, dxEye: {}, dxStatus: {}, dxRemoved: new Set() },
  urgency: "routine",
  urgencyTouched: false,
  generated: false,
  outputDirty: false,
  lastText: "",
  extracted: null,
  extractedFor: null,
};

const notes = screenedField({
  id: "notes",
  label: "Clinical notes",
  hint: "Paste or type the clinical data, in English and/or Chinese. Please leave out the patient's name, HKID, phone, address and dates; they are screened below and can be removed in one click.",
  rows: 9,
  placeholder: "e.g. 65M. VA OD 6/12, OS 6/9. IOP 14/22. Cataract OD, POAG OS. Review in 3 months.",
  onChange: onNotesChanged,
});
const question = screenedField({
  id: "question",
  label: "Specific question for the specialist (optional)",
  rows: 2,
  placeholder: "e.g. Is laser trabeculoplasty appropriate for the left eye?",
  onChange: onOptionsChanged,
});
const concerns = screenedField({
  id: "concerns",
  label: "Patient concerns or circumstances worth knowing (optional)",
  hint: "For example: anxious about surgery, lives alone, relies on the eye for work. No names or contact details.",
  rows: 2,
  placeholder: "e.g. Lives alone and is anxious about losing independence.",
  onChange: onOptionsChanged,
});
$("#notes-field").append(notes.el);
$("#question-field").append(question.el);
$("#concerns-field").append(concerns.el);
const allFields = [notes, question, concerns];

function model() {
  const text = notes.value;
  if (state.extractedFor !== text) {
    state.extracted = extract(text);
    state.extractedFor = text;
  }
  const base = state.extracted;
  const dx = base.dx
    .filter((d) => !state.edits.dxRemoved.has(d.id))
    .map((d) => ({
      ...d,
      eye: state.edits.dxEye[d.id] ?? d.eye,
      status: state.edits.dxStatus[d.id] ?? d.status,
    }));
  return {
    ...base,
    dx,
    va: { R: state.edits.va.R ?? base.va.R, L: state.edits.va.L ?? base.va.L },
    iop: { R: state.edits.iop.R ?? base.iop.R, L: state.edits.iop.L ?? base.iop.L },
  };
}

/* ---------- understood panel ---------- */

const EYE_OPTIONS = [
  ["R", "Right eye"],
  ["L", "Left eye"],
  ["B", "Both eyes"],
  ["U", "Eye not stated"],
];
const STATUS_OPTIONS = [
  ["present", "Present"],
  ["suspected", "Suspected"],
  ["negated", "Not present"],
];

function select(options, value, onchange, label) {
  const el = h(
    "select",
    { "aria-label": label, onchange: (e) => onchange(e.target.value) },
    options.map(([v, t]) => h("option", { value: v, selected: v === value }, t)),
  );
  return el;
}

function renderUnderstood() {
  const card = $("#understood-card");
  const box = $("#understood");
  if (!notes.value.trim()) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  const m = model();
  box.replaceChildren();

  const input = (group, key, value, placeholder) =>
    h("input", {
      type: "text",
      value,
      placeholder,
      "aria-label": `${group === "va" ? "Visual acuity" : "Eye pressure"} ${key === "R" ? "right" : "left"} eye`,
      oninput: (e) => {
        state.edits[group][key] = e.target.value;
        onOptionsChanged();
      },
    });

  const vaBox = h(
    "div",
    { class: "u-box" },
    h("h3", {}, "Visual acuity"),
    h("div", { class: "pair" }, h("span", {}, "Right"), input("va", "R", m.va.R, "e.g. 6/12")),
    h("div", { class: "pair" }, h("span", {}, "Left"), input("va", "L", m.va.L, "e.g. 6/9")),
  );
  const iopBox = h(
    "div",
    { class: "u-box" },
    h("h3", {}, "Eye pressure (mmHg)"),
    h(
      "div",
      { class: "pair" },
      h("span", {}, "Right"),
      input("iop", "R", String(m.iop.R), "e.g. 14"),
    ),
    h(
      "div",
      { class: "pair" },
      h("span", {}, "Left"),
      input("iop", "L", String(m.iop.L), "e.g. 18"),
    ),
    m.iopUnassigned.length
      ? h(
          "p",
          { class: "muted small" },
          `A pressure of ${m.iopUnassigned.join(", ")} was found without an eye. Please enter it above.`,
        )
      : null,
  );

  const dxBox = h("div", { class: "u-box", style: null }, h("h3", {}, "Conditions"));
  if (!state.extracted.dx.length) {
    dxBox.append(
      h(
        "p",
        { class: "muted small" },
        "No known condition term was recognised. The documents will say so; you can edit the text afterwards.",
      ),
    );
  } else {
    const list = h("ul", { class: "dx-list" });
    for (const d of state.extracted.dx) {
      if (state.edits.dxRemoved.has(d.id)) continue;
      const cur = m.dx.find((x) => x.id === d.id);
      list.append(
        h(
          "li",
          { class: "dx-row" },
          h("span", { class: "name" }, d.entry.en),
          select(
            EYE_OPTIONS,
            cur.eye,
            (v) => {
              state.edits.dxEye[d.id] = v;
              onOptionsChanged();
            },
            `Eye for ${d.entry.en}`,
          ),
          select(
            STATUS_OPTIONS,
            cur.status,
            (v) => {
              state.edits.dxStatus[d.id] = v;
              onOptionsChanged();
            },
            `Status of ${d.entry.en}`,
          ),
          h(
            "button",
            {
              type: "button",
              class: "btn sm",
              "aria-label": `Ignore ${d.entry.en}`,
              onclick: () => {
                state.edits.dxRemoved.add(d.id);
                renderUnderstood();
                onOptionsChanged();
              },
            },
            "Ignore",
          ),
        ),
      );
    }
    dxBox.append(list);
  }

  const chips = (title, items) =>
    items.length
      ? h(
          "div",
          { class: "u-box" },
          h("h3", {}, title),
          h(
            "div",
            { class: "chips" },
            items.map((i) => h("span", { class: "chip" }, i)),
          ),
        )
      : null;

  const demo = [];
  if (m.age) demo.push(`${m.age}-year-old`);
  if (m.sex) demo.push(m.sex === "M" ? "male" : "female");
  if (m.followUp)
    demo.push(
      `review in ${m.followUp.n}${m.followUp.m ? "–" + m.followUp.m : ""} ${m.followUp.unit}${m.followUp.n > 1 || m.followUp.m ? "s" : ""}`,
    );

  box.append(
    h(
      "div",
      { class: "u-grid" },
      vaBox,
      iopBox,
      dxBox,
      chips(
        "Tests mentioned",
        m.tests.map((t) => t.en),
      ),
      chips(
        "Treatment mentioned",
        m.treatments.map((t) => t.en),
      ),
      chips(
        "Medication classes",
        m.drops.map((t) => t.en),
      ),
      chips("Other details", [
        ...demo,
        ...m.systemic.map(
          (s) =>
            ({
              dm: "diabetes",
              htn: "hypertension",
              lipid: "high lipids",
              ihd: "heart disease / stroke",
              ckd: "kidney disease",
              asthma: "asthma",
            })[s],
        ),
      ]),
    ),
  );
}

/* ---------- options ---------- */

function mode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function readOptions() {
  return {
    lang: document.querySelector('input[name="lang"]:checked').value,
    includeExplainers: $("#opt-explain").checked,
    includeWarnings: $("#opt-warn").checked,
    tone: Number($("#opt-tone").value),
    cluster: $("#opt-cluster").value,
    request: $("#opt-request").value,
    urgency: state.urgency,
    question: question.value,
    concerns: concerns.value,
    includeNotes: $("#opt-notes").checked,
    informed: $("#opt-informed").checked,
    notes: notes.value,
  };
}

function renderTone() {
  const level = Number($("#opt-tone").value);
  const t = TONES[level - 1];
  $("#tone-name").textContent = `${level}. ${t.name}`;
  $("#tone-hint").textContent = `${t.hint}`;
  $("#tone-desc").textContent = `"${sampleOpening(level)}"`;
}

function renderUrgency() {
  const m = model();
  const sug = suggestUrgency(m);
  const label = URGENCIES.find((u) => u.id === sug.level).label;
  if (!state.urgencyTouched) state.urgency = sug.level;
  for (const r of document.querySelectorAll('input[name="urgency"]'))
    r.checked = r.value === state.urgency;
  const why = sug.reasons.length ? ` based on: ${[...new Set(sug.reasons)].join(", ")}` : "";
  $("#urgency-suggest").textContent = notes.value.trim()
    ? `Suggested: ${label}${why}. This is only a suggestion; your clinical judgement decides.`
    : "";
  $("#urgency-emergency").hidden = state.urgency !== "emergency";
}

function renderChecklist() {
  const m = model();
  const items = completeness(m, notes.value, question.value);
  const box = $("#checklist");
  box.replaceChildren(
    h("h3", {}, "Referral completeness (what a receiving clinic usually looks for)"),
  );
  for (const i of items) box.append(h("span", { class: i.ok ? "ok" : "miss" }, i.label));
}

function syncMode() {
  state.mode = mode();
  $("#opts-patient").hidden = state.mode !== "patient";
  $("#opts-referral").hidden = state.mode !== "referral";
  if (state.mode === "referral") {
    renderUrgency();
    renderChecklist();
  }
}

/* ---------- generation ---------- */

function problems() {
  return allFields.filter((f) => f.recheck().length > 0);
}

function buildDoc() {
  const opts = readOptions();
  const m = model();
  return state.mode === "patient" ? buildPatientReport(m, opts) : buildReferral(m, opts);
}

function renderOutput(scroll) {
  const doc = buildDoc();
  const out = $("#output");
  out.innerHTML = docToHtml(doc);
  out.lang = doc.lang;
  state.generated = true;
  state.outputDirty = false;
  $("#stale").hidden = true;
  $("#out-warn").hidden = true;
  $("#output-card").hidden = false;
  $("#toast").textContent = "";
  if (scroll) $("#output-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function generate() {
  const err = $("#gen-error");
  if (!notes.value.trim()) {
    err.textContent = "Paste the clinical data in step 1 first.";
    err.hidden = false;
    notes.ta.focus();
    return;
  }
  const bad = problems();
  if (bad.length) {
    err.textContent =
      "Personal information is still present. Remove it (or mark it as not personal) before generating.";
    err.hidden = false;
    bad[0].ta.scrollIntoView({ behavior: "smooth", block: "center" });
    bad[0].ta.focus();
    return;
  }
  err.hidden = true;
  renderOutput(true);
}

function onOptionsChanged() {
  if (state.mode === "referral") {
    renderUrgency();
    renderChecklist();
  }
  maintainOutput();
}

function onNotesChanged() {
  renderUnderstood();
  if (state.mode === "referral") {
    renderUrgency();
    renderChecklist();
  }
  $("#gen-error").hidden = true;
  maintainOutput();
}

const maintainOutput = debounce(() => {
  if (!state.generated) return;
  if (problems().length) {
    $("#output-card").hidden = true;
    state.generated = false;
    return;
  }
  if (state.outputDirty) {
    $("#stale").hidden = false;
    return;
  }
  renderOutput(false);
}, 150);

/* ---------- output actions ---------- */

function domToText(root) {
  const out = [];
  const walk = (node) => {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) {
        if (c.textContent.trim()) out.push(c.textContent.trim());
        continue;
      }
      if (c.nodeType !== 1) continue;
      const tag = c.tagName;
      if (tag === "BR") out.push("");
      else if (tag === "DL") {
        const kids = [...c.children];
        for (let i = 0; i < kids.length; i += 2)
          out.push(`${kids[i].textContent}: ${kids[i + 1]?.textContent ?? ""}`);
        out.push("");
      } else if (tag === "UL") {
        c.querySelectorAll(":scope > li").forEach((li) => out.push(`- ${li.textContent}`));
        out.push("");
      } else if (tag === "H1" || tag === "H2") {
        out.push("", c.textContent, "");
      } else if (c.classList.contains("doc-item")) {
        out.push(`* ${c.querySelector("strong")?.textContent ?? ""}`);
        c.querySelectorAll("p").forEach((p) => out.push(`  ${p.textContent}`));
        out.push("");
      } else if (c.children.length && tag !== "P" && tag !== "PRE") {
        walk(c);
        out.push("");
      } else {
        out.push(c.textContent, "");
      }
    }
  };
  walk(root);
  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

function outputText() {
  return domToText($("#output"));
}

function toast(msg) {
  $("#toast").textContent = msg;
}

function checkOutputForPii() {
  const withoutPlaceholders = outputText().replace(/\[[^\]]*\]/g, (m) => " ".repeat(m.length));
  const found = screen(withoutPlaceholders);
  const warn = $("#out-warn");
  if (found.length) {
    warn.textContent = `The text now contains ${found.length} possible identifier${found.length === 1 ? "" : "s"} (for example "${found[0].text.trim()}"). Please review before sharing.`;
    warn.hidden = false;
  } else {
    warn.hidden = true;
  }
  return found.length;
}

async function copyText() {
  const text = outputText();
  const warned = checkOutputForPii();
  try {
    await navigator.clipboard.writeText(text);
    toast(warned ? "Copied, but please review the warning above." : "Copied to clipboard.");
  } catch {
    const range = document.createRange();
    range.selectNodeContents($("#output"));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const ok = document.execCommand?.("copy");
    sel.removeAllRanges();
    toast(
      ok
        ? "Copied to clipboard."
        : "Copy was blocked by the browser. Select the text and copy manually.",
    );
  }
}

function download() {
  checkOutputForPii();
  const blob = new Blob([outputText()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const name = state.mode === "patient" ? "patient-report.txt" : "referral-letter.txt";
  const a = h("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Saved ${name}`);
}

function printDoc() {
  checkOutputForPii();
  window.print();
}

/* ---------- wiring ---------- */

function init() {
  for (const c of CLUSTERS) $("#opt-cluster").append(h("option", { value: c }, c));
  for (const r of REQUESTS) $("#opt-request").append(h("option", { value: r.id }, r.label));
  for (const u of URGENCIES) {
    $("#urgency-seg").append(
      h(
        "label",
        {},
        h("input", {
          type: "radio",
          name: "urgency",
          value: u.id,
          checked: u.id === state.urgency,
          onchange: () => {
            state.urgency = u.id;
            state.urgencyTouched = true;
            onOptionsChanged();
          },
        }),
        h("span", {}, u.label),
      ),
    );
  }

  document.querySelectorAll('input[name="mode"]').forEach((r) =>
    r.addEventListener("change", () => {
      syncMode();
      if (state.generated) maintainOutput();
    }),
  );
  document
    .querySelectorAll(
      'input[name="lang"], #opt-explain, #opt-warn, #opt-notes, #opt-informed, #opt-cluster, #opt-request',
    )
    .forEach((el) => el.addEventListener("change", onOptionsChanged));
  $("#opt-tone").addEventListener("input", () => {
    renderTone();
    onOptionsChanged();
  });

  $("#generate").addEventListener("click", generate);
  $("#copy").addEventListener("click", copyText);
  $("#download").addEventListener("click", download);
  $("#print").addEventListener("click", printDoc);
  $("#regen").addEventListener("click", () => renderOutput(false));
  $("#output").addEventListener("input", () => {
    state.outputDirty = true;
  });

  const resetEdits = () => {
    state.edits = { va: {}, iop: {}, dxEye: {}, dxStatus: {}, dxRemoved: new Set() };
    state.urgencyTouched = false;
    state.extractedFor = null;
  };
  $("#ex-clean").addEventListener("click", () => {
    resetEdits();
    notes.value = EXAMPLE_CLEAN;
  });
  $("#ex-pii").addEventListener("click", () => {
    resetEdits();
    notes.value = EXAMPLE_PII;
  });
  $("#clear-all").addEventListener("click", () => {
    resetEdits();
    for (const f of allFields) f.value = "";
    $("#output").replaceChildren();
    $("#output-card").hidden = true;
    state.generated = false;
    $("#gen-error").hidden = true;
  });

  renderTone();
  syncMode();
  renderUnderstood();
}

init();
