import { escapeHtml } from "./text.js";

/** Plain-text rendering used for copy / download. */
export function docToText(doc) {
  const out = [];
  if (doc.title) out.push(doc.title);
  if (doc.subtitle) out.push(doc.subtitle);
  if (doc.title || doc.subtitle) out.push("");
  for (const b of doc.blocks) {
    switch (b.t) {
      case "h":
        out.push("", b.text, "-".repeat(Math.min(40, Math.max(8, [...b.text].length * 2))));
        break;
      case "p":
      case "note":
      case "alert":
        out.push(b.text, "");
        break;
      case "ul":
        b.items.forEach((i) => out.push(`- ${i}`));
        out.push("");
        break;
      case "kv":
        b.rows.forEach(([k, v]) => out.push(`${k}: ${v}`));
        out.push("");
        break;
      case "item":
        out.push(`* ${b.title}`);
        if (b.text) out.push(`  ${b.text}`);
        out.push("");
        break;
      case "pre":
        out.push(b.text, "");
        break;
      case "sig":
        out.push("", b.text);
        break;
    }
  }
  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

/** HTML rendering for the editable preview and print. */
export function docToHtml(doc) {
  const parts = [];
  if (doc.title) parts.push(`<h1 class="doc-title">${escapeHtml(doc.title)}</h1>`);
  if (doc.subtitle) parts.push(`<p class="doc-subtitle">${escapeHtml(doc.subtitle)}</p>`);
  for (const b of doc.blocks) {
    switch (b.t) {
      case "h":
        parts.push(`<h2>${escapeHtml(b.text)}</h2>`);
        break;
      case "p":
        parts.push(`<p>${escapeHtml(b.text)}</p>`);
        break;
      case "note":
        parts.push(`<p class="doc-note">${escapeHtml(b.text)}</p>`);
        break;
      case "alert":
        parts.push(`<p class="doc-alert">${escapeHtml(b.text)}</p>`);
        break;
      case "ul":
        parts.push(`<ul>${b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`);
        break;
      case "kv":
        parts.push(
          `<dl class="doc-kv">${b.rows
            .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`)
            .join("")}</dl>`,
        );
        break;
      case "item":
        parts.push(
          `<div class="doc-item"><strong>${escapeHtml(b.title)}</strong>${
            b.text ? `<p>${escapeHtml(b.text)}</p>` : ""
          }</div>`,
        );
        break;
      case "pre":
        parts.push(`<pre class="doc-pre">${escapeHtml(b.text)}</pre>`);
        break;
      case "sig":
        parts.push(`<p class="doc-sig">${escapeHtml(b.text)}</p>`);
        break;
    }
  }
  return parts.join("\n");
}
