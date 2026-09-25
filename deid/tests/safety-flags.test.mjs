/**
 * Unit tests: clinic/signature flags + clinical false-positive guards + dense heuristic.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  lineSafetyFlags,
  collectFlags,
  detectDenseHighContrastRegions,
  isClinicalLine,
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
    assert.equal(flags.filter((f) => f.reason === "institution").length, 0, JSON.stringify(flags));
  });

  it("does NOT flag clinical Right Eye MD/PSD line as institution", () => {
    const words = [
      w("Right", 10, 40, 60, 56),
      w("Eye", 65, 40, 100, 56),
      w("(OD)", 105, 40, 150, 56),
      w("MD", 160, 40, 190, 56),
      w("-1.20", 195, 40, 250, 56),
      w("dB", 255, 40, 280, 56),
      w("PSD", 290, 40, 330, 56),
      w("1.50", 335, 40, 380, 56),
      w("dB", 385, 40, 410, 56),
    ];
    assert.equal(isClinicalLine("Right Eye (OD) MD -1.20 dB PSD 1.50 dB"), true);
    const flags = lineSafetyFlags(words, 500, 100);
    assert.equal(
      flags.filter((f) => f.reason === "institution").length,
      0,
      JSON.stringify(flags)
    );
  });

  it("does NOT flag Left Eye clinical line", () => {
    const words = [
      w("Left", 10, 40, 50, 56),
      w("Eye", 55, 40, 90, 56),
      w("(OS)", 95, 40, 140, 56),
      w("MD", 150, 40, 180, 56),
      w("-0.80", 185, 40, 240, 56),
      w("dB", 245, 40, 270, 56),
    ];
    const flags = lineSafetyFlags(words, 400, 100);
    assert.equal(flags.length, 0, JSON.stringify(flags));
  });

  it("does NOT flag GHT / Fixation Monitor clinical lines", () => {
    const words = [
      w("GHT:", 10, 10, 50, 26),
      w("Within", 55, 10, 120, 26),
      w("Normal", 125, 10, 190, 26),
      w("Limits", 195, 10, 260, 26),
      w("Fixation", 10, 40, 90, 56),
      w("Monitor", 95, 40, 170, 56),
    ];
    const flags = lineSafetyFlags(words, 400, 100);
    assert.equal(flags.length, 0, JSON.stringify(flags));
  });

  it("collectFlags marks clinic + signature on leftover HFA-style text", () => {
    const words = [
      w("DEMO", 10, 10, 50, 26),
      w("EYE", 55, 10, 90, 26),
      w("CLINIC", 95, 10, 170, 26),
      w("Signature", 20, 220, 110, 236),
    ];
    const flags = collectFlags({ 0: words }, 400, 300, []);
    const blob = flags.map((f) => `${f.reason}:${f.text || ""}`).join(" | ");
    assert.ok(flags.some((f) => /CLINIC/i.test(f.text || "")), blob);
    assert.ok(flags.some((f) => /Signature/i.test(f.text || "")), blob);
  });

  it("flags Chinese clinic tokens", () => {
    const words = [w("眼科診所", 10, 10, 100, 28)];
    const flags = lineSafetyFlags(words, 200, 100);
    assert.ok(flags.some((f) => f.reason === "institution"));
  });
});

describe("dense barcode heuristic — reject text blocks", () => {
  it("does not flag a horizontal text-like stroke band", () => {
    const W = 400;
    const H = 200;
    const img = new ImageData(W, H);
    img.data.fill(255);
    // Simulate text: sparse dark glyphs on a few scanlines (not binary module grid)
    for (let y = 80; y < 100; y++) {
      for (let x = 40; x < 360; x++) {
        if ((x + y) % 7 < 2) {
          const i = (y * W + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 30;
        }
      }
    }
    // "GHT: Within Normal Limits" style second line
    for (let y = 120; y < 136; y++) {
      for (let x = 40; x < 300; x++) {
        if ((x * 3) % 11 < 3) {
          const i = (y * W + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 20;
        }
      }
    }
    const flags = detectDenseHighContrastRegions(img);
    assert.equal(flags.length, 0, `text must not be dense-flagged: ${JSON.stringify(flags)}`);
  });
});
