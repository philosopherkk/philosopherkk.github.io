      pts.push([tr.board.location.lat, tr.board.location.lng]);
    }
    if (pts.length >= 2) {
      L.polyline(pts, { color: "#2ee0c0", weight: 3, dashArray: "6 8", opacity: 0.7 }).addTo(state.layer);
      state.map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    }
    syncGoogle();
  }

  function syncGoogle() {
    const iframe = $("gmap");
    const link = $("gopen");
    if (!iframe || !link) return;
    const hl = state.lang === "zh" ? "zh-TW" : "en";
    if (state.origin && state.dest) {
      iframe.src = `https://maps.google.com/maps?saddr=${state.origin.lat},${state.origin.lng}&daddr=${state.dest.lat},${state.dest.lng}&dirflg=r&hl=${hl}&output=embed`;
      link.href = `https://www.google.com/maps/dir/?api=1&origin=${state.origin.lat},${state.origin.lng}&destination=${state.dest.lat},${state.dest.lng}&travelmode=transit`;
    } else {
      const p = state.dest || state.origin || { lat: 22.3193, lng: 114.1694 };
      iframe.src = `https://maps.google.com/maps?q=${p.lat},${p.lng}&z=15&hl=${hl}&output=embed`;
      link.href = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    }
  }

  function renderNearby() {
    const box = $("nearby");
    if (!box || !state.origin || !state.db) { if (box) box.innerHTML = ""; return; }
    const stops = nearbyStops(state.origin.lat, state.origin.lng, 380, 6);
    if (!stops.length) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="nearby-title">${t("nearby")}</div>` + stops.map((s) =>
      `<div class="near-item" data-id="${s.id}"><span>${esc(nm(s.name))}</span><span class="muted">${Math.round(s.walk)} m</span></div>`
    ).join("");
    box.querySelectorAll(".near-item").forEach((el) => {
      el.onclick = () => {
        const s = stops.find((x) => x.id === el.dataset.id);
        if (!s) return;
        state.origin = { lat: s.location.lat, lng: s.location.lng, name: nm(s.name) };
        $("originInput").value = state.origin.name;
        if (state.dest) plan();
      };
    });
  }

  function useGeo() {
    if (!navigator.geolocation) { setStatus(t("geoFail")); return; }
    setStatus(t("locating"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        state.origin = { lat, lng, name: state.lang === "zh" ? "目前位置" : "Current location" };
        $("originInput").value = state.origin.name;
        state.map.setView([lat, lng], 15);
        L.circleMarker([lat, lng], { radius: 8, color: "#2ee0c0", fillColor: "#2ee0c0", fillOpacity: 1 }).addTo(state.layer);
        setStatus(state.origin.name);
        renderNearby();
        syncGoogle();
        if (state.dest) plan();
      },
      () => setStatus(t("geoFail")),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function tickClock() {
    $("clock").textContent = new Date().toLocaleString(state.lang === "zh" ? "zh-HK" : "en-HK", { timeZone: "Asia/Hong_Kong", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function startEtaLoop() {
    clearInterval(state.etaTimer);
    state.etaTimer = setInterval(async () => {
      if (!state.trips.length) return;
      await refreshEtas(state.trips.slice(0, 6));
      rerankWithEta();
      renderTrips();
    }, 20000);
  }

  async function main() {
    initMap();
    renderChips();
    applyLang();
    bindSuggest($("originInput"), $("originSuggest"), (p) => {
      state.origin = p;
      $("originInput").value = p.name;
    });
    bindSuggest($("destInput"), $("destSuggest"), (p) => {
      state.dest = p;
      $("destInput").value = p.name;
    });
    $("destChips").addEventListener("click", (e) => pickHot(e, "dest"));
    if ($("originChips")) $("originChips").addEventListener("click", (e) => pickHot(e, "origin"));
    $("geoBtn").onclick = useGeo;
    $("tabLeaflet").onclick = () => setMapMode("leaflet");
    $("tabGoogle").onclick = () => setMapMode("google");
    $("pinOrigin").onclick = () => { state.pinMode = "origin"; $("pinOrigin").classList.add("on"); $("pinDest").classList.remove("on"); };
    $("pinDest").onclick = () => { state.pinMode = "dest"; $("pinDest").classList.add("on"); $("pinOrigin").classList.remove("on"); };
    $("pinDest").classList.add("on");
    syncGoogle();
    $("planBtn").onclick = plan;
    $("swapBtn").onclick = () => {
      const a = state.origin, b = state.dest;
      state.origin = b; state.dest = a;
      $("originInput").value = (b && b.name) || "";
      $("destInput").value = (a && a.name) || "";
    };
    $("langBtn").onclick = () => {
      state.lang = state.lang === "en" ? "zh" : "en";
      applyLang();
    };
    tickClock();
    setInterval(tickClock, 1000);
    await loadData();
    startEtaLoop();
    useGeo();
  }

  function pickHot(e, which) {
    const btn = e.target.closest("[data-i]");
    if (!btn) return;
    const h = HOT[+btn.dataset.i];
    const place = { lat: h.lat, lng: h.lng, name: state.lang === "zh" ? h.zh : h.en };
    if (which === "origin") {
      state.origin = place;
      $("originInput").value = place.name;
      renderNearby();
    } else {
      state.dest = place;
      $("destInput").value = place.name;
    }
    syncGoogle();
    if (state.origin && state.dest) plan();
  }

  function setMapMode(mode) {
    state.mapMode = mode;
    $("tabLeaflet").classList.toggle("on", mode === "leaflet");
    $("tabGoogle").classList.toggle("on", mode === "google");
    $("gmap").classList.toggle("on", mode === "google");
    if (mode === "google") syncGoogle();
    else setTimeout(() => state.map && state.map.invalidateSize(), 80);
  }

  main().catch((err) => setStatus("Startup failed: " + err.message));
})();
