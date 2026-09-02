    const { fastest, cheapest } = pickWinners(state.trips);
    const hero = $("hero");
    if (!fastest) {
      hero.innerHTML = "";
      $("trips").innerHTML = `<div class="empty">${t("none")}</div>`;
      return;
    }
    const same = fastest.id === cheapest.id;
    hero.innerHTML = `
      <div class="hero fast">
        <h3>${t("shortest")}</h3>
        <div class="big">${fmtMin(fastest.duration)}</div>
        <div class="sub">$${fastest.fare.toFixed(1)} · ${fastest.transfers} transfer</div>
      </div>
      <div class="hero cheap">
        <h3>${t("cheapest")}${same ? " · " + t("both") : ""}</h3>
        <div class="big">$${cheapest.fare.toFixed(1)}</div>
        <div class="sub">${fmtMin(cheapest.duration)}</div>
      </div>`;
    $("trips").innerHTML = state.trips.map((tr, i) => {
      const tags = [];
      if (tr.id === fastest.id) tags.push(t("shortest"));
      if (tr.id === cheapest.id) tags.push(t("cheapest"));
      return `<article class="trip ${i === state.selected ? "active" : ""}" data-i="${i}">
        <div class="trip-top"><div class="mins">${fmtMin(tr.duration)}</div><div class="fare">$${tr.fare.toFixed(1)}</div></div>
        <div class="muted" style="font-size:12px;margin:2px 0 6px">${tags.join(" · ") || (tr.kind === "mtr" ? "MTR" : tr.kind)}</div>
        <div class="legs">${tr.legs.map(renderLeg).join("")}</div>
      </article>`;
    }).join("");
    $("trips").querySelectorAll(".trip").forEach((el) => {
      el.onclick = () => {
        state.selected = +el.dataset.i;
        renderTrips();
        drawTrip(state.trips[state.selected]);
      };
    });
  }

  function renderLeg(leg) {
    if (leg.type === "walk") {
      return `<div class="leg"><div class="badge walk">W</div><div>${t("walk")} ${leg.meters || Math.round(leg.mins * 80)} m</div><div class="muted">${fmtMin(leg.mins)}</div></div>`;
    }
    const eta = leg.etaMin != null
      ? `<span class="eta">${Math.round(leg.etaMin)} ${t("min")}</span>`
      : `<span class="muted">${t("wait")} ${fmtMin(leg.wait || 0)}</span>`;
    const label = `${coLabel(leg.co)} ${leg.route}`;
    const style = leg.color ? `background:${leg.color};color:#fff` : "";
    return `<div class="leg"><div class="badge ${leg.type}" style="${style}">${esc(leg.route)}</div>
      <div><strong>${esc(label)}</strong><div class="muted">${esc(leg.from)} → ${esc(leg.to)}${leg.destName ? " · " + esc(leg.destName) : ""}</div></div>
      <div>${eta}</div></div>`;
  }

  function fmtMin(n) { return `${Math.round(Math.max(0, n))} ${t("min")}`; }
  function esc(s) {
    return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&", "<": "<", ">": ">", '"': """ }[c]));
  }

  function drawTrip(tr) {
    state.layer.clearLayers();
    if (!tr) return;
    const pts = [];
    if (state.origin) {
      L.circleMarker([state.origin.lat, state.origin.lng], { radius: 8, color: "#2ee0c0", fillColor: "#2ee0c0", fillOpacity: 1 }).addTo(state.layer).bindTooltip("A");
      pts.push([state.origin.lat, state.origin.lng]);
    }
    if (state.dest) {
      L.circleMarker([state.dest.lat, state.dest.lng], { radius: 8, color: "#ff6b6b", fillColor: "#ff6b6b", fillOpacity: 1 }).addTo(state.layer).bindTooltip("B");
      pts.push([state.dest.lat, state.dest.lng]);
    }
    if (tr.board && tr.board.location) {
      L.circleMarker([tr.board.location.lat, tr.board.location.lng], { radius: 6, color: "#f4c15d" }).addTo(state.layer);
      pts.push([tr.board.location.lat, tr.board.location.lng]);
    }
    if (pts.length >= 2) {
      L.polyline(pts, { color: "#2ee0c0", weight: 3, dashArray: "6 8", opacity: 0.7 }).addTo(state.layer);
      state.map.fitBounds(pts, { padding: [48, 48], maxZoom: 15 });
    }
  }

  function useGeo() {
    if (!navigator.geolocation) { setStatus(t("geoFail")); return; }
    setStatus(t("locating"));
    $("originInput").value = t("locating");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      const name = (await photonReverse(lat, lng)) || (state.lang === "zh" ? "目前位置" : "Current location");
      state.origin = { lat, lng, name };
      $("originInput").value = name;
      state.map.setView([lat, lng], 16);
      setStatus(name);
      showSuggest("", $("originSuggest"), (p) => {
        state.origin = p;
        $("originInput").value = p.name;
        if (state.dest) plan();
      }, state.origin);
      if (state.dest) plan();
    }, (err) => {
      $("originInput").value = "";
      setStatus(t("geoFail") + " (" + err.code + ")");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  function tickClock() {
    $("clock").textContent = new Date().toLocaleString(state.lang === "zh" ? "zh-HK" : "en-HK", {
      timeZone: "Asia/Hong_Kong", hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }

  async function main() {
    document.documentElement.setAttribute("data-theme", state.theme);
    initMap();
    renderChips();
    applyLang();
    bindSuggest($("originInput"), $("originSuggest"), "origin");
    bindSuggest($("destInput"), $("destSuggest"), "dest");
    $("destChips").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-i]");
      if (!btn) return;
      const h = HOT[+btn.dataset.i];
      state.dest = { lat: h.lat, lng: h.lng, name: state.lang === "zh" ? h.zh : h.en };
      $("destInput").value = state.dest.name;
      if (state.origin) plan();
    });
    $("geoBtn").onclick = useGeo;
    $("planBtn").onclick = plan;
    $("swapBtn").onclick = () => {
      const a = state.origin, b = state.dest;
      state.origin = b; state.dest = a;
      $("originInput").value = (b && b.name) || "";
      $("destInput").value = (a && a.name) || "";
      if (state.origin && state.dest) plan();
    };
    $("langBtn").onclick = () => { state.lang = state.lang === "en" ? "zh" : "en"; applyLang(); };
    $("themeBtn").onclick = () => applyTheme(state.theme === "dark" ? "light" : "dark");
    tickClock();
    setInterval(tickClock, 1000);
    window.addEventListener("resize", () => state.map && state.map.invalidateSize());
    await loadData();
    clearInterval(state.etaTimer);
    state.etaTimer = setInterval(async () => {
      if (!state.trips.length) return;
      await refreshEtas(state.trips.slice(0, 6));
      rerankWithEta();
      renderTrips();
    }, 20000);
  }

  window.HKTransit = { state, plan, APP };
  main().catch((err) => setStatus("Startup failed: " + err.message));
})();
