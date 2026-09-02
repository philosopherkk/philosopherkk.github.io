(() => {
  const VERSION = "2.0.0";
  const UPDATED = "2026-09-02";
  const VAULT_KEY = "outflow.v3.vault";
  const ITER = 210000;
  const IDLE_MS = 120000;
  const CODES = ["HKD", "USD", "EUR", "JPY", "TWD"];
  const IN_CATS = ["Salary", "Bonus", "Allowance", "Refund", "Interest", "Other"];
  const OUT_CATS = ["Rent", "Food", "Transport", "Utilities", "Phone", "Medical", "Shopping", "Other"];
  const $ = (id) => document.getElementById(id);
  const te = new TextEncoder();
  const td = new TextDecoder();
  const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
  const monthOf = (d) => String(d || "").slice(0, 7);
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const toast = (msg) => {
    const el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 2200);
  };
  let key = null, idle = null, undo = null, db = emptyDb(), range = "this", customFrom = "", customTo = "", filterType = "all", q = "", editing = null;
  function emptyDb() {
    return { version: VERSION, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), currency: "HKD", categories: { income: IN_CATS.slice(), outflow: OUT_CATS.slice() }, entries: [] };
  }
  function b64(buf) { const bytes = new Uint8Array(buf); let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
  function unb64(s) { const raw = atob(s); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out; }
  async function derive(pass, salt) {
    const base = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function seal(pass, obj) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const k = await derive(pass, salt);
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, te.encode(JSON.stringify(obj)));
    return { v: 3, kind: "outflow-vault", iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  }
  async function openSeal(pass, blob) {
    const k = await derive(pass, unb64(blob.salt));
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, k, unb64(blob.ct));
    return JSON.parse(td.decode(pt));
  }
  function loadBlob() { try { return JSON.parse(localStorage.getItem(VAULT_KEY) || "null"); } catch (e) { return null; } }
  async function persist() {
    if (!key) return;
    db.updatedAt = new Date().toISOString();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const blob = loadBlob() || {};
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(JSON.stringify(db)));
    localStorage.setItem(VAULT_KEY, JSON.stringify({ v: 3, kind: "outflow-vault", iter: ITER, salt: blob.salt, iv: b64(iv), ct: b64(ct) }));
  }
  function money(n) {
    const code = db.currency || "HKD";
    const d = code === "JPY" ? 0 : 1;
    return code + " " + Number(n || 0).toLocaleString("en-HK", { maximumFractionDigits: d });
  }
  function inRange(e) {
    const d = e.date || "";
    if (range === "this") return monthOf(d) === monthOf(today());
    if (range === "last") { const dt = new Date(today() + "T00:00:00"); dt.setDate(0); return monthOf(d) === monthOf(dt.toISOString()); }
    if (customFrom && d < customFrom) return false;
    if (customTo && d > customTo) return false;
    return true;
  }
  function netOf(list) { return list.reduce((a, e) => a + (e.type === "income" ? Number(e.amount) : -Number(e.amount)), 0); }
  function cats(type) { return (db.categories && db.categories[type]) || (type === "income" ? IN_CATS : OUT_CATS); }
  function resetIdle() { clearTimeout(idle); idle = setTimeout(lockNow, IDLE_MS); }
  function lockNow() { key = null; document.body.classList.remove("open"); $("unlockPass").value = ""; $("gateErr").textContent = ""; showGate(); }
  function showGate() {
    const has = !!loadBlob();
    $("setupBox").classList.toggle("hidden", has);
    $("unlockBox").classList.toggle("hidden", !has);
    $("verLine").textContent = "Outflow " + VERSION + " · " + UPDATED;
  }
  async function createVault() {
    const a = $("pass1").value, b = $("pass2").value;
    $("gateErr").textContent = "";
    if (!a || a.length < 4) { $("gateErr").textContent = "Use at least 4 characters."; return; }
    if (a !== b) { $("gateErr").textContent = "Passphrases do not match."; return; }
    db = emptyDb();
    const blob = await seal(a, db);
    localStorage.setItem(VAULT_KEY, JSON.stringify(blob));
    key = await derive(a, unb64(blob.salt));
    $("pass1").value = $("pass2").value = "";
    openApp(true);
  }
  async function unlockVault() {
    const pass = $("unlockPass").value;
    $("gateErr").textContent = "";
    const blob = loadBlob();
    if (!blob) return;
    try {
      const opened = await openSeal(pass, blob);
      db = Object.assign(emptyDb(), opened);
      if (!Array.isArray(db.entries)) db.entries = [];
      key = await derive(pass, unb64(blob.salt));
      $("unlockPass").value = "";
      openApp(false);
    } catch (err) { $("gateErr").textContent = "Wrong passphrase."; }
  }
  function openApp(first) {
    document.body.classList.add("open");
    resetIdle();
    ["pointerdown", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }));
    if (first) $("firstHint").classList.remove("hidden");
    showPage("home");
    render();
  }
  function fillCatSelect(sel, type, value) {
    const list = cats(type);
    sel.innerHTML = list.map((c) => `<option${c === value ? " selected" : ""}>${c}</option>`).join("");
  }
  function visibleEntries() {
    const needle = q.trim().toLowerCase();
    return db.entries.filter((e) => {
      if (!inRange(e)) return false;
      if (filterType !== "all" && e.type !== filterType) return false;
      if (needle && !`${e.category} ${e.note || ""} ${e.amount}`.toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }
  function upcoming() {
    const t = today();
    return db.entries.filter((e) => e.recurring && e.recurring.nextDue && e.recurring.nextDue >= t)
      .sort((a, b) => a.recurring.nextDue.localeCompare(b.recurring.nextDue)).slice(0, 6);
  }
  function render() {
    $("verFoot").textContent = "Outflow " + VERSION + " · updated " + UPDATED;
    $("cur").value = CODES.includes(db.currency) ? db.currency : "HKD";
    const scoped = db.entries.filter(inRange);
    const net = netOf(scoped);
    $("net").textContent = money(net);
    $("net").className = "n " + (net >= 0 ? "ok" : "bad");
    const inc = scoped.filter((e) => e.type === "income").reduce((a, e) => a + Number(e.amount), 0);
    const out = scoped.filter((e) => e.type === "outflow").reduce((a, e) => a + Number(e.amount), 0);
    $("sumIn").textContent = money(inc);
    $("sumOut").textContent = money(out);
    $("rangeLabel").textContent = range === "this" ? "This month" : range === "last" ? "Last month" : "Custom range";
    const rows = visibleEntries();
    if (!db.entries.length) $("list").innerHTML = `<p class="hint">No rows yet. Add first income, then first outflow.</p>`;
    else if (!rows.length) $("list").innerHTML = `<p class="hint">Nothing in this filter.</p>`;
    else $("list").innerHTML = rows.map((e) => {
      const sign = e.type === "income" ? "+" : "\u2212";
      const rec = e.recurring ? ` · due ${e.recurring.nextDue || ""}` : "";
      return `<div class="tx"><div><b>${e.category}</b><div class="hint">${e.date}${rec}${e.note ? " · " + e.note : ""}</div></div><div><span class="${e.type === "income" ? "ok" : "bad"}">${sign}${money(e.amount)}</span> <button class="ghost" data-ed="${e.id}">Edit</button> <button class="ghost" data-del="${e.id}">Delete</button></div></div>`;
    }).join("");
    $("list").querySelectorAll("[data-ed]").forEach((b) => b.onclick = () => openEdit(b.dataset.ed));
    $("list").querySelectorAll("[data-del]").forEach((b) => b.onclick = () => removeRow(b.dataset.del));
    $("dueBox").innerHTML = upcoming().map((e) => `<div class="hint">${e.category} · ${e.recurring.nextDue} · ${money(e.amount)}</div>`).join("") || `<div class="hint">No recurring due dates.</div>`;
    $("catEdit").value = cats("outflow").join("\n");
    $("catEditIn").value = cats("income").join("\n");
    document.querySelectorAll("[data-range]").forEach((c) => c.classList.toggle("on", c.dataset.range === range));
  }
  function openSheet(show) { $("sheet").classList.toggle("hidden", !show); }
  function openAdd(type) {
    editing = null;
    $("sheetTitle").textContent = "Add";
    $("fType").value = type || "outflow";
    $("fAmt").value = ""; $("fDate").value = today(); $("fNote").value = ""; $("fRec").value = "none"; $("fDue").value = today();
    fillCatSelect($("fCat"), $("fType").value);
    openSheet(true);
  }
  function openEdit(id) {
    const e = db.entries.find((x) => x.id === id); if (!e) return;
    editing = id;
    $("sheetTitle").textContent = "Edit";
    $("fType").value = e.type; $("fAmt").value = e.amount; $("fDate").value = e.date; $("fNote").value = e.note || "";
    $("fRec").value = (e.recurring && e.recurring.interval) || "none";
    $("fDue").value = (e.recurring && e.recurring.nextDue) || e.date;
    fillCatSelect($("fCat"), e.type, e.category);
    openSheet(true);
  }
  function snapshot() { undo = JSON.parse(JSON.stringify(db.entries)); }
  function saveRow() {
    const amount = Number($("fAmt").value);
    if (!amount || amount < 0 || Number.isNaN(amount)) { toast("Enter a valid amount"); return; }
    const type = $("fType").value === "income" ? "income" : "outflow";
    const rec = $("fRec").value;
    const row = { id: editing || uid(), type, amount, currency: db.currency || "HKD", date: $("fDate").value || today(), category: $("fCat").value || "Other", note: $("fNote").value.trim() };
    if (rec === "month" || rec === "week") row.recurring = { interval: rec, nextDue: $("fDue").value || row.date };
    snapshot();
    if (editing) db.entries = db.entries.map((e) => e.id === editing ? row : e);
    else db.entries.push(row);
    persist(); openSheet(false); $("firstHint").classList.add("hidden"); render();
  }
  function removeRow(id) {
    if (!confirm("Delete this row?")) return;
    snapshot(); db.entries = db.entries.filter((e) => e.id !== id); persist(); render(); toast("Deleted · Undo in Settings");
  }
  function undoLast() {
    if (!undo) { toast("Nothing to undo"); return; }
    db.entries = undo; undo = null; persist(); render(); toast("Undone");
  }
  function showPage(name) {
    ["home", "due", "set"].forEach((p) => {
      $(p).classList.toggle("hidden", p !== name);
      document.querySelector(`.dock [data-p="${p}"]`).classList.toggle("on", p === name);
    });
  }
  async function exportVault() {
    const blob = loadBlob(); if (!blob) return;
    const file = Object.assign({}, blob, { kind: "outflow-backup", exportedAt: new Date().toISOString(), app: VERSION });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
    a.download = "outflow-backup-" + today() + ".json"; a.click(); URL.revokeObjectURL(a.href);
  }
  async function importVault(file) {
    const text = await file.text(); let blob;
    try { blob = JSON.parse(text); } catch (e) { toast("Not a backup file"); return; }
    if (!blob || !blob.ct || !blob.salt || !blob.iv) { toast("Not an encrypted backup"); return; }
    const pass = prompt("Passphrase for this backup"); if (!pass) return;
    try {
      const opened = await openSeal(pass, blob);
      if (!opened || !Array.isArray(opened.entries)) throw new Error("bad");
      db = Object.assign(emptyDb(), opened);
      const fresh = await seal(pass, db);
      localStorage.setItem(VAULT_KEY, JSON.stringify(fresh));
      key = await derive(pass, unb64(fresh.salt));
      render(); toast("Backup imported");
    } catch (err) { toast("Could not open backup"); }
  }
  $("createBtn").onclick = createVault;
  $("unlockBtn").onclick = unlockVault;
  $("unlockPass").addEventListener("keydown", (e) => { if (e.key === "Enter") unlockVault(); });
  $("lockBtn").onclick = lockNow;
  $("addBtn").onclick = () => openAdd("outflow");
  $("addIn").onclick = () => openAdd("income");
  $("addOut").onclick = () => openAdd("outflow");
  $("saveRow").onclick = saveRow;
  $("closeSheet").onclick = () => openSheet(false);
  $("fType").onchange = () => fillCatSelect($("fCat"), $("fType").value);
  document.querySelectorAll("[data-range]").forEach((c) => c.onclick = () => { range = c.dataset.range; $("customDates").classList.toggle("hidden", range !== "custom"); render(); });
  $("from").onchange = () => { customFrom = $("from").value; render(); };
  $("to").onchange = () => { customTo = $("to").value; render(); };
  $("q").oninput = () => { q = $("q").value; render(); };
  $("fTypeFilter").onchange = () => { filterType = $("fTypeFilter").value; render(); };
  $("cur").onchange = () => { db.currency = $("cur").value; persist(); render(); };
  $("saveCats").onclick = () => {
    db.categories.outflow = $("catEdit").value.split("\n").map((s) => s.trim()).filter(Boolean);
    db.categories.income = $("catEditIn").value.split("\n").map((s) => s.trim()).filter(Boolean);
    persist(); toast("Categories saved");
  };
  $("exportBtn").onclick = exportVault;
  $("importBtn").onclick = () => $("importFile").click();
  $("importFile").onchange = (e) => { const f = e.target.files[0]; if (f) importVault(f); e.target.value = ""; };
  $("undoBtn").onclick = undoLast;
  $("wipeBtn").onclick = () => {
    if (!confirm("Erase the vault on this device?")) return;
    localStorage.removeItem(VAULT_KEY); key = null; db = emptyDb(); document.body.classList.remove("open"); showGate();
  };
  document.querySelectorAll(".dock button").forEach((b) => b.onclick = () => showPage(b.dataset.p));
  $("hideBanner").onclick = () => $("iosBanner").classList.add("hidden");
  $("verLine").textContent = "Outflow " + VERSION + " · " + UPDATED;
  showGate();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();
