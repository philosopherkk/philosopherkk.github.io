/**
 * Generate synthetic mock report layouts (fake names/IDs only) as PNG fixtures.
 * Run: node tests/generate-fixtures.mjs
 * Uses OffscreenCanvas when available (Node 22+), else a minimal PNG writer + no text
 * — for Node without canvas we draw via a tiny built-in raster font.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "fixtures-synthetic");

/** Fake identifiers used across all mocks — never real patient data. */
export const FAKE = {
  name: "CHAN TAI MAN",
  hkid: "A123456(7)",
  dob: "01/03/1980",
  date: "14/07/2026",
  time: "15:28:22",
  serial: "750123",
  phone: "91234567",
  clinic: "DEMO EYE CLINIC",
};

/** 5x7 bitmap font for A-Z 0-9 ( ) / : . - */
const FONT = {
  " ": [0, 0, 0, 0, 0],
  A: [0x1e, 0x11, 0x1f, 0x11, 0x11],
  B: [0x1e, 0x11, 0x1e, 0x11, 0x1e],
  C: [0x1f, 0x10, 0x10, 0x10, 0x1f],
  D: [0x1e, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x1e, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x1e, 0x10, 0x10],
  G: [0x1f, 0x10, 0x13, 0x11, 0x1f],
  H: [0x11, 0x11, 0x1f, 0x11, 0x11],
  I: [0x1f, 0x04, 0x04, 0x04, 0x1f],
  J: [0x01, 0x01, 0x01, 0x11, 0x1e],
  K: [0x11, 0x12, 0x1c, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11],
  O: [0x1e, 0x11, 0x11, 0x11, 0x1e],
  P: [0x1e, 0x11, 0x1e, 0x10, 0x10],
  Q: [0x1e, 0x11, 0x11, 0x12, 0x1d],
  R: [0x1e, 0x11, 0x1e, 0x12, 0x11],
  S: [0x1f, 0x10, 0x1f, 0x01, 0x1f],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x1e],
  V: [0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x15, 0x1b, 0x11],
  X: [0x11, 0x0a, 0x04, 0x0a, 0x11],
  Y: [0x11, 0x0a, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x02, 0x04, 0x08, 0x1f],
  "0": [0x1e, 0x13, 0x15, 0x19, 0x1e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x1f],
  "2": [0x1e, 0x01, 0x1e, 0x10, 0x1f],
  "3": [0x1e, 0x01, 0x0e, 0x01, 0x1e],
  "4": [0x11, 0x11, 0x1f, 0x01, 0x01],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x1e],
  "6": [0x1e, 0x10, 0x1e, 0x11, 0x1e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x04],
  "8": [0x1e, 0x11, 0x1e, 0x11, 0x1e],
  "9": [0x1e, 0x11, 0x1f, 0x01, 0x1e],
  "(": [0x04, 0x08, 0x08, 0x08, 0x04],
  ")": [0x08, 0x04, 0x04, 0x04, 0x08],
  "/": [0x01, 0x02, 0x04, 0x08, 0x10],
  ":": [0x00, 0x04, 0x00, 0x04, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x04],
  "-": [0x00, 0x00, 0x1f, 0x00, 0x00],
  "+": [0x00, 0x04, 0x1f, 0x04, 0x00],
};

function createRGB(w, h, fill = 255) {
  const data = new Uint8Array(w * h * 3);
  data.fill(fill);
  return { w, h, data };
}

function setPx(img, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const i = (y * img.w + x) * 3;
  img.data[i] = r;
  img.data[i + 1] = g;
  img.data[i + 2] = b;
}

function fillRect(img, x0, y0, x1, y1, r, g, b) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) setPx(img, x, y, r, g, b);
}

function drawText(img, text, x, y, scale = 2, color = [20, 20, 20]) {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const glyph = FONT[ch] || FONT[" "];
    for (let row = 0; row < 5; row++) {
      const bits = glyph[row] ?? 0;
      for (let col = 0; col < 5; col++) {
        if (bits & (0x10 >> col)) {
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++)
              setPx(img, cx + col * scale + dx, y + row * scale + dy, color[0], color[1], color[2]);
        }
      }
    }
    cx += 6 * scale;
  }
}

function writePNG(img, filePath) {
  const { w, h, data } = img;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    raw.set(data.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  }
  const compressed = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })();
  const crc = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, dataBuf) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(dataBuf.length, 0);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc(Buffer.concat([typeBuf, dataBuf])), 0);
    return Buffer.concat([len, typeBuf, dataBuf, crcBuf]);
  };
  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
}

/** Layout factories: place PHI in header bands matching CROP keep windows. */
const LAYOUTS = {
  topcon(img) {
    const W = img.w;
    const H = img.h;
    fillRect(img, 0, 0, W, Math.floor(H * 0.13), 230, 230, 240);
    drawText(img, "TOPCON MAESTRO MACULA REPORT", 20, 12, 2);
    drawText(img, `NAME ${FAKE.name}`, 20, 40, 2);
    drawText(img, `ID ${FAKE.hkid}`, 20, 62, 2);
    drawText(img, `CAPTURE DATE ${FAKE.date}`, 40, Math.floor(H * 0.175), 2);
    drawText(img, "OD OS SHADOWGRAM", 40, Math.floor(H * 0.25), 2, [0, 80, 40]);
    fillRect(img, 40, Math.floor(H * 0.32), Math.floor(W * 0.45), Math.floor(H * 0.75), 200, 220, 255);
    drawText(img, "THICKNESS 285 UM", 50, Math.floor(H * 0.5), 2, [0, 60, 120]);
    drawText(img, "COMMENTS SIGNATURE", 20, Math.floor(H * 0.96), 2);
  },
  hfa(img) {
    const W = img.w;
    const H = img.h;
    fillRect(img, 0, 0, W, Math.floor(H * 0.13), 240, 235, 220);
    drawText(img, "ZEISS SINGLE FIELD ANALYSIS", 20, 10, 2);
    drawText(img, `PATIENT ${FAKE.name}  HKID ${FAKE.hkid}`, 20, 36, 2);
    drawText(img, `DOB ${FAKE.dob} AGE 46 SEX M`, 20, 56, 2);
    drawText(img, "FIXATION MONITOR GAZE", 30, Math.floor(H * 0.16), 2);
    drawText(img, `DATE ${FAKE.date} TIME ${FAKE.time}`, Math.floor(W * 0.72), Math.floor(H * 0.16), 2);
    drawText(img, "SITA STANDARD THRESHOLD TEST", 30, Math.floor(H * 0.22), 2, [0, 70, 40]);
    drawText(img, "PATTERN DEVIATION", 30, Math.floor(H * 0.4), 2, [0, 60, 100]);
    fillRect(img, 40, Math.floor(H * 0.45), Math.floor(W * 0.5), Math.floor(H * 0.75), 210, 230, 210);
    drawText(img, "MD -2.1 DB", 50, Math.floor(H * 0.55), 2, [0, 80, 40]);
    drawText(img, `CREATED ${FAKE.date} SERIAL 750-12345`, 20, Math.floor(H * 0.9), 2);
  },
  nidek_rs(img) {
    const W = img.w;
    const H = img.h;
    drawText(img, `NAME ${FAKE.name} ID ${FAKE.hkid} DOB ${FAKE.dob}`, 20, 8, 2);
    drawText(img, "OCT SETTING MACULA MAP EYE:R", 20, Math.floor(H * 0.045), 2, [0, 90, 50]);
    fillRect(img, 0, Math.floor(H * 0.082), W, Math.floor(H * 0.12), 245, 230, 230);
    drawText(img, `S/N ${FAKE.serial} VERSION SSI 8 FOCUS`, 20, Math.floor(H * 0.09), 2);
    drawText(img, `EXAM ${FAKE.date}`, Math.floor(W * 0.45), Math.floor(H * 0.09), 2);
    drawText(img, "THICKNESSMAP( ETDRS 9 SECTOR", 20, Math.floor(H * 0.125), 2, [0, 70, 120]);
    fillRect(img, 40, Math.floor(H * 0.2), Math.floor(W * 0.55), Math.floor(H * 0.7), 200, 215, 255);
    drawText(img, "FOVEA MIN 198 SECTOR VOLUME", 50, Math.floor(H * 0.4), 2, [0, 50, 100]);
    drawText(img, "NORMATIVE DATABASE RETINA SCAN", 20, Math.floor(H * 0.92), 2);
  },
  cirrus(img) {
    const W = img.w;
    const H = img.h;
    fillRect(img, 0, 0, W, Math.floor(H * 0.12), 235, 235, 245);
    drawText(img, "CIRRUS HD-OCT ONH AND RNFL", 20, 10, 2);
    drawText(img, `PATIENT ${FAKE.name}  ${FAKE.hkid}`, 20, 36, 2);
    drawText(img, `TECHNICIAN DEMO  ${FAKE.date}`, 40, Math.floor(H * 0.105), 2);
    drawText(img, "RNFL THICKNESS RNFL SYMMETRY", 30, Math.floor(H * 0.2), 2, [0, 70, 40]);
    drawText(img, "SIGNAL STRENGTH 9", 30, Math.floor(H * 0.28), 2, [0, 80, 60]);
    fillRect(img, 40, Math.floor(H * 0.35), Math.floor(W * 0.5), Math.floor(H * 0.7), 220, 210, 255);
    drawText(img, "RNFL QUADRANTS GCL", 50, Math.floor(H * 0.5), 2, [40, 0, 80]);
    drawText(img, "COMMENTS SIGNATURE COPYRIGHT", 20, Math.floor(H * 0.9), 2);
  },
  pentacam_holladay(img) {
    const W = img.w;
    const H = img.h;
    drawText(img, "OCULUS HOLLADAY REPORT EKR65", 20, 10, 2);
    fillRect(img, 0, Math.floor(H * 0.088), Math.floor(W * 0.343), Math.floor(H * 0.233), 250, 240, 240);
    drawText(img, `NAME ${FAKE.name}`, 10, Math.floor(H * 0.1), 2);
    drawText(img, `ID ${FAKE.hkid}`, 10, Math.floor(H * 0.14), 2);
    drawText(img, "EQUIV K READINGS RELATIVE PACHYMETRY", Math.floor(W * 0.4), Math.floor(H * 0.15), 2, [0, 60, 100]);
    fillRect(img, Math.floor(W * 0.4), Math.floor(H * 0.25), Math.floor(W * 0.9), Math.floor(H * 0.8), 210, 230, 250);
    drawText(img, "K1 43.2 K2 44.1", Math.floor(W * 0.45), Math.floor(H * 0.45), 2, [0, 50, 90]);
  },
  pentacam_axl(img) {
    const W = img.w;
    const H = img.h;
    drawText(img, "PENTACAM AXL PLANNING DATE IOL SEQ", 20, 10, 2);
    drawText(img, `PATIENT ${FAKE.name} SURGEON DEMO`, 20, 36, 2);
    drawText(img, `EXAM ${FAKE.date}`, 20, Math.floor(H * 0.12), 2);
    fillRect(img, Math.floor(W * 0.318), Math.floor(H * 0.198), Math.floor(W * 0.682), Math.floor(H * 0.39), 180, 160, 160);
    drawText(img, "EYE PHOTO", Math.floor(W * 0.4), Math.floor(H * 0.28), 2);
    drawText(img, "IOL TORICITY ASTIG RES", 40, Math.floor(H * 0.5), 2, [0, 70, 40]);
    drawText(img, "SOFTWARE PRINTOUT", 20, Math.floor(H * 0.86), 2);
  },
  alscan(img) {
    const W = img.w;
    const H = img.h;
    drawText(img, "NIDEK AL SCAN OPTICAL BIOMETER", 20, 10, 2);
    drawText(img, `NAME ${FAKE.name} ${FAKE.hkid}`, 20, 36, 2);
    drawText(img, "CALCULATION DATE CAMELLIN", 20, Math.floor(H * 0.08), 2);
    drawText(img, "AXL 23.45 K1 43.1", 40, Math.floor(H * 0.3), 2, [0, 60, 90]);
    fillRect(img, 40, Math.floor(H * 0.4), Math.floor(W * 0.6), Math.floor(H * 0.75), 230, 240, 255);
  },
  toric(img) {
    const W = img.w;
    const H = img.h;
    drawText(img, "TECNIS TORIC CALCULATOR", 20, 10, 2);
    drawText(img, `SURGEON NAME DEMO  PATIENT INFORMATION ${FAKE.name}`, 20, 36, 2);
    drawText(img, `DATE ${FAKE.date} AGE 46`, 20, 56, 2);
    drawText(img, "OD OS INCISION LOCATION", 40, Math.floor(H * 0.15), 2);
    drawText(img, "CALCULATED ORIENTATION RESIDUAL REFRACTION", 40, Math.floor(H * 0.35), 2, [0, 70, 40]);
  },
  generic(img) {
    const W = img.w;
    const H = img.h;
    fillRect(img, 0, 0, W, Math.floor(H * 0.12), 240, 240, 240);
    drawText(img, `PATIENT NAME ${FAKE.name} HKID ${FAKE.hkid}`, 20, 20, 2);
    drawText(img, `PHONE ${FAKE.phone} ${FAKE.clinic}`, 20, 48, 2);
    drawText(img, "CLINICAL PANEL OD OS IOP 14", 40, Math.floor(H * 0.3), 2, [0, 70, 40]);
    fillRect(img, 40, Math.floor(H * 0.4), Math.floor(W * 0.7), Math.floor(H * 0.75), 220, 230, 245);
    drawText(img, "VALUE 42.5", 60, Math.floor(H * 0.55), 2, [0, 50, 100]);
  },
};

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const W = 1000;
  const H = 700;
  for (const [name, paint] of Object.entries(LAYOUTS)) {
    const img = createRGB(W, H, 255);
    paint(img);
    const fp = path.join(OUT, `${name}.png`);
    writePNG(img, fp);
    console.log("wrote", fp);
  }
  // Also write a tiny multi-keyword topcon_letter
  {
    const img = createRGB(W, H, 255);
    drawText(img, "PATIENT CODE DEMO OPHTHALMIC SURGERY", 20, 20, 2);
    drawText(img, "CATARACT CENTER FAX 21234567", 20, 48, 2);
    drawText(img, "TOPCON MAESTRO MACULA REPORT", 80, Math.floor(H * 0.3), 2);
    drawText(img, `NAME ${FAKE.name}`, 100, Math.floor(H * 0.32), 2);
    drawText(img, "CAPTURE DATE 14/07/2026 SHADOWGRAM", 100, Math.floor(H * 0.36), 2);
    writePNG(img, path.join(OUT, "topcon_letter.png"));
    console.log("wrote topcon_letter.png");
  }
  fs.writeFileSync(
    path.join(OUT, "README.md"),
    `# Synthetic fixtures only

All images in this folder are **generated mocks** with fake identifiers
(\`${FAKE.name}\`, \`${FAKE.hkid}\`, etc.). They are **not** real patient scans,
clinic reports, or photographs of people.

Regenerate with: \`npm --prefix ci/deid run fixtures\`

\`qr-phi.png\` / UI pipeline mocks use the fake string
\`PATIENT CHAN TAI MAN HKID A123456(7) DOB 01-03-1980\` — not a real patient record.
`
  );
}

main();
