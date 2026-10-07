(() => {
  const APP_NAME = "Smart money 使錢靈";
  const VERSION = "2.1.12";
  const UPDATED = "2026-10-07";
  const HISTORY_URL = "https://github.com/philosopherkk/outflow-app/blob/main/CHANGELOG.md";
  const LEDGER_KEY = "outflow.v4.ledger";
  const OLD_VAULT_KEY = "outflow.v3.vault";
  const BIO_KEY = "outflow.v4.bio";
  const UI_KEY = "outflow.v4.ui";
  const FONT_SCALES = { small: 0.9, medium: 1, large: 1.15 };
  const FX_KEY = "outflow.fx.v1";
  const IDLE_MS = 120000;
  const FALLBACK_FX = {
    base: "HKD",
    date: UPDATED,
    updatedAt: UPDATED + "T00:00:00.000Z",
    nextUpdateAt: null,
    rates: { HKD: 1, USD: 0.1275, TWD: 4.04, CAD: 0.177, EUR: 0.11, JPY: 20.06 },
    hkdPer: { HKD: 1, USD: 7.84, TWD: 0.248, CAD: 5.65, EUR: 9.09, JPY: 0.0499 },
    source: "fallback",
  };
  const ITER = 210000;
  const CODES = ["HKD", "USD", "TWD", "CAD", "EUR", "JPY"];
  const IN_CATS = ["Salary", "Bonus", "Parttime", "Allowance", "Refund", "Interest", "Other"];
  const OUT_CATS = ["Rent", "Food", "Transport", "Utilities", "Phone", "Medical", "Shopping", "Parents", "Taobao", "Amazon", "PDD", "Other"];
  const $ = (id) => document.getElementById(id);
  const te = new TextEncoder();
  const td = new TextDecoder();
  const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
  const monthOf = (d) => String(d || "").slice(0, 7);
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = (msg, action) => {
    const el = $("toast");
    el.textContent = "";
    el.append(document.createTextNode(msg));
    if (action && action.label && typeof action.run === "function") {
      const b = document.createElement("button");
      b.type = "button"; b.className = "toast-act"; b.textContent = action.label;
      b.onclick = () => { el.classList.add("hidden"); action.run(); };
      el.append(" ", b);
    }
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), action ? 5000 : 2200);
  };
  function addInterval(date, interval) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
    if (!m) return date;
    const y = +m[1], mo = +m[2] - 1, d = +m[3];
    let dt;
    if (interval === "week") dt = new Date(Date.UTC(y, mo, d + 7));
    else {
      const last = new Date(Date.UTC(y, mo + 2, 0)).getUTCDate();
      dt = new Date(Date.UTC(y, mo + 1, Math.min(d, last)));
    }
    return dt.toISOString().slice(0, 10);
  }
  let undo = null, idle = null, idleBound = false, db = emptyDb(), range = "this", customFrom = "", customTo = "", filterType = "all", q = "", editing = null, fx = null, bioOk = false;
  function emptyDb() {
    return { version: VERSION, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), currency: "HKD", categories: { income: IN_CATS.slice(), outflow: OUT_CATS.slice() }, entries: [] };
  }
  function unb64(s) { const raw = atob(s); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out; }
  function b64(buf) { const bytes = new Uint8Array(buf); let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
  function bioLabel() {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/.test(ua)) return "Face ID";
    if (/Macintosh/.test(ua)) return "Touch ID";
    if (/Android/.test(ua)) return "device unlock";
    return "Face ID";
  }
  function loadBio() {
    try { return Object.assign({ enabled: false, skipped: false, credId: "", userId: "" }, JSON.parse(localStorage.getItem(BIO_KEY) || "{}")); }
    catch (e) { return { enabled: false, skipped: false, credId: "", userId: "" }; }
  }
  function saveBio(cfg) { localStorage.setItem(BIO_KEY, JSON.stringify(cfg)); }
  function loadUiPrefs() {
    try { return Object.assign({ theme: "auto", font: "medium" }, JSON.parse(localStorage.getItem(UI_KEY) || "{}")); }
    catch (e) { return { theme: "auto", font: "medium" }; }
  }
  function saveUiPrefs(prefs) { localStorage.setItem(UI_KEY, JSON.stringify(prefs)); }
  function themeColorFor(theme) {
    if (theme === "light") return "#f3efe6";
    if (theme === "dark") return "#0e1116";
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "#f3efe6" : "#0e1116";
  }
  function applyUiPrefs() {
    const prefs = loadUiPrefs();
    const theme = prefs.theme === "light" || prefs.theme === "dark" ? prefs.theme : "auto";
    const font = FONT_SCALES[prefs.font] ? prefs.font : "medium";
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.setProperty("--font-scale", String(FONT_SCALES[font]));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", themeColorFor(theme));
    document.querySelectorAll("#themeChips .chip").forEach((c) => { c.classList.toggle("on", c.dataset.theme === theme); c.setAttribute("aria-pressed", String(c.dataset.theme === theme)); });
    document.querySelectorAll("#fontChips .chip").forEach((c) => { c.classList.toggle("on", c.dataset.font === font); c.setAttribute("aria-pressed", String(c.dataset.font === font)); });
  }
  function setTheme(theme) {
    const prefs = loadUiPrefs();
    prefs.theme = theme === "light" || theme === "dark" ? theme : "auto";
    saveUiPrefs(prefs);
    applyUiPrefs();
  }
  function setFontSize(font) {
    const prefs = loadUiPrefs();
    prefs.font = FONT_SCALES[font] ? font : "medium";
    saveUiPrefs(prefs);
    applyUiPrefs();
  }
  applyUiPrefs();
  async function bioAvailable() {
    if (!window.PublicKeyCredential) return false;
    try {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
    } catch (e) {}
    return true;
  }
  function randomBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }
  async function createBio() {
    const userId = randomBytes(16);
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: APP_NAME },
        user: { id: userId, name: "outflow-local", displayName: APP_NAME },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    });
    if (!cred || !cred.rawId) throw new Error("no-credential");
    saveBio({ enabled: true, skipped: false, credId: b64(cred.rawId), userId: b64(userId) });
  }
  async function assertBio() {
    const cfg = loadBio();
    if (!cfg.credId) throw new Error("no-credential");
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ type: "public-key", id: unb64(cfg.credId), transports: ["internal"] }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    if (!cred) throw new Error("no-assertion");
  }
  function bioError(err) {
    const name = err && err.name;
    if (name === "NotAllowedError") return "Cancelled. Tap the button to try " + bioLabel() + " again.";
    if (name === "InvalidStateError") return bioLabel() + " is already set on this device. Try unlock.";
    if (name === "NotSupportedError") return "This browser cannot use " + bioLabel() + ".";
    return "Could not use " + bioLabel() + ".";
  }
  function showGate(mode) {
    document.body.classList.remove("open");
    $("gateErr").textContent = "";
    $("verLine").textContent = VERSION + " · " + UPDATED;
    stampAbout();
    const label = bioLabel();
    if (mode === "setup") {
      $("gateHint").textContent = "Turn on " + label + " so you never type a password. The ledger stays on this phone.";
      $("bioBtn").textContent = "Turn on " + label;
      $("skipBioBtn").classList.remove("hidden");
    } else {
      $("gateHint").textContent = "Unlock with " + label + ". No password.";
      $("bioBtn").textContent = "Unlock with " + label;
      $("skipBioBtn").classList.add("hidden");
    }
  }
  function renderBioUi() {
    const cfg = loadBio();
    const label = bioLabel();
    $("lockBtn").classList.toggle("hidden", !cfg.enabled);
    if (!bioOk) {
      $("bioNote").textContent = "This browser has no Face ID or device biometrics. The ledger opens without a lock.";
      $("bioToggle").classList.add("hidden");
      return;
    }
    $("bioToggle").classList.remove("hidden");
    if (cfg.enabled) {
      $("bioNote").textContent = label + " is on. No password. This device unlocks the ledger.";
      $("bioToggle").textContent = "Turn off " + label;
    } else {
      $("bioNote").textContent = "Use " + label + " so you do not need a password. Nothing is uploaded.";
      $("bioToggle").textContent = "Turn on " + label;
    }
  }
  function resetIdle() {
    clearTimeout(idle);
    if (!loadBio().enabled) return;
    idle = setTimeout(lockNow, IDLE_MS);
  }
  function lockNow() {
    if (!loadBio().enabled) return;
    openSheet(false);
    clearTimeout(idle);
    showGate("unlock");
  }
  async function derive(pass, salt) {
    const base = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function openSeal(pass, blob) {
    const k = await derive(pass, unb64(blob.salt));
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, k, unb64(blob.ct));
    return JSON.parse(td.decode(pt));
  }
  function loadLedger() {
    try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || "null"); } catch (e) { return null; }
  }
  function persist() {
    db.version = VERSION;
    db.currency = "HKD";
    db.updatedAt = new Date().toISOString();
    if (!Array.isArray(db.entries)) db.entries = [];
    localStorage.setItem(LEDGER_KEY, JSON.stringify(db));
  }
  function adopt(opened) {
    db = Object.assign(emptyDb(), opened || {});
    if (!Array.isArray(db.entries)) db.entries = [];
    db.currency = "HKD";
    persist();
  }
  function codeOf(e) { return CODES.includes(e && e.currency) ? e.currency : "HKD"; }
  function hkdPer(code) {
    if (code === "HKD") return 1;
    const table = (fx && fx.hkdPer) || {};
    const n = Number(table[code]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function toHkd(amount, code) {
    const n = Number(amount) || 0;
    const c = CODES.includes(code) ? code : "HKD";
    if (c === "HKD") return n;
    const per = hkdPer(c);
    return per ? n * per : n;
  }
  function moneyHkd(n) {
    return "HKD " + Number(n || 0).toLocaleString("en-HK", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
  }
  function moneyOrig(n, code) {
    const c = CODES.includes(code) ? code : "HKD";
    return c + " " + Number(n || 0).toLocaleString("en-HK", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
  }
  function formatStamp(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
    return new Intl.DateTimeFormat("en-HK", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d) + " HKT";
  }
  function rateLine(code) {
    const per = hkdPer(code);
    if (!per) return "1 " + code + " = — HKD";
    return "1 " + code + " = " + per.toLocaleString("en-HK", { maximumFractionDigits: 3 }) + " HKD";
  }
  function renderFx() {
    if (fx) {
      const rows = CODES.map((c) => `<tr><th>${c}</th><td>${c === "HKD" ? "base" : rateLine(c)}</td></tr>`).join("");
      $("fxDetail").innerHTML = `<p class="hint">Daily rates · ${formatStamp(fx.updatedAt)} · ${fx.source || "rates"}</p><table><thead><tr><th>Code</th><th>Into HKD</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else {
      $("fxDetail").textContent = "Rates load on this page.";
    }
    updateFxHint();
  }
  function updateFxHint() {
    const cur = $("fCur") ? $("fCur").value : "HKD";
    const amt = Number($("fAmt") && $("fAmt").value);
    if (!$("fxHint")) return;
    if (!fx) { $("fxHint").textContent = "Rates still loading. Amounts still save; HKD conversion fills in when rates arrive."; return; }
    if (!amt || Number.isNaN(amt)) { $("fxHint").textContent = cur === "HKD" ? "Base HKD. No conversion." : rateLine(cur) + " · updated " + formatStamp(fx.updatedAt); return; }
    if (cur === "HKD") { $("fxHint").textContent = "Base HKD. No conversion."; return; }
    $("fxHint").textContent = moneyOrig(amt, cur) + " → " + moneyHkd(toHkd(amt, cur)) + " · " + rateLine(cur) + " · updated " + formatStamp(fx.updatedAt);
  }
  function readCachedFx() {
    try { return JSON.parse(localStorage.getItem(FX_KEY) || "null"); } catch (e) { return null; }
  }
  function cacheFx(payload) {
    localStorage.setItem(FX_KEY, JSON.stringify({ day: today(), payload }));
  }
  function usable(payload) {
    if (!payload || payload.base !== "HKD" || !payload.hkdPer) return false;
    return CODES.every((c) => c === "HKD" || (Number(payload.hkdPer[c]) > 0));
  }
  async function pullRemoteFx() {
    const urls = ["/api/fx", "https://open.er-api.com/v6/latest/HKD"];
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (data && data.hkdPer && usable(data)) return data;
        if (data && data.rates) {
          const rates = data.rates;
          const hkdPer = { HKD: 1, USD: 1 / Number(rates.USD), TWD: 1 / Number(rates.TWD), CAD: 1 / Number(rates.CAD), EUR: 1 / Number(rates.EUR), JPY: 1 / Number(rates.JPY) };
          const payload = {
            base: "HKD",
            date: (data.time_last_update_utc || "").slice(0, 16) || today(),
            updatedAt: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString() : new Date().toISOString(),
            nextUpdateAt: data.time_next_update_utc ? new Date(data.time_next_update_utc).toISOString() : null,
            rates: { HKD: 1, USD: Number(rates.USD), TWD: Number(rates.TWD), CAD: Number(rates.CAD), EUR: Number(rates.EUR), JPY: Number(rates.JPY) },
            hkdPer,
            source: "open.er-api.com",
          };
          if (usable(payload)) return payload;
        }
      } catch (err) { lastErr = err; }
    }
    throw lastErr || new Error("fx");
  }
  async function loadFx(force) {
    const cached = readCachedFx();
    if (!force && cached && cached.day === today() && usable(cached.payload)) {
      fx = cached.payload;
      renderFx();
      return fx;
    }
    if (!fx) {
      fx = usable(cached && cached.payload) ? cached.payload : FALLBACK_FX;
      renderFx();
    }
    try {
      const payload = await pullRemoteFx();
      fx = payload;
      cacheFx(payload);
      renderFx();
      render();
      return fx;
    } catch (err) {
      if (cached && usable(cached.payload)) {
        fx = cached.payload;
        renderFx();
        toast("Using last saved rates");
        return fx;
      }
      fx = FALLBACK_FX;
      renderFx();
      toast("Live rates unavailable · using fallback HKD table");
      return fx;
    }
  }
  function inRange(e) {
    const d = e.date || "";
    if (range === "this") return monthOf(d) === monthOf(today());
    if (range === "last") { const dt = new Date(today() + "T00:00:00"); dt.setDate(0); return monthOf(d) === monthOf(dt.toISOString()); }
    if (customFrom && d < customFrom) return false;
    if (customTo && d > customTo) return false;
    return true;
  }
  function netOf(list) { return list.reduce((a, e) => a + (e.type === "income" ? toHkd(e.amount, codeOf(e)) : -toHkd(e.amount, codeOf(e))), 0); }
  function cats(type) { return (db.categories && db.categories[type]) || (type === "income" ? IN_CATS : OUT_CATS); }
  function loadLocalDb() {
    const stored = loadLedger();
    if (stored && Array.isArray(stored.entries)) adopt(stored);
    else {
      db = emptyDb();
      persist();
      $("firstHint").classList.remove("hidden");
    }
  }
  function revealApp() {
    document.body.classList.add("open");
    $("gateErr").textContent = "";
    loadLocalDb();
    showPage("home");
    render();
    resetIdle();
    if (!idleBound) {
      idleBound = true;
      ["pointerdown", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }));
    }
    loadFx(false).catch(() => {});
  }
  async function enableBio() {
    $("gateErr").textContent = "";
    try {
      await createBio();
      toast(bioLabel() + " is on");
      revealApp();
    } catch (err) { $("gateErr").textContent = bioError(err); }
  }
  async function unlockBio() {
    $("gateErr").textContent = "";
    try {
      await assertBio();
      revealApp();
    } catch (err) { $("gateErr").textContent = bioError(err); }
  }
  function skipBio() {
    const cfg = loadBio();
    saveBio({ enabled: false, skipped: true, credId: cfg.credId || "", userId: cfg.userId || "" });
    revealApp();
  }
  async function toggleBio() {
    const cfg = loadBio();
    if (cfg.enabled) {
      if (!confirm("Turn off " + bioLabel() + "? The ledger will open without a lock.")) return;
      saveBio({ enabled: false, skipped: true, credId: "", userId: "" });
      clearTimeout(idle);
      renderBioUi();
      toast(bioLabel() + " is off");
      return;
    }
    try {
      await createBio();
      renderBioUi();
      toast(bioLabel() + " is on");
    } catch (err) { toast(bioError(err)); }
  }
  async function boot() {
    $("verLine").textContent = VERSION + " · " + UPDATED;
    stampAbout();
    bioOk = await bioAvailable();
    const cfg = loadBio();
    if (cfg.enabled && cfg.credId) {
      showGate("unlock");
      return;
    }
    if (bioOk && !cfg.skipped) {
      showGate("setup");
      return;
    }
    revealApp();
  }
  function fillCatSelect(sel, type, value) {
    const list = cats(type);
    sel.innerHTML = list.map((c) => `<option value="${esc(c)}"${c === value ? " selected" : ""}>${esc(c)}</option>`).join("");
  }
  function visibleEntries() {
    const needle = q.trim().toLowerCase();
    return db.entries.filter((e) => {
      if (!inRange(e)) return false;
      if (filterType !== "all" && e.type !== filterType) return false;
      if (needle && !`${e.category} ${e.note || ""} ${e.amount} ${codeOf(e)}`.toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }
  function upcoming() {
    return db.entries.filter((e) => e.recurring && e.recurring.nextDue)
      .sort((a, b) => String(a.recurring.nextDue).localeCompare(String(b.recurring.nextDue)));
  }
  function rowAmount(e) {
    const code = codeOf(e);
    const hkd = moneyHkd(toHkd(e.amount, code));
    if (code === "HKD") return hkd;
    return moneyOrig(e.amount, code) + " · " + hkd;
  }
  function groupHomeEntries(rows) {
    const groups = [];
    const map = new Map();
    rows.forEach((e) => {
      const key = e.date || "";
      let g = map.get(key);
      if (!g) {
        g = { date: e.date, items: [] };
        map.set(key, g);
        groups.push(g);
      }
      g.items.push(e);
    });
    groups.forEach((g) => {
      g.items.sort((a, b) => {
        const da = toHkd(b.amount, codeOf(b)) - toHkd(a.amount, codeOf(a));
        if (da) return da;
        const ta = String(a.type).localeCompare(String(b.type));
        if (ta) return ta;
        const ca = String(a.category || "").localeCompare(String(b.category || ""));
        if (ca) return ca;
        return String(a.note || "").localeCompare(String(b.note || ""));
      });
    });
    return groups;
  }
  function listRowHtml(e, mode) {
    const sign = e.type === "income" ? "+" : "\u2212";
    const kind = e.type === "income" ? "Income" : "Outflow";
    const rec = e.recurring ? ` · due ${esc(e.recurring.nextDue || "")}` : "";
    const id = esc(e.id);
    const amt = `<span class="${e.type === "income" ? "ok" : "bad"}">${sign}${esc(rowAmount(e))}</span> <span class="edit-tag" aria-hidden="true">Edit</span>`;
    const label = esc(`Edit ${kind} ${e.category} ${e.date} ${sign}${rowAmount(e)}`);
    if (mode === "grouped") {
      const note = e.note ? " · " + esc(e.note) : "";
      return `<div class="tx tx-sub tx-tap" role="button" tabindex="0" data-ed="${id}" aria-label="${label}"><div><b>${esc(e.category)}</b><div class="hint">${kind}${note}${rec}</div></div><div class="amt">${amt}</div></div>`;
    }
    return `<div class="tx tx-tap" role="button" tabindex="0" data-ed="${id}" aria-label="${label}"><div><b>${esc(e.category)}</b><div class="hint">${esc(e.date)} · ${kind}${rec}${e.note ? " · " + esc(e.note) : ""}</div></div><div class="amt">${amt}</div></div>`;
  }
  function homeListHtml(rows) {
    return groupHomeEntries(rows).map((g) => {
      if (g.items.length === 1) return listRowHtml(g.items[0], "single");
      const head = `<div class="tx-group-h"><b>${esc(g.date)}</b><span class="hint">${g.items.length} items</span></div>`;
      return `<div class="tx-group">${head}${g.items.map((e) => listRowHtml(e, "grouped")).join("")}</div>`;
    }).join("");
  }
  function dueListHtml() {
    const rows = upcoming();
    const t = today();
    if (!rows.length) return `<div class="hint">No subscriptions or recurring bills with a next due date.</div>`;
    return rows.map((e) => {
      const sign = e.type === "income" ? "+" : "\u2212";
      const note = e.note ? ` · ${esc(e.note)}` : "";
      const overdue = e.recurring.nextDue < t;
      const when = overdue ? `<span class="bad"><b>Overdue</b> · was due ${esc(e.recurring.nextDue)}</span>` : `Next due ${esc(e.recurring.nextDue)}`;
      const every = e.recurring.interval === "week" ? "Every week" : "Every month";
      const id = esc(e.id);
      return `<div class="due-row${overdue ? " overdue" : ""}"><div><b>${esc(e.category)}</b><div class="hint">${when} · ${every}${note}</div></div><div class="due-side"><div class="amt ${e.type === "income" ? "ok" : "bad"}">${sign}${esc(rowAmount(e))}</div><div class="due-acts"><button type="button" class="btn small" data-paid="${id}" aria-label="Mark ${esc(e.category)} paid">Paid</button><button type="button" class="ghost" data-ed="${id}" aria-label="Edit ${esc(e.category)}">Edit</button></div></div></div>`;
    }).join("");
  }
  function stampAbout() {
    const about = $("aboutVer");
    if (about) about.textContent = APP_NAME + " " + VERSION + " · updated " + UPDATED;
    ["gateHistory", "homeHistory", "setHistory"].forEach((id) => {
      const a = $(id);
      if (a) a.href = HISTORY_URL;
    });
  }
  function render() {
    $("verFoot").textContent = VERSION + " · updated " + UPDATED;
    stampAbout();
    const scoped = db.entries.filter(inRange);
    const net = netOf(scoped);
    $("net").textContent = moneyHkd(net);
    $("net").className = "n " + (net >= 0 ? "ok" : "bad");
    const inc = scoped.filter((e) => e.type === "income").reduce((a, e) => a + toHkd(e.amount, codeOf(e)), 0);
    const out = scoped.filter((e) => e.type === "outflow").reduce((a, e) => a + toHkd(e.amount, codeOf(e)), 0);
    $("sumIn").textContent = moneyHkd(inc);
    $("sumOut").textContent = moneyHkd(out);
    $("rangeLabel").textContent = range === "this" ? "This month" : range === "last" ? "Last month" : "Custom range";
    renderFx();
    const rows = visibleEntries();
    if (!db.entries.length) $("list").innerHTML = `<p class="hint">No rows yet.</p>`;
    else if (!rows.length) $("list").innerHTML = `<p class="hint">Nothing in this filter.</p>`;
    else $("list").innerHTML = homeListHtml(rows);
    $("dueBox").innerHTML = dueListHtml();
    document.querySelectorAll("#list [data-ed], #dueBox [data-ed]").forEach((b) => {
      b.onclick = () => openEdit(b.dataset.ed);
      if (b.getAttribute("role") === "button") b.onkeydown = (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openEdit(b.dataset.ed); } };
    });
    $("dueBox").querySelectorAll("[data-paid]").forEach((b) => b.onclick = () => markPaid(b.dataset.paid));
    $("catEdit").value = cats("outflow").join("\n");
    $("catEditIn").value = cats("income").join("\n");
    document.querySelectorAll("[data-range]").forEach((c) => { c.classList.toggle("on", c.dataset.range === range); c.setAttribute("aria-pressed", String(c.dataset.range === range)); });
    renderBioUi();
  }
  let sheetOpener = null;
  function openSheet(show) {
    const d = $("sheet");
    if (show) {
      if (!d.open) {
        sheetOpener = document.activeElement;
        if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
      }
      setTimeout(() => $("fAmt").focus(), 0);
    } else if (d.open) {
      if (typeof d.close === "function") d.close(); else { d.removeAttribute("open"); onSheetClosed(); }
    }
  }
  function onSheetClosed() {
    const o = sheetOpener; sheetOpener = null;
    if (o && document.contains(o) && typeof o.focus === "function") o.focus();
  }
  function syncDue() {
    const one = $("fRec").value === "none";
    $("fDueWrap").classList.toggle("hidden", one);
  }
  function openAdd(type) {
    editing = null;
    $("sheetTitle").textContent = "Add";
    $("fType").value = type || "outflow";
    $("fAmt").value = ""; $("fCur").value = "HKD"; $("fDate").value = today(); $("fNote").value = ""; $("fRec").value = "none"; $("fDue").value = addInterval(today(), "month");
    fillCatSelect($("fCat"), $("fType").value);
    updateFxHint();
    syncDue();
    $("delRow").classList.add("hidden");
    openSheet(true);
  }
  function openEdit(id) {
    const e = db.entries.find((x) => x.id === id); if (!e) return;
    editing = id;
    $("sheetTitle").textContent = "Edit";
    $("fType").value = e.type; $("fAmt").value = e.amount; $("fCur").value = codeOf(e); $("fDate").value = e.date; $("fNote").value = e.note || "";
    $("fRec").value = (e.recurring && e.recurring.interval) || "none";
    $("fDue").value = (e.recurring && e.recurring.nextDue) || addInterval(e.date, "month");
    fillCatSelect($("fCat"), e.type, e.category);
    updateFxHint();
    syncDue();
    $("delRow").classList.remove("hidden");
    openSheet(true);
  }
  function snapshot() { undo = JSON.parse(JSON.stringify(db.entries)); }
  function saveRow() {
    const amount = Number($("fAmt").value);
    if (!amount || amount < 0 || Number.isNaN(amount)) { toast("Enter a valid amount"); return; }
    const type = $("fType").value === "income" ? "income" : "outflow";
    const currency = CODES.includes($("fCur").value) ? $("fCur").value : "HKD";
    const rec = $("fRec").value;
    const row = { id: editing || uid(), type, amount, currency, date: $("fDate").value || today(), category: $("fCat").value || "Other", note: $("fNote").value.trim() };
    if (rec === "month" || rec === "week") row.recurring = { interval: rec, nextDue: $("fDue").value || addInterval(row.date, rec) };
    snapshot();
    if (editing) db.entries = db.entries.map((e) => e.id === editing ? row : e);
    else db.entries.push(row);
    persist(); openSheet(false); $("firstHint").classList.add("hidden"); render();
  }
  function removeRow(id) {
    if (!confirm("Delete this row?")) return;
    snapshot();
    db.entries = db.entries.filter((e) => e.id !== id);
    persist();
    editing = null;
    openSheet(false);
    render();
    toast("Deleted", { label: "Undo", run: undoLast });
  }
  function markPaid(id) {
    const e = db.entries.find((x) => x.id === id);
    if (!e || !e.recurring) return;
    snapshot();
    const copy = { id: uid(), type: e.type, amount: e.amount, currency: codeOf(e), date: today(), category: e.category, note: e.note || "" };
    db.entries.push(copy);
    const interval = e.recurring.interval === "week" ? "week" : "month";
    e.recurring = Object.assign({}, e.recurring, { interval, nextDue: addInterval(e.recurring.nextDue, interval) });
    persist(); render();
    toast("Paid · next due " + e.recurring.nextDue, { label: "Undo", run: undoLast });
  }
  function undoLast() {
    if (!undo) { toast("Nothing to undo"); return; }
    db.entries = undo; undo = null; persist(); render(); toast("Undone");
  }
  function showPage(name) {
    ["home", "due", "set"].forEach((p) => {
      $(p).classList.toggle("hidden", p !== name);
      const tab = document.querySelector(`.dock [data-p="${p}"]`);
      tab.classList.toggle("on", p === name);
      if (p === name) tab.setAttribute("aria-current", "page"); else tab.removeAttribute("aria-current");
    });
  }
  function exportLedger() {
    const file = { v: 4, kind: "outflow-ledger", exportedAt: new Date().toISOString(), app: VERSION, ledger: db };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
    a.download = "outflow-backup-" + today() + ".json"; a.click(); URL.revokeObjectURL(a.href);
  }
  function confirmReplace(incoming) {
    const have = db.entries.length;
    const next = (incoming && Array.isArray(incoming.entries)) ? incoming.entries.length : 0;
    if (!have) return true;
    return confirm(`Replace ${have} row${have === 1 ? "" : "s"} on this device with ${next} row${next === 1 ? "" : "s"} from the backup?`);
  }
  async function importLedger(file) {
    const text = await file.text(); let blob;
    try { blob = JSON.parse(text); } catch (e) { toast("Not a backup file"); return; }
    if (blob && (blob.kind === "outflow-ledger" || Array.isArray(blob.entries) || (blob.ledger && Array.isArray(blob.ledger.entries)))) {
      const incoming = blob.ledger || blob;
      if (!confirmReplace(incoming)) return;
      snapshot();
      adopt(incoming);
      render(); toast("Backup imported", { label: "Undo", run: undoLast });
      return;
    }
    if (!blob || !blob.ct || !blob.salt || !blob.iv) { toast("Not a backup file"); return; }
    const pass = prompt("This file is an older locked backup. Enter its passphrase once.");
    if (!pass) return;
    try {
      const opened = await openSeal(pass, blob);
      if (!opened || !Array.isArray(opened.entries)) throw new Error("bad");
      if (!confirmReplace(opened)) return;
      snapshot();
      adopt(opened);
      render(); toast("Locked backup imported", { label: "Undo", run: undoLast });
    } catch (err) { toast("Could not open backup"); }
  }
  $("bioBtn").onclick = () => (loadBio().enabled ? unlockBio() : enableBio());
  $("skipBioBtn").onclick = skipBio;
  $("lockBtn").onclick = lockNow;
  $("bioToggle").onclick = toggleBio;
  $("addBtn").onclick = () => openAdd("outflow");
  $("addIn").onclick = () => openAdd("income");
  $("addOut").onclick = () => openAdd("outflow");
  $("saveRow").onclick = saveRow;
  $("delRow").onclick = () => { if (editing) removeRow(editing); };
  $("closeSheet").onclick = () => openSheet(false);
  $("sheet").addEventListener("close", onSheetClosed);
  $("sheet").addEventListener("click", (ev) => { if (ev.target === $("sheet")) openSheet(false); });
  $("fRec").onchange = () => {
    syncDue();
    if ($("fRec").value !== "none") $("fDue").value = addInterval($("fDate").value || today(), $("fRec").value);
  };
  $("fType").onchange = () => fillCatSelect($("fCat"), $("fType").value);
  $("fCur").onchange = updateFxHint;
  $("fAmt").oninput = updateFxHint;
  document.querySelectorAll("[data-range]").forEach((c) => c.onclick = () => { range = c.dataset.range; $("customDates").classList.toggle("hidden", range !== "custom"); render(); });
  $("from").onchange = () => { customFrom = $("from").value; render(); };
  $("to").onchange = () => { customTo = $("to").value; render(); };
  $("q").oninput = () => { q = $("q").value; render(); };
  $("fTypeFilter").onchange = () => { filterType = $("fTypeFilter").value; render(); };
  $("refreshFx").onclick = async () => {
    try { await loadFx(true); toast("Rates refreshed"); }
    catch (err) { toast("Could not refresh rates"); }
  };
  $("saveCats").onclick = () => {
    db.categories.outflow = $("catEdit").value.split("\n").map((s) => s.trim()).filter(Boolean);
    db.categories.income = $("catEditIn").value.split("\n").map((s) => s.trim()).filter(Boolean);
    persist(); toast("Categories saved");
  };
  document.querySelectorAll("#themeChips .chip").forEach((c) => c.onclick = () => setTheme(c.dataset.theme));
  document.querySelectorAll("#fontChips .chip").forEach((c) => c.onclick = () => setFontSize(c.dataset.font));
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (loadUiPrefs().theme === "auto") applyUiPrefs();
  });
  $("exportBtn").onclick = exportLedger;
  $("importBtn").onclick = () => $("importFile").click();
  $("importFile").onchange = (e) => { const f = e.target.files[0]; if (f) importLedger(f); e.target.value = ""; };
  $("undoBtn").onclick = undoLast;
  $("wipeBtn").onclick = () => {
    if (!confirm("Erase the ledger on this device?")) return;
    snapshot();
    localStorage.removeItem(LEDGER_KEY);
    localStorage.removeItem(OLD_VAULT_KEY);
    db = emptyDb();
    persist();
    $("firstHint").classList.remove("hidden");
    render();
    toast("Ledger erased", { label: "Undo", run: undoLast });
  };
  document.querySelectorAll(".dock button").forEach((b) => b.onclick = () => showPage(b.dataset.p));
  (function initBanner() {
    const ua = navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const standalone = navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = !!loadUiPrefs().bannerHidden;
    $("iosBanner").classList.toggle("hidden", !ios || standalone || dismissed);
  })();
  $("hideBanner").onclick = () => {
    $("iosBanner").classList.add("hidden");
    const p = loadUiPrefs(); p.bannerHidden = true; saveUiPrefs(p);
  };
  boot();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/outflow/sw.js", { scope: "/outflow/" }).catch(() => {});
  }
})();
