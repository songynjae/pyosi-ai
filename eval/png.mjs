// Minimal PNG and pixel helpers for the evaluation harness (Node built-ins only).
import { readFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

/** Decodes an 8-bit, non-interlaced RGB or RGBA PNG into { width, height, data: RGBA }. */
export function decodePng(path) {
  const buf = readFileSync(path);
  let pos = 8;
  const idat = [];
  let width = 0;
  let height = 0;
  let depth = 0;
  let ctype = 0;
  let interlace = 0;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const d = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = d.readUInt32BE(0);
      height = d.readUInt32BE(4);
      depth = d[8];
      ctype = d[9];
      interlace = d[12];
    }
    if (type === "IDAT") idat.push(d);
    pos += 12 + len;
  }
  const bpp = ctype === 6 ? 4 : ctype === 2 ? 3 : 0;
  if (!bpp || depth !== 8 || interlace) throw new Error(`Unsupported PNG (${path}): depth ${depth}, type ${ctype}`);
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i];
      const a = i >= bpp ? out[y * stride + i - bpp] : 0;
      const b = y ? out[(y - 1) * stride + i] : 0;
      const c = i >= bpp && y ? out[(y - 1) * stride + i - bpp] : 0;
      let v;
      if (f === 0) v = x;
      else if (f === 1) v = x + a;
      else if (f === 2) v = x + b;
      else if (f === 3) v = x + ((a + b) >> 1);
      else {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      out[y * stride + i] = v & 255;
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = out[i * bpp];
    data[i * 4 + 1] = out[i * bpp + 1];
    data[i * 4 + 2] = out[i * bpp + 2];
    data[i * 4 + 3] = bpp === 4 ? out[i * 4 + 3] : 255;
  }
  return { width, height, data };
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  const sum = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  sum.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, sum]);
};

/** Encodes { width, height, data: RGBA } as an RGB PNG (alpha is dropped). */
export function encodePng({ width, height, data }) {
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const o = y * (width * 3 + 1) + 1 + x * 3;
      rows[o] = data[s];
      rows[o + 1] = data[s + 1];
      rows[o + 2] = data[s + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function blank(width, height, [r, g, b]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

export function fillRect(img, x, y, w, h, [r, g, b]) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const k = (yy * img.width + xx) * 4;
      img.data[k] = r;
      img.data[k + 1] = g;
      img.data[k + 2] = b;
    }
  }
}

/** White padding below, as the app does for very wide images. */
export function padBelow(img, newHeight) {
  const out = blank(img.width, newHeight, [255, 255, 255]);
  out.data.set(img.data, 0);
  return out;
}

/** 2x bilinear upscale (the browser uses its own smoothing; close enough for the model). */
export function upscale2x(img) {
  const out = blank(img.width * 2, img.height * 2, [0, 0, 0]);
  for (let y = 0; y < out.height; y++) {
    const sy = Math.min(Math.max((y + 0.5) / 2 - 0.5, 0), img.height - 1);
    const y0 = Math.floor(sy);
    const y1 = Math.min(y0 + 1, img.height - 1);
    const fy = sy - y0;
    for (let x = 0; x < out.width; x++) {
      const sx = Math.min(Math.max((x + 0.5) / 2 - 0.5, 0), img.width - 1);
      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, img.width - 1);
      const fx = sx - x0;
      for (let c = 0; c < 3; c++) {
        const p = (yy, xx) => img.data[(yy * img.width + xx) * 4 + c];
        const top = p(y0, x0) * (1 - fx) + p(y0, x1) * fx;
        const bottom = p(y1, x0) * (1 - fx) + p(y1, x1) * fx;
        out.data[(y * out.width + x) * 4 + c] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }
  return out;
}

/** Filled circle. */
export function fillCircle(img, cx, cy, r, [cr, cg, cb]) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const k = (y * img.width + x) * 4;
      img.data[k] = cr;
      img.data[k + 1] = cg;
      img.data[k + 2] = cb;
    }
  }
}

/** Diagonal hatch inside a rectangle (a "keep-out" style zone). */
export function hatchRect(img, x, y, w, h, [r, g, b], period = 14, thickness = 4) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if ((xx + yy) % period >= thickness) continue;
      const k = (yy * img.width + xx) * 4;
      img.data[k] = r;
      img.data[k + 1] = g;
      img.data[k + 2] = b;
    }
  }
}

// 5x7 glyphs for the few labels the drawings need.
const GLYPHS = {
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
};

/** Draws a short label (letters and digits in GLYPHS) with its top-left corner at (x, y). */
export function drawLabel(img, text, x, y, scale, color) {
  [...text].forEach((ch, i) => {
    const rows = GLYPHS[ch];
    if (!rows) throw new Error(`No glyph for "${ch}"`);
    rows.forEach((row, gy) => {
      [...row].forEach((bit, gx) => {
        if (bit === "1") fillRect(img, x + (i * 6 + gx) * scale, y + gy * scale, scale, scale, color);
      });
    });
  });
}
