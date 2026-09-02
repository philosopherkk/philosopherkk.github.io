(() => {
  const VERSION = "2.1.0";
  const UPDATED = "2026-09-02";
  const VAULT_KEY = "outflow.v3.vault";
  const ITER = 210000;
  const IDLE_MS = 120000;
  const CODES = ["HKD", "USD", "EUR", "JPY", "TWD"];
  const IN_CATS = ["Salary", "Bonus", "Allowance", "Refund", "Interest", "Other"];
  const OUT_CATS = ["Rent", "Food", "Transport", "Utilities", "Phone", "Medical", "Shopping", "Other"];
  const CADENCES = ["monthly", "yearly", "unknown"];
  const STATUSES = ["active", "refunded", "unknown"];
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
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let key = null, idle = null, undo = null, db = emptyDb(), range = "this", customFrom = "", customTo = "", filterType = "all", q = "", editing = null, subFilter = "all";
  function emptyDb() {
    return {
      version: VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currency: "HKD",
      categories: { income: IN_CATS.slice(), outflow: OUT_CATS.slice() },
      entries: [],
      subscriptions: [],
      subscriptionsImportedAt: null
    };
  }
  function normalizeDb(opened) {
    const next = Object.assign(emptyDb(), opened || {});
    if (!Array.isArray(next.entries)) next.entries = [];
    if (!Array.isArray(next.subscriptions)) next.subscriptions = [];
    if (!next.categories || typeof next.categories !== "object") next.categories = { income: IN_CATS.slice(), outflow: OUT_CATS.slice() };
    return next;
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
  function formatSubAmount(item) {
    if (item.amount === null || item.amount === undefined || item.amount === "") {
      return { text: "Amount unknown", missing: true };
    }
    const n = Number(item.amount);
    if (Number.isNaN(n)) return { text: "Amount unknown", missing: true };
    const code = String(item.currency || "").trim() || "—";
    const digits = code === "JPY" ? 0 : 2;
    return {
      text: code + " " + n.toLocaleString("en-HK", { minimumFractionDigits: 0, maximumFractionDigits: digits }),
      missing: false
    };
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
      db = normalizeDb(opened);
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
  function normalizeCadence(v) {
    const s = String(v || "").trim().toLowerCase();
    return CADENCES.includes(s) ? s : "unknown";
  }
  function normalizeStatus(v) {
    const s = String(v || "").trim().toLowerCase();
    return STATUSES.includes(s) ? s : "unknown";
  }
  function normalizeDateHkt(v) {
    if (v === null || v === undefined || v === "") return null;
    const s = String(v).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return s;
  }
  function normalizeAmount(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function normalizeSubscription(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const merchant = String(raw.merchant || "").trim();
    if (!merchant) return null;
    return {
      id: uid(),
      merchant,
      amount: normalizeAmount(raw.amount),
      currency: String(raw.currency || "").trim() || "",
      cadence: normalizeCadence(raw.cadence),
      last_charge_date_hkt: normalizeDateHkt(raw.last_charge_date_hkt),
      status: normalizeStatus(raw.status),
      source_from: String(raw.source_from || "").trim(),
      source_subject: String(raw.source_subject || "").trim(),
      source_message_id: String(raw.source_message_id || "").trim(),
      notes: String(raw.notes || "").trim()
    };
  }
  function parseSubscriptionPayload(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) {
      throw new Error("Not valid JSON.");
    }
    if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.subscriptions)) {
      data = data.subscriptions;
    }
    if (!Array.isArray(data)) throw new Error("Expected a JSON array of subscription objects.");
    const rows = [];
    const errors = [];
    data.forEach((item, i) => {
      const row = normalizeSubscription(item);
      if (!row) errors.push("Row " + (i + 1) + " needs a merchant.");
      else rows.push(row);
    });
    if (!rows.length) throw new Error(errors[0] || "No subscription rows found.");
    return { rows, skipped: errors.length };
  }
  function amountKnown(item) {
    return item.amount !== null && item.amount !== undefined && !Number.isNaN(Number(item.amount));
  }
  function filteredSubscriptions() {
    return (db.subscriptions || []).filter((s) => {
      if (subFilter === "known") return amountKnown(s);
      if (subFilter === "unknown") return !amountKnown(s);
      if (subFilter === "active") return s.status === "active";
      if (subFilter === "refunded") return s.status === "refunded";
      return true;
    });
  }
  function sortSubs(list) {
    return list.slice().sort((a, b) => {
      const ak = amountKnown(a) ? 0 : 1;
      const bk = amountKnown(b) ? 0 : 1;
      if (ak !== bk) return ak - bk;
      const ad = a.last_charge_date_hkt || "";
      const bd = b.last_charge_date_hkt || "";
      if (ad !== bd) return bd.localeCompare(ad);
      return String(a.merchant).localeCompare(String(b.merchant));
    });
  }
  function statusPill(status) {
    if (status === "active") return `<span class="pill ok">active</span>`;
    if (status === "refunded") return `<span class="pill bad">refunded</span>`;
    return `<span class="pill">unknown</span>`;
  }
  function renderSubRow(s) {
    const amt = formatSubAmount(s);
    const date = s.last_charge_date_hkt || "no charge date";
    const noteBits = [];
    if (s.notes) noteBits.push(s.notes);
    if (s.source_subject) noteBits.push(s.source_subject);
    const extra = noteBits.length ? `<div class="hint">${esc(noteBits.join(" · "))}</div>` : "";
    return `<div class="tx">
      <div>
        <b>${esc(s.merchant)}</b>
        <div class="hint">${esc(date)}${s.source_from ? " · " + esc(s.source_from) : ""}</div>
        <div class="meta">
          <span class="pill">${esc(s.cadence)}</span>
          ${statusPill(s.status)}
          ${amt.missing ? `<span class="pill warn">amount unknown</span>` : ""}
        </div>
        ${extra}
      </div>
      <div class="${amt.missing ? "amt-missing" : "bad"}">${esc(amt.text)}</div>
    </div>`;
  }
  function renderSubscriptions() {
    const all = db.subscriptions || [];
    const known = all.filter(amountKnown).length;
    const unknown = all.length - known;
    const refunded = all.filter((s) => s.status === "refunded").length;
    $("subCount").textContent = String(all.length);
    if (!all.length) {
      $("subSummaryHint").textContent = "No subscriptions yet. Paste or drop Ledger JSON.";
    } else {
      const when = db.subscriptionsImportedAt ? " · imported " + String(db.subscriptionsImportedAt).slice(0, 10) : "";
      $("subSummaryHint").textContent = known + " with amount · " + unknown + " amount unknown · " + refunded + " refunded" + when;
    }
    $("subImportMeta").textContent = all.length
      ? all.length + " bill" + (all.length === 1 ? "" : "s") + " in vault (on-device only)."
      : "";
    document.querySelectorAll("[data-sub-filter]").forEach((c) => c.classList.toggle("on", c.dataset.subFilter === subFilter));
    const rows = sortSubs(filteredSubscriptions());
    if (!all.length) {
      $("subList").innerHTML = `<p class="hint">Importer accepts a JSON array with merchant, amount, currency, cadence, last_charge_date_hkt, status, and source fields. Amounts are never invented — null stays “Amount unknown”.</p>`;
      return;
    }
    if (!rows.length) {
      $("subList").innerHTML = `<p class="hint">Nothing in this filter.</p>`;
      return;
    }
    const knownRows = rows.filter(amountKnown);
    const unknownRows = rows.filter((s) => !amountKnown(s));
    let html = "";
    if (knownRows.length && (subFilter === "all" || subFilter === "known" || subFilter === "active" || subFilter === "refunded")) {
      if (subFilter === "all") html += `<div class="sub-group">Known amounts</div>`;
      html += knownRows.map(renderSubRow).join("");
    }
    if (unknownRows.length && (subFilter === "all" || subFilter === "unknown" || subFilter === "active" || subFilter === "refunded")) {
      if (subFilter === "all") html += `<div class="sub-group">Amount unknown / reminder only</div>`;
      html += unknownRows.map(renderSubRow).join("");
    }
    $("subList").innerHTML = html || `<p class="hint">Nothing in this filter.</p>`;
  }
  async function importSubscriptionsText(text) {
    $("subImportErr").textContent = "";
    let parsed;
    try { parsed = parseSubscriptionPayload(text); }
    catch (err) { $("subImportErr").textContent = err.message || "Import failed"; return; }
    if ((db.subscriptions || []).length && !confirm("Replace the " + db.subscriptions.length + " imported bill(s) on this device?")) return;
    db.subscriptions = parsed.rows;
    db.subscriptionsImportedAt = new Date().toISOString();
    await persist();
    $("subPaste").value = "";
    render();
    const skip = parsed.skipped ? " · skipped " + parsed.skipped : "";
    toast("Imported " + parsed.rows.length + " bill" + (parsed.rows.length === 1 ? "" : "s") + skip);
  }
  async function clearSubscriptions() {
    if (!(db.subscriptions || []).length) { toast("No bills to clear"); return; }
    if (!confirm("Clear imported bills from this device vault?")) return;
    db.subscriptions = [];
    db.subscriptionsImportedAt = null;
    await persist();
    render();
    toast("Bills cleared");
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
      return `<div class="tx"><div><b>${esc(e.category)}</b><div class="hint">${esc(e.date)}${esc(rec)}${e.note ? " · " + esc(e.note) : ""}</div></div><div><span class="${e.type === "income" ? "ok" : "bad"}">${sign}${esc(money(e.amount))}</span> <button class="ghost" data-ed="${esc(e.id)}">Edit</button> <button class="ghost" data-del="${esc(e.id)}">Delete</button></div></div>`;
    }).join("");
    $("list").querySelectorAll("[data-ed]").forEach((b) => b.onclick = () => openEdit(b.dataset.ed));
    $("list").querySelectorAll("[data-del]").forEach((b) => b.onclick = () => removeRow(b.dataset.del));
    $("dueBox").innerHTML = upcoming().map((e) => `<div class="hint">${esc(e.category)} · ${esc(e.recurring.nextDue)} · ${esc(money(e.amount))}</div>`).join("") || `<div class="hint">No recurring due dates.</div>`;
    $("catEdit").value = cats("outflow").join("\n");
    $("catEditIn").value = cats("income").join("\n");
    document.querySelectorAll("[data-range]").forEach((c) => c.classList.toggle("on", c.dataset.range === range));
    renderSubscriptions();
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
    ["home", "bills", "due", "set"].forEach((p) => {
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
      db = normalizeDb(opened);
      const fresh = await seal(pass, db);
      localStorage.setItem(VAULT_KEY, JSON.stringify(fresh));
      key = await derive(pass, unb64(fresh.salt));
      render(); toast("Backup imported");
    } catch (err) { toast("Could not open backup"); }
  }
  function wireDropzone() {
    const zone = $("subDrop");
    const onDrag = (e) => { e.preventDefault(); e.stopPropagation(); zone.classList.add("drag"); };
    const offDrag = (e) => { e.preventDefault(); e.stopPropagation(); zone.classList.remove("drag"); };
    ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, onDrag));
    ["dragleave", "dragend"].forEach((ev) => zone.addEventListener(ev, offDrag));
    zone.addEventListener("drop", async (e) => {
      offDrag(e);
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      await importSubscriptionsText(await file.text());
    });
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
  $("subPasteBtn").onclick = () => importSubscriptionsText($("subPaste").value);
  $("subFileBtn").onclick = () => $("subFile").click();
  $("subFile").onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    await importSubscriptionsText(await f.text());
  };
  $("subClearBtn").onclick = clearSubscriptions;
  document.querySelectorAll("[data-sub-filter]").forEach((c) => {
    c.onclick = () => { subFilter = c.dataset.subFilter; renderSubscriptions(); };
  });
  wireDropzone();
  $("verLine").textContent = "Outflow " + VERSION + " · " + UPDATED;
  showGate();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
  }
})();
