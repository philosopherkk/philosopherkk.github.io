/**
 * Unit tests: unrecognised-layout safety-net flags (clinic / signature / phone).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  lineSafetyFlags,
  collectFlags,
  detectDenseHighContrastRegions,
} from "../core/index.js";
import "./helpers/imagedata-polyfill.mjs";

function w(text, x0, y0, x1, y1, conf = 90) {
  return { text, conf, x0, y0, x1, y1, line: [0, 0, 0] };
}

describe("unrecognised layout — clinic / signature / phone flags", () => {
  it("flags DEMO EYE CLINIC institution line", () => {
    const words = [
      w("DEMO", 10, 20, 60, 36),
      w("EYE", 65, 20, 100, 36),
      w("CLINIC", 105, 20, 180, 36),
      w("MD", 40, 200, 80, 216),
      w("-2.1", 90, 200, 140, 216),
    ];
    const flags = lineSafetyFlags(words, 400, 300);
    assert.ok(
      flags.some((f) => f.reason === "institution" && /CLINIC/i.test(f.text || "")),
      JSON.stringify(flags)
    );
  });

  it("flags Signature line", () => {
    const words = [
      w("Signature", 20, 250, 120, 268),
      w("________________", 130, 250, 300, 268),
    ];
    const flags = lineSafetyFlags(words, 400, 300);
    assert.ok(flags.some((f) => f.reason === "signature_line"), JSON.stringify(flags));
  });

  it("flags HK phone", () => {
    const words = [w("Tel", 10, 40, 40, 56), w("9123-4567", 50, 40, 140, 56)];
    const flags = lineSafetyFlags(words, 400, 300);
    assert.ok(flags.some((f) => f.reason === "phone"), JSON.stringify(flags));
  });

  it("does not flag laterality Eye:R", () => {
    const words = [w("Eye:R", 20, 100, 80, 116), w("Thickness", 90, 100, 180, 116)];
    const flags = lineSafetyFlags(words, 400, 300);
    assert.equal(
      flags.filter((f) => f.reason === "institution").length,
      0,
      JSON.stringify(flags)
    );
  });

  it("collectFlags on synthetic HFA-style leftover text marks clinic + signature", () => {
    const words = [
      w("DEMO", 10, 10, 50, 26),
      w("EYE", 55, 10, 90, 26),
      w("CLINIC", 95, 10, 170, 26),
      w("SITA", 20, 80, 70, 96),
      w("STANDARD", 80, 80, 180, 96),
      w("Signature", 20, 220, 110, 236),
      w("Technician", 20, 250, 120, 266),
      w("DEMO", 130, 250, 180, 266),
    ];
    const flags = collectFlags({ 0: words }, 400, 300, []);
    const blob = flags.map((f) => `${f.reason}:${f.text || ""}`).join(" | ");
    assert.ok(
      flags.some((f) => /CLINIC/i.test(f.text || "") || f.reason === "institution"),
      blob
    );
    assert.ok(
      flags.some(
        (f) =>
          f.reason === "signature_line" ||
          /Signature|Technician/i.test(f.text || "") ||
          f.reason === "identity_or_date"
      ),
      blob
    );
    // Must not auto-pass: at least one unresolved flag covering clinic or signature
    assert.ok(flags.length >= 2, blob);
  });

  it("flags Chinese clinic tokens", () => {
    const words = [w("眼科診所", 10, 10, 100, 28)];
    const flags = lineSafetyFlags(words, 200, 100);
    assert.ok(flags.some((f) => f.reason === "institution"));
  });
});

describe("dense barcode heuristic", () => {
  it("flags a synthetic high-contrast checkerboard square", () => {
    const W = 200;
    const H = 200;
    const img = new ImageData(W, H);
    img.data.fill(255);
    // QR-like dense block in centre
    for (let y = 40; y < 120; y++) {
      for (let x = 40; x < 120; x++) {
        const on = ((x >> 1) + (y >> 1)) % 2 === 0;
        const i = (y * W + x) * 4;
        const v = on ? 0 : 255;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
      }
    }
    const flags = detectDenseHighContrastRegions(img);
    assert.ok(flags.length >= 1, "expected dense region flag");
  });
});
