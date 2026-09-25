/**
 * Node unit tests for deid core (no browser / no real OCR).
 */
import "./helpers/imagedata-polyfill.mjs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectDevice, detectDeviceOrGeneric } from "../core/detect.js";
import {
  isIdentToken,
  RX,
  CROP,
  computeCropWindows,
  applyCrop,
  fillWhite,
  serialHits,
  remainingIdentifiers,
  makeExportName,
  buildMultiPagePdf,
  labelMasks,
} from "../core/index.js";

describe("detectDevice", () => {
  it("detects HFA from keywords", () => {
    assert.equal(
      detectDevice("Zeiss Single Field Analysis SITA Standard Pattern Deviation Fixation Monitor"),
      "hfa"
    );
  });
  it("detects nidek_rs", () => {
    assert.equal(
      detectDevice("OCT Setting Macula Map ETDRS 9 Sector Normative Database Retina Scan SSI"),
      "nidek_rs"
    );
  });
  it("detects topcon_letter over topcon when letterhead keywords present", () => {
    assert.equal(
      detectDevice("Patient Code Ophthalmic Surgery Cataract Center Fax Topcon Macula Report Maestro Capture Date"),
      "topcon_letter"
    );
  });
  it("falls back to generic", () => {
    assert.equal(detectDeviceOrGeneric("hello world nothing"), "generic");
  });
});

describe("PHI regexes", () => {
  it("matches HKID and dates", () => {
    assert.equal(isIdentToken("A123456(7)"), true);
    assert.equal(isIdentToken("14/07/2026"), true);
    assert.equal(isIdentToken("15:28:22"), true);
    assert.equal(isIdentToken("KD009700"), true);
  });
  it("whitelists clinical tokens", () => {
    assert.equal(isIdentToken("ETDRS"), false);
    assert.equal(isIdentToken("ZCB00"), false);
    assert.equal(isIdentToken("SITA"), false);
  });
});

describe("crop windows", () => {
  it("has keep/erase for all devices", () => {
    for (const [k, spec] of Object.entries(CROP)) {
      assert.ok(spec.keep?.length === 4, k);
      assert.ok(Array.isArray(spec.erase), k);
    }
  });
  it("nidek_rs includes cut band", () => {
    assert.ok(CROP.nidek_rs.cut?.length);
    const { cuts } = computeCropWindows("nidek_rs", 1000, 1000, 0);
    assert.equal(cuts.length, 1);
    assert.ok(cuts[0][1] > cuts[0][0]);
  });
  it("applyCrop shrinks height for nidek_rs cut", () => {
    const data = new ImageData(200, 200);
    data.data.fill(200);
    const { image, cuts } = applyCrop(data, "nidek_rs", 0);
    assert.ok(cuts.length);
    assert.ok(image.height < 200);
    assert.equal(image.width, 200);
  });
});

describe("labelMasks", () => {
  it("masks name label and value", () => {
    const words = [
      { text: "Name", conf: 90, x0: 10, y0: 10, x1: 50, y1: 28, line: [0, 0, 0] },
      { text: "CHAN", conf: 90, x0: 60, y0: 10, x1: 110, y1: 28, line: [0, 0, 0] },
      { text: "TAI", conf: 90, x0: 115, y0: 10, x1: 150, y1: 28, line: [0, 0, 0] },
    ];
    const boxes = labelMasks(words, 400, 200);
    assert.ok(boxes.length >= 1);
    assert.ok(boxes[0][2] > 100);
  });
});

describe("serialHits", () => {
  it("flags S/N and 6-digit serial", () => {
    const ocr = {
      0: [
        { text: "S/N", conf: 90, x0: 0, y0: 0, x1: 20, y1: 10 },
        { text: "750123", conf: 90, x0: 30, y0: 0, x1: 80, y1: 10 },
      ],
    };
    const hits = serialHits(ocr);
    assert.ok(hits.some((h) => /S\/N|750123/i.test(h)));
  });
});

describe("export", () => {
  it("neutral filenames have no date digits pattern forced", () => {
    const n = makeExportName("DEID", 1, 2, "png");
    assert.equal(n, "DEID-001-p2.png");
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(n));
  });
  it("PDF has empty Producer/Author and no text layer keywords beyond structure", () => {
    // Minimal JPEG SOI/EOI stub (invalid image but fine for structure test)
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdf = buildMultiPagePdf([{ bytes: jpeg, width: 10, height: 10 }], 72);
    const text = Buffer.from(pdf).toString("latin1");
    assert.ok(text.startsWith("%PDF"));
    assert.ok(text.includes("/Producer ()"));
    assert.ok(text.includes("/Author ()"));
    assert.ok(text.includes("/CreationDate ()"));
    assert.ok(!text.includes("MuPDF"));
    assert.ok(!text.includes("CHAN TAI MAN"));
  });
});

describe("remainingIdentifiers", () => {
  it("finds leftovers", () => {
    assert.deepEqual(remainingIdentifiers("hello CHAN TAI MAN", ["CHAN TAI MAN", "ZZZ"]), [
      "CHAN TAI MAN",
    ]);
  });
});

describe("fillWhite", () => {
  it("blanks region", () => {
    const img = new ImageData(10, 10);
    img.data.fill(0);
    fillWhite(img, [[2, 2, 5, 5]]);
    const i = (3 * 10 + 3) * 4;
    assert.equal(img.data[i], 255);
  });
});
