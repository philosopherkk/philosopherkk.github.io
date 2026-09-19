(() => {
  fetch("/outflow/app.payload.b64").then((r) => r.text()).then((b64) => {
    const bytes = Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0));
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  }).then((ab) => {
    (0, eval)(new TextDecoder().decode(ab));
  }).catch((err) => {
    console.error("Outflow boot failed", err);
    document.body && (document.body.textContent = "Outflow failed to load.");
  });
})();
