import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoxSchema, parseAnnotations } from "../lib/annotation-schema.ts";
import { mapAnnotationsFromPadded, mapBoxFromPadded, planPad } from "../lib/pad-aspect.ts";
import { prepareImage, type UpscaleDeps } from "../lib/upscale.ts";

const png = (bytes = 10, name = "bar.png") =>
  new File([new Uint8Array(bytes)], name, { type: "image/png" });

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);
}

describe("planPad", () => {
  it("pads a very wide image to 2:1, below only", () => {
    // The Chrome toolbar strip from the experiments: 724x210 (3.45:1).
    const plan = planPad({ width: 724, height: 210 });
    assert.deepEqual(plan, {
      original: { width: 724, height: 210 },
      width: 724,
      height: 362,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("leaves normal and tall images alone", () => {
    assert.equal(planPad({ width: 2048, height: 1124 }), null); // Floraday, 1.8:1
    assert.equal(planPad({ width: 1668, height: 678 }), null); // 2.46:1
    assert.equal(planPad({ width: 750, height: 1624 }), null);
    assert.equal(planPad({ width: 400, height: 1600 }), null); // tall: untested, not padded
    assert.equal(planPad({ width: 1000, height: 400 }), null); // exactly 2.5:1
  });

  it("pads just above the limit and ignores invalid sizes", () => {
    assert.ok(planPad({ width: 1001, height: 400 }));
    assert.equal(planPad({ width: 0, height: 100 }), null);
    assert.equal(planPad({ width: Number.NaN, height: 100 }), null);
  });
});

describe("mapBoxFromPadded", () => {
  const plan = planPad({ width: 724, height: 210 })!;

  it("maps a box in the padded image back to the original", () => {
    // Original box x 100-200, y 50-100 px; the padded image is 362 px tall with the original at the top.
    const padded = { x: (100 / 724) * 100, y: (50 / 362) * 100, width: (100 / 724) * 100, height: (50 / 362) * 100 };
    const back = mapBoxFromPadded(padded, plan);
    near(back.x, (100 / 724) * 100);
    near(back.y, (50 / 210) * 100);
    near(back.width, (100 / 724) * 100);
    near(back.height, (50 / 210) * 100);
  });

  it("maps the whole padded image onto more than the original (the padding falls below 100)", () => {
    const full = mapBoxFromPadded({ x: 0, y: 0, width: 100, height: 100 }, plan);
    near(full.y, 0);
    near(full.height, (362 / 210) * 100);
  });

  it("is the identity in x for a wide image", () => {
    near(mapBoxFromPadded({ x: 12.5, y: 50, width: 7, height: 4 }, plan).x, 12.5);
  });
});

describe("mapAnnotationsFromPadded", () => {
  const plan = planPad({ width: 724, height: 210 })!;
  const ok = { id: "a", label: "L", description: "d", status: "found" };

  it("maps boxes, passes everything else through and keeps other fields", () => {
    const out = mapAnnotationsFromPadded(
      [
        { ...ok, kind: "measure", axis: "horizontal", value: "8mm", box: { x: 10, y: 50, width: 5, height: 10 } },
        { ...ok, id: "b", status: "not_found", box: null },
        "junk",
      ],
      plan,
    ) as Record<string, unknown>[];
    assert.equal(out[0].kind, "measure");
    assert.equal(out[0].value, "8mm");
    near((out[0].box as { x: number }).x, 10);
    assert.equal(out[1].box, null);
    assert.equal(out[2], "junk" as unknown as Record<string, unknown>);
    assert.equal(mapAnnotationsFromPadded("nope", plan), "nope");
  });

  it("a box inside the original passes validation, one in the padding is reported, not clamped", () => {
    const inside = { x: 10, y: (50 / 362) * 100, width: 5, height: (30 / 362) * 100 };
    const inPadding = { x: 10, y: (250 / 362) * 100, width: 5, height: (20 / 362) * 100 }; // in the white below the original
    const mapped = mapAnnotationsFromPadded(
      [
        { ...ok, box: inside },
        { ...ok, id: "b", box: inPadding },
      ],
      plan,
    );
    const parsed = parseAnnotations(mapped);
    assert.equal(parsed.annotations.length, 1);
    assert.equal(parsed.invalid.length, 1);
    assert.ok(BoxSchema.safeParse(parsed.annotations[0].box).success);
  });
});

describe("prepareImage", () => {
  type Call = { size: { width: number; height: number }; placement?: { x: number; y: number; width: number; height: number } };
  function deps(size: { width: number; height: number }, blobBytes: number | null): UpscaleDeps & { calls: Call[] } {
    const calls: Call[] = [];
    return {
      calls,
      decode: async () => ({ size, source: "bitmap" }),
      render: async (_s, target, placement) => {
        calls.push({ size: target, placement });
        return blobBytes === null ? null : new Blob([new Uint8Array(blobBytes)], { type: "image/png" });
      },
    };
  }

  it("pads and upscales a small wide strip in one drawing step", async () => {
    const d = deps({ width: 724, height: 210 }, 5000);
    const out = await prepareImage(png(10, "toolbar.png"), d);
    assert.equal(d.calls.length, 1);
    assert.deepEqual(d.calls[0].size, { width: 1448, height: 724 });
    assert.deepEqual(d.calls[0].placement, { x: 0, y: 0, width: 1448, height: 420 });
    assert.equal(out.file.name, "toolbar-padded-2x.png");
    assert.equal(out.file.type, "image/png");
    assert.ok(out.pad);
    assert.equal(out.pad?.height, 362);
  });

  it("pads a large wide image without upscaling it", async () => {
    const d = deps({ width: 3000, height: 800 }, 5000);
    const out = await prepareImage(png(), d);
    assert.deepEqual(d.calls[0].size, { width: 3000, height: 1500 });
    assert.deepEqual(d.calls[0].placement, { x: 0, y: 0, width: 3000, height: 800 });
    assert.equal(out.file.name, "bar-padded.png");
  });

  it("upscales a small normal image with no padding, as before", async () => {
    const d = deps({ width: 800, height: 600 }, 5000);
    const out = await prepareImage(png(), d);
    assert.deepEqual(d.calls[0].size, { width: 1600, height: 1200 });
    assert.equal(d.calls[0].placement, undefined);
    assert.equal(out.pad, null);
    assert.equal(out.file.name, "bar-2x.png");
  });

  it("sends a large normal image unchanged", async () => {
    const d = deps({ width: 2048, height: 1124 }, 5000);
    const file = png();
    const out = await prepareImage(file, d);
    assert.equal(out.file, file);
    assert.equal(out.pad, null);
    assert.equal(d.calls.length, 0);
  });

  it("falls back to the original file, without padding, on any failure", async () => {
    const file = png();
    const failed = await prepareImage(file, { decode: async () => { throw new Error("bad"); }, render: async () => null });
    assert.equal(failed.file, file);
    assert.equal(failed.pad, null);
    const nullRender = await prepareImage(file, deps({ width: 724, height: 210 }, null));
    assert.equal(nullRender.file, file);
    assert.equal(nullRender.pad, null);
    const tooBig = await prepareImage(file, deps({ width: 724, height: 210 }, 11 * 1024 * 1024));
    assert.equal(tooBig.file, file);
    assert.equal(tooBig.pad, null);
  });
});
