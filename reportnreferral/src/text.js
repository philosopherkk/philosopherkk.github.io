/** Length-preserving fold of full-width ASCII so offsets match the original text. */
export function foldWidth(text) {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c >= 0xff01 && c <= 0xff5e) out += String.fromCharCode(c - 0xfee0);
    else if (c === 0x3000) out += " ";
    else out += ch;
  }
  return out;
}

export function escapeRx(s) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Regex source for a glossary word; Latin words get letter/digit boundaries. */
export function wordSource(word) {
  const body = word
    .split(/[\s-]+/)
    .map(escapeRx)
    .join("[\\s\\-]*");
  return /[A-Za-z]/.test(word) ? `(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])` : body;
}
