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
  isGenuineHanText,
  shouldAutoBlankCjkWord,
  mergeAdjacentHanWords,
  filterClinicalSafeAutoBlanks,
  detectQrFinderFlags,
  deidPage,
} from "../../deid/core/index.js";
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

describe("clinical-term auto-blank guard", () => {
  it("mergeAdjacentHanWords joins split chi_tra glyphs into a name run", () => {
    const parts = [
      w("陳", 40, 140, 70, 175, 90),
      w("大", 72, 142, 100, 176, 95),
      w("文", 102, 141, 130, 175, 88),
    ];
    const merged = mergeAdjacentHanWords(parts);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].text, "陳大文");
    assert.equal(isGenuineHanText(merged[0].text), true);
    assert.equal(shouldAutoBlankCjkWord(merged[0], []), true);
  });

  it("shouldAutoBlankCjkWord skips boxes overlapping Latin clinical tokens", () => {
    const eng = [
      w("Right", 10, 40, 60, 56),
      w("Eye", 65, 40, 100, 56),
      w("MD", 160, 40, 190, 56),
    ];
    // chi_tra invents Han over the clinical line
    const fake = w("右眼視", 12, 38, 98, 58, 92);
    assert.equal(shouldAutoBlankCjkWord(fake, eng), false);
    // Real name elsewhere is fine
    const name = w("陳大文", 200, 200, 280, 220, 92);
    assert.equal(shouldAutoBlankCjkWord(name, eng), true);
  });

  it("filterClinicalSafeAutoBlanks drops boxes on Right Eye / MD", () => {
    const eng = [
      w("Right", 10, 40, 60, 56),
      w("Eye", 65, 40, 100, 56),
      w("(OD)", 105, 40, 150, 56),
      w("MD", 160, 40, 190, 56),
    ];
    const boxes = [
      [8, 36, 102, 60], // overlaps Right Eye
      [300, 300, 360, 340], // clear
    ];
    const kept = filterClinicalSafeAutoBlanks(boxes, eng);
    assert.equal(kept.length, 1);
    assert.deepEqual(kept[0], [300, 300, 360, 340]);
  });

  it("deidPage with fake OCR does not auto-blank Han over Right Eye", async () => {
    const W = 400;
    const H = 500;
    const img = new ImageData(W, H);
    img.data.fill(255);
    // Dark clinical glyphs below generic keep top (0.12*H ≈ 60) so they survive crop
    for (let y = 140; y < 170; y++) {
      for (let x = 30; x < 320; x++) {
        if ((x + y) % 5 < 2) {
          const i = (y * W + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 20;
        }
      }
    }
    // OCR runs on the *cropped* image — coords relative to keep top (~y-60)
    const engWords = [
      w("Right", 30, 80, 90, 106, 92),
      w("Eye", 95, 80, 140, 106, 92),
      w("(OD)", 145, 80, 190, 106, 90),
      w("MD", 200, 80, 240, 106, 91),
      w("-3.05", 245, 80, 310, 106, 88),
    ];
    const hanOverEye = w("右眼視", 32, 78, 142, 108, 92);
    const ocr = {
      async recognize(_image, opts = {}) {
        if (opts.lang === "chi_tra") return [hanOverEye];
        return engWords;
      },
    };
    const result = await deidPage(img, { ocr, forceDevice: "generic", autoBlankBackstop: true });
    // Clinical band must still have dark ink (not auto-blanked white)
    let dark = 0;
    const band = result.imageData;
    for (let y = 50; y < 120 && y < band.height; y++) {
      for (let x = 20; x < Math.min(300, band.width); x++) {
        const i = (y * band.width + x) * 4;
        if (band.data[i] < 80) dark++;
      }
    }
    assert.ok(dark > 10, `Right Eye band was auto-blanked (dark=${dark})`);
    assert.equal(
      result.flags.filter((f) => f.reason === "cjk_name").length,
      0,
      "cjk_name must not flag over Right Eye"
    );
  });

  it("deidPage leaves genuine CJK names as unblanked cjk_name flags (not auto-blanked)", async () => {
    const W = 400;
    const H = 500;
    const img = new ImageData(W, H);
    img.data.fill(255);
    for (let y = 140; y < 170; y++) {
      for (let x = 30; x < 320; x++) {
        if ((x + y) % 5 < 2) {
          const i = (y * W + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 20;
        }
      }
    }
    // Name band ink
    for (let y = 200; y < 230; y++) {
      for (let x = 40; x < 200; x++) {
        if ((x + y) % 4 < 2) {
          const i = (y * W + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 15;
        }
      }
    }
    const engWords = [
      w("Right", 30, 80, 90, 106, 92),
      w("Eye", 95, 80, 140, 106, 92),
      w("MD", 200, 80, 240, 106, 91),
    ];
    // Crop shifts y by ~keep top 0.12*H ≈ 60 → name at image y=200 is OCR y≈140
    const name = w("陳大文", 40, 140, 180, 170, 92);
    const ocr = {
      async recognize(_image, opts = {}) {
        if (opts.lang === "chi_tra") return [name];
        return engWords;
      },
    };
    const result = await deidPage(img, { ocr, forceDevice: "generic", autoBlankBackstop: true });
    const cjk = result.flags.filter((f) => f.reason === "cjk_name" && !f.blanked);
    assert.ok(cjk.length >= 1, `expected unblanked cjk_name, got ${JSON.stringify(result.flags)}`);
    assert.equal(result.passed, false);
    // Name ink must still be present (not auto-blanked white)
    let dark = 0;
    const band = result.imageData;
    for (let y = 120; y < 180 && y < band.height; y++) {
      for (let x = 30; x < Math.min(220, band.width); x++) {
        const i = (y * band.width + x) * 4;
        if (band.data[i] < 80) dark++;
      }
    }
    assert.ok(dark > 10, `CJK name band was auto-blanked (dark=${dark})`);
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

/** Paint a QR-like finder (7×7 modules) at module coords. */
function paintFinder(img, ox, oy, mod) {
  const { width: W, data } = img;
  const set = (mx, my, dark) => {
    for (let dy = 0; dy < mod; dy++) {
      for (let dx = 0; dx < mod; dx++) {
        const x = ox + mx * mod + dx;
        const y = oy + my * mod + dy;
        if (x < 0 || y < 0 || x >= W || y >= img.height) continue;
        const i = (y * W + x) * 4;
        const v = dark ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;
      }
    }
  };
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const border = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      set(x, y, border || core);
    }
  }
}

/** Paint a binary module grid (checker-ish QR payload texture). */
function paintModuleGrid(img, ox, oy, modules, mod) {
  const { width: W, data } = img;
  for (let my = 0; my < modules; my++) {
    for (let mx = 0; mx < modules; mx++) {
      // Pseudo-random but stable module pattern
      const dark = ((mx * 7 + my * 13) % 5) < 2 || (mx + my) % 3 === 0;
      for (let dy = 0; dy < mod; dy++) {
        for (let dx = 0; dx < mod; dx++) {
          const x = ox + mx * mod + dx;
          const y = oy + my * mod + dy;
          if (x < 0 || y < 0 || x >= W || y >= img.height) continue;
          const i = (y * W + x) * 4;
          const v = dark ? 0 : 255;
          data[i] = data[i + 1] = data[i + 2] = v;
          data[i + 3] = 255;
        }
      }
    }
  }
}

describe("damaged QR detectors — 1-finder + texture; no HFA/Pentacam FP", () => {
  it("flags a QR with left finders wiped (1 finder + dense grid)", () => {
    const W = 400;
    const H = 400;
    const img = new ImageData(W, H);
    img.data.fill(255);
    const mod = 6;
    const n = 25;
    const ox = 80;
    const oy = 80;
    paintModuleGrid(img, ox, oy, n, mod);
    // Only top-right finder survives (left column wiped)
    paintFinder(img, ox + (n - 7) * mod, oy, mod);
    // Wipe left ~40% (destroy TL+BL finders if any)
    for (let y = oy - 4; y < oy + n * mod + 4; y++) {
      for (let x = ox - 4; x < ox + Math.floor(n * mod * 0.4); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = (y * W + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 220;
      }
    }
    const flags = detectQrFinderFlags(img);
    assert.ok(
      flags.some((f) => f.reason === "qr_finder" || f.reason === "qr_texture"),
      `expected damaged-QR flag, got ${JSON.stringify(flags)}`
    );
  });

  it("flags finder-less QR-like module texture", () => {
    const W = 360;
    const H = 360;
    const img = new ImageData(W, H);
    img.data.fill(255);
    paintModuleGrid(img, 60, 60, 29, 6);
    // No finders painted — texture detector must catch it
    const flags = detectQrFinderFlags(img);
    assert.ok(
      flags.some((f) => f.reason === "qr_texture" || f.reason === "qr_finder"),
      `expected qr_texture, got ${JSON.stringify(flags)}`
    );
  });

  it("does NOT flag HFA-like greyscale symbol plot", () => {
    const W = 400;
    const H = 400;
    const img = new ImageData(W, H);
    img.data.fill(245);
    // Soft greyscale blobs + sparse numeral-like strokes (not binary modules)
    for (let y = 80; y < 300; y++) {
      for (let x = 80; x < 300; x++) {
        const dx = x - 190;
        const dy = y - 190;
        const r = Math.sqrt(dx * dx + dy * dy);
        const g = Math.max(40, Math.min(240, 200 - r * 0.7 + ((x * y) % 17)));
        const i = (y * W + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
        img.data[i + 3] = 255;
      }
    }
    // Sparse "symbol" dots
    for (let k = 0; k < 40; k++) {
      const x = 100 + (k * 37) % 180;
      const y = 100 + (k * 53) % 180;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const i = ((y + dy) * W + (x + dx)) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 30;
        }
      }
    }
    const flags = detectQrFinderFlags(img);
    assert.equal(flags.length, 0, `HFA greyscale must not flag: ${JSON.stringify(flags)}`);
  });

  it("does NOT flag colourful Pentacam-like map", () => {
    const W = 400;
    const H = 400;
    const img = new ImageData(W, H);
    img.data.fill(255);
    for (let y = 60; y < 280; y++) {
      for (let x = 60; x < 280; x++) {
        const t = (x - 60) / 220;
        const r = Math.round(255 * t);
        const g = Math.round(80 + 100 * Math.sin(t * 6));
        const b = Math.round(255 * (1 - t));
        const i = (y * W + x) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    }
    const flags = detectQrFinderFlags(img);
    assert.equal(flags.length, 0, `Pentacam colour map must not flag: ${JSON.stringify(flags)}`);
  });

  it("flags rendered smudged QR bitmaps at 50 / 72 / 120px and smudged finder at 120px", () => {
    // Synthetic module grids scaled to target side lengths (not ideal 150px unit grids).
    const cases = [
      { side: 50, mod: 2, n: 25 },
      { side: 72, mod: 3, n: 25 },
      { side: 120, mod: 4, n: 25 },
    ];
    for (const { side, mod, n } of cases) {
      const pad = 80;
      const W = Math.max(side, n * mod) + pad * 2;
      const H = W;
      const img = new ImageData(W, H);
      img.data.fill(255);
      const ox = pad;
      const oy = pad;
      paintModuleGrid(img, ox, oy, n, mod);
      paintFinder(img, ox + (n - 7) * mod, oy, mod); // TR finder only
      // Wipe left ~40%
      for (let y = oy - 2; y < oy + n * mod + 2; y++) {
        for (let x = ox - 2; x < ox + Math.floor(n * mod * 0.4); x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const i = (y * W + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 210;
        }
      }
      // Centre blot
      const cx = ox + Math.floor(n * mod * 0.55);
      const cy = oy + Math.floor(n * mod * 0.55);
      const r = Math.max(3, Math.floor(side * 0.12));
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r * r) continue;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const i = (y * W + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 45;
        }
      }
      const flags = detectQrFinderFlags(img);
      assert.ok(
        flags.some((f) => f.reason === "qr_finder" || f.reason === "qr_texture"),
        `smudged ${side}px must flag; got ${JSON.stringify(flags)}`
      );
    }

    // 120px with TL finder smudged (TR survives)
    {
      const side = 120;
      const mod = 4;
      const n = 25;
      const pad = 40;
      const W = side + pad * 2;
      const H = side + pad * 2;
      const img = new ImageData(W, H);
      img.data.fill(255);
      const ox = pad;
      const oy = pad;
      paintModuleGrid(img, ox, oy, n, mod);
      paintFinder(img, ox, oy, mod);
      paintFinder(img, ox + (n - 7) * mod, oy, mod);
      paintFinder(img, ox, oy + (n - 7) * mod, mod);
      // Smudge TL finder
      for (let y = oy - 2; y < oy + 7 * mod + 2; y++) {
        for (let x = ox - 2; x < ox + 7 * mod + 2; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const i = (y * W + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 200;
        }
      }
      const flags = detectQrFinderFlags(img);
      assert.ok(
        flags.some((f) => f.reason === "qr_finder" || f.reason === "qr_texture"),
        `120px smudged finder must flag; got ${JSON.stringify(flags)}`
      );
    }
  });

  it("assert zero code flags on HFA and Pentacam mock rasters", () => {
    // HFA-like greyscale plot band
    const hfa = new ImageData(500, 400);
    hfa.data.fill(245);
    for (let y = 120; y < 320; y++) {
      for (let x = 80; x < 380; x++) {
        const dx = x - 230;
        const dy = y - 220;
        const r = Math.sqrt(dx * dx + dy * dy);
        const g = Math.max(50, Math.min(235, 190 - r * 0.55 + ((x * 3 + y) % 19)));
        const i = (y * 500 + x) * 4;
        hfa.data[i] = hfa.data[i + 1] = hfa.data[i + 2] = g;
        hfa.data[i + 3] = 255;
      }
    }
    assert.equal(
      detectQrFinderFlags(hfa).filter((f) =>
        /qr_finder|qr_texture|dense_code_region|barcode/.test(f.reason)
      ).length,
      0,
      "HFA mock must have zero code flags"
    );

    // Pentacam-like colourful topography square
    const penta = new ImageData(500, 400);
    penta.data.fill(255);
    for (let y = 80; y < 300; y++) {
      for (let x = 100; x < 360; x++) {
        const t = (x - 100) / 260;
        const u = (y - 80) / 220;
        const i = (y * 500 + x) * 4;
        penta.data[i] = Math.round(40 + 200 * t);
        penta.data[i + 1] = Math.round(80 + 120 * Math.sin(u * 8));
        penta.data[i + 2] = Math.round(220 * (1 - t));
        penta.data[i + 3] = 255;
      }
    }
    assert.equal(
      detectQrFinderFlags(penta).filter((f) =>
        /qr_finder|qr_texture|dense_code_region|barcode/.test(f.reason)
      ).length,
      0,
      "Pentacam mock must have zero code flags"
    );
  });
});
