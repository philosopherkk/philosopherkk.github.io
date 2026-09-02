(async () => {
  const bases = [
    "./",
    "https://raw.githubusercontent.com/philosopherkk/hk-transit/main/"
  ];
  const names = ["c1.js", "c2.js", "c3.js", "c4.js", "c5.js"];
  let parts = null;
  let lastErr = null;
  for (const base of bases) {
    try {
      parts = await Promise.all(names.map((f) => fetch(base + f).then((r) => {
        if (!r.ok) throw new Error("Missing " + f + " (" + r.status + ")");
        return r.text();
      })));
      if (parts.some((t) => t.trimStart().startsWith("<!"))) throw new Error("Got HTML instead of JS");
      break;
    } catch (err) {
      lastErr = err;
      parts = null;
    }
  }
  if (!parts) throw lastErr || new Error("Could not load transit scripts");
  const script = document.createElement("script");
  script.textContent = parts.join("\n");
  document.body.appendChild(script);
})().catch((err) => {
  const el = document.getElementById("status");
  if (el) el.textContent = "Failed to load app: " + err.message;
});
