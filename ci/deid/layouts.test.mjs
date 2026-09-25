/**
 * Per-layout detection smoke from synthetic keyword strings (no images).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectDevice } from "../../deid/core/detect.js";
import { CROP } from "../../deid/core/rules.js";

const SAMPLES = {
  alscan: "NIDEK AL SCAN Optical Biometer Calculation Date Camellin",
  pentacam_holladay: "Holladay Report EKR65 Equiv K Readings Relative Pachymetry",
  topcon: "TOPCON Macula Report Maestro Shadowgram Capture Date",
  hfa: "Single Field Analysis Threshold Test SITA Standard Zeiss Fixation Monitor Pattern Deviation",
  pentacam_axl: "Pentacam AXL Planning Date IOL Seq Refraction Seq IOL Toricity Printout",
  pentacam_screen: "Corneal Power Distribution Exam Info Zone Dia Power Calculations",
  pentacam_cataract: "Cataract Pre Op Exam Info Segment Thinnest Pachy Vertex",
  nidek_rs: "OCT Setting Macula Map ETDRS 9 Sector Sector Volume Normative Database Retina Scan SSI",
  cirrus: "Cirrus ONH and RNFL RNFL Thickness Ganglion Cell Signal Strength RNFL Quadrants",
  topcon_letter: "Patient Code Ophthalmic Surgery Cataract Center Fax Topcon Macula Report Maestro",
  toric: "Tecnis Surgeon Name Patient Information Incision Location Calculated Orientation Residual Refraction",
};

describe("all device keyword samples", () => {
  for (const [dev, text] of Object.entries(SAMPLES)) {
    it(`detects ${dev}`, () => {
      assert.equal(detectDevice(text), dev);
      assert.ok(CROP[dev], "crop rule exists");
    });
  }
});
