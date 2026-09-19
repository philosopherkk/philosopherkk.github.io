(() => {
  Promise.all([
    fetch("/outflow/app.part0.js").then((r) => r.text()),
    fetch("/outflow/app.part1.js").then((r) => r.text()),
    fetch("/outflow/app.part2.js").then((r) => r.text()),
  ]).then((texts) => {
    (0, eval)(texts.join(""));
  }).catch((err) => {
    console.error("Outflow boot failed", err);
    document.body && (document.body.textContent = "Outflow failed to load.");
  });
})();
