import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planUpscale, upscaleImage, type UpscaleDeps } from "../lib/upscale.ts";

const png = (bytes = 10, name = "shot.png") =>
  new File([new Uint8Array(bytes)], name, { type: "image/png" });

function deps(size: { width: number; height: number }, blobBytes: number | null): UpscaleDeps & { rendered: unknown[] } {
  const rendered: unknown[] = [];
  return {
    rendered,
    decode: async () => ({ size, source: "bitmap" }),
    render: async (_s, target) => {
      rendered.push(target);
      return blobBytes === null ? null : new Blob([new Uint8Array(blobBytes)], { type: "image/png" });
    },
  };
}

describe("planUpscale", () => {
  it("doubles images whose long side is under 1400 px", () => {
    assert.deepEqual(planUpscale({ width: 778, height: 580 }), { width: 1556, height: 1160 });
    assert.deepEqual(planUpscale({ width: 750, height: 1399 }), { width: 1500, height: 2798 });
  });

  it("leaves images at or above 1400 px on the long side alone", () => {
    assert.equal(planUpscale({ width: 1668, height: 678 }), null);
    assert.equal(planUpscale({ width: 1400, height: 100 }), null);
    assert.equal(planUpscale({ width: 750, height: 1624 }), null);
  });

  it("ignores invalid sizes", () => {
    assert.equal(planUpscale({ width: 0, height: 100 }), null);
    assert.equal(planUpscale({ width: Number.NaN, height: 100 }), null);
  });
});

describe("upscaleImage", () => {
  it("returns a 2x PNG for a small image", async () => {
    const d = deps({ width: 800, height: 600 }, 5000);
    const out = await upscaleImage(png(10, "a.jpg"), d);
    assert.deepEqual(d.rendered, [{ width: 1600, height: 1200 }]);
    assert.equal(out.type, "image/png");
    assert.equal(out.name, "a-2x.png");
    assert.equal(out.size, 5000);
  });

  it("returns the original file for a large image without rendering", async () => {
    const d = deps({ width: 2048, height: 1124 }, 5000);
    const file = png();
    assert.equal(await upscaleImage(file, d), file);
    assert.equal(d.rendered.length, 0);
  });

  it("falls back to the original when decoding, rendering or the size limit fails", async () => {
    const file = png();
    const failingDecode: UpscaleDeps = { decode: async () => { throw new Error("bad"); }, render: async () => null };
    assert.equal(await upscaleImage(file, failingDecode), file);
    assert.equal(await upscaleImage(file, deps({ width: 100, height: 100 }, null)), file);
    assert.equal(await upscaleImage(file, deps({ width: 100, height: 100 }, 11 * 1024 * 1024)), file);
  });
});
