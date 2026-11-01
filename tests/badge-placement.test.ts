import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  badgeCenterOf,
  badgePlacement,
  circleHitsRect,
  distanceObstacles,
  placeBadges,
  type PlaceItem,
} from "../lib/badge-placement.ts";

describe("badgePlacement", () => {
  it("keeps the corner badge for normal-sized boxes", () => {
    // The Floraday card: 46% x 49%.
    assert.equal(badgePlacement({ x: 27, y: 18, width: 46, height: 49 }), "corner");
    assert.equal(badgePlacement({ x: 10, y: 40, width: 10, height: 10 }), "corner");
  });

  it("puts the badge above a small box", () => {
    // The Google "Create images" icon: about 1.7% wide, 5% high.
    assert.equal(badgePlacement({ x: 52.7, y: 79.4, width: 1.7, height: 5 }), "above");
    assert.equal(badgePlacement({ x: 10, y: 40, width: 30, height: 3 }), "above");
    // The Cursor voice icon: about 6.2% x 8.3% (model box 6.6% x 7.3%).
    assert.equal(badgePlacement({ x: 85.3, y: 45.3, width: 6.2, height: 8.3 }), "above");
    assert.equal(badgePlacement({ x: 85.1, y: 46.4, width: 6.6, height: 7.3 }), "above");
    // A 14% x 6.4% button is also small by height.
    assert.equal(badgePlacement({ x: 43, y: 90, width: 14, height: 6.4 }), "above");
  });

  it("counts one line of text in a wide screenshot as small (the badge would hide its first letter)", () => {
    // A 475 x 55 px disclaimer line in a 1208 x 477 px preview: 39% x 12% of the image, 12% x 0.395 = 4.7% of the width.
    const line = { x: 63, y: 74, width: 39, height: 12 };
    assert.equal(badgePlacement(line), "corner"); // without the aspect: the old rule
    assert.equal(badgePlacement(line, undefined, undefined, 477 / 1208), "above");
    // The same box in a tall image is not small: its height is 12% of the height.
    assert.equal(badgePlacement({ x: 10, y: 10, width: 40, height: 12 }, undefined, undefined, 2), "corner");
    // A big box in a wide image keeps the corner badge (the Floraday card: 46% x 69% of a 2048 x 1124 image).
    assert.equal(badgePlacement({ x: 27, y: 18, width: 46, height: 69 }, undefined, undefined, 1124 / 2048), "corner");
  });

  it("puts the badge below a small box near the top edge", () => {
    assert.equal(badgePlacement({ x: 10, y: 2, width: 2, height: 2 }), "below");
  });
});


// The rule, checked on pixels: where each badge ends up and what it touches.
function badgeSpots(items: PlaceItem[], size: { width: number; height: number }, diameter = 24) {
  const placed = placeBadges(items, size, diameter, (20 * diameter) / 24);
  const px = (b: PlaceItem["box"]) => ({
    x: (b.x / 100) * size.width,
    y: (b.y / 100) * size.height,
    width: (b.width / 100) * size.width,
    height: (b.height / 100) * size.height,
  });
  const obstacles = items.filter((i) => i.kind === "measure").flatMap((i) => distanceObstacles(i, size, diameter / 24));
  return items.map((it) => {
    const c = badgeCenterOf(placed[it.id], px(it.box), diameter, size);
    const r = diameter / 2;
    return {
      id: it.id,
      placement: placed[it.id],
      center: c,
      coversOwnBox: it.kind !== "measure" && circleHitsRect(c.x, c.y, r, px(it.box)),
      coversDistance: it.kind !== "measure" && obstacles.some((o) => circleHitsRect(c.x, c.y, r, o)),
    };
  });
}

describe("placeBadges: no badge covers what the notes talk about", () => {
  const size = { width: 1000, height: 600 };
  // The Floraday gap: a short vertical distance line ends right on top of the "Choose Another Sky" button.
  const gap = { id: "g", box: { x: 49.3, y: 86.8, width: 1.6, height: 4.3 }, kind: "measure" as const, axis: "vertical" as const, value: "4cm" };
  const button = { id: "b", box: { x: 43.1, y: 91, width: 13.9, height: 5.9 } };

  it("never puts a big box's badge on the box itself: it docks outside the top-left corner", () => {
    const card = { id: "c", box: { x: 27, y: 18, width: 46, height: 49 } };
    const [spot] = badgeSpots([card], size);
    assert.equal(spot.placement, "outTopLeft");
    assert.equal(spot.coversOwnBox, false);
  });

  it("keeps the usual side of a small icon-like box when it is free", () => {
    assert.equal(placeBadges([{ id: "i", box: { x: 20, y: 40, width: 4, height: 4 } }], size, 24, 20).i, "above");
  });

  it("docks the badge of a wide, flat box (a line of text, a button) on its top-left corner", () => {
    const line = { id: "l", box: { x: 28, y: 44, width: 61, height: 7 } }; // a chat message
    const [spot] = badgeSpots([line], size);
    assert.equal(spot.placement, "outTopLeft");
    assert.equal(spot.coversOwnBox, false);
    assert.equal(placeBadges([button], size, 24, 20).b, "outTopLeft");
  });

  it("moves a small box's badge off a distance line, even when the other side has no room", () => {
    // The button sits at the bottom edge, so a badge below it would be pushed back onto it.
    const spots = badgeSpots([gap, button], size);
    const b = spots.find((x) => x.id === "b")!;
    assert.equal(b.coversDistance, false);
    assert.equal(b.coversOwnBox, false);
    assert.notEqual(b.placement, "above");
  });

  it("uses the other side when there is room (a text-sized box under a vertical gap)", () => {
    const g = { id: "g", box: { x: 28, y: 29, width: 1.4, height: 2.8 }, kind: "measure" as const, axis: "vertical" as const, value: "16px" };
    const title = { id: "t", box: { x: 26.5, y: 32.6, width: 3.7, height: 1.8 } };
    const b = badgeSpots([g, title], size).find((x) => x.id === "t")!;
    assert.equal(b.placement, "below");
    assert.equal(b.coversDistance, false);
  });

  it("also keeps a badge off the value label of a distance line", () => {
    // A vertical gap at x = 508 px with its label left of the line. A small box just below the gap,
    // centered at x = 487 px, would get its badge on that label (not on the 2 px line).
    const g = { id: "g", box: { x: 50, y: 40, width: 1.6, height: 4 }, kind: "measure" as const, axis: "vertical" as const, value: "4cm" };
    const box = { id: "b", box: { x: 47.2, y: 46, width: 3, height: 4 } };
    assert.equal(badgeSpots([g, box], size).find((x) => x.id === "b")!.coversDistance, false);
    assert.equal(placeBadges([g, box], size, 24, 20).b, "below");
  });

  it("works for a horizontal gap with a small box under the middle of it", () => {
    const g = { id: "g", box: { x: 30, y: 30, width: 40, height: 2 }, kind: "measure" as const, axis: "horizontal" as const, value: "8mm" };
    const box = { id: "b", box: { x: 46, y: 36, width: 8, height: 4 } };
    const b = badgeSpots([g, box], size).find((x) => x.id === "b")!;
    assert.equal(b.placement, "below");
    assert.equal(b.coversDistance, false);
  });

  it("does not stack two badges on the same spot", () => {
    const a = { id: "a", box: { x: 30, y: 30, width: 20, height: 20 } };
    const c = { id: "c", box: { x: 30.5, y: 30.5, width: 20, height: 20 } }; // almost the same box
    const [first, second] = badgeSpots([a, c], size);
    assert.ok(Math.hypot(first.center.x - second.center.x, first.center.y - second.center.y) >= 24);
  });

  it("holds on random scenes with room: no badge on its own box, a distance line, a label or another badge", () => {
    let seed = 777;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const sz = { width: 1000, height: 700 };
    for (let n = 0; n < 300; n++) {
      // One item per cell of a 4 x 3 grid, so items never share an area.
      const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].sort(() => rnd() - 0.5).slice(0, 2 + Math.floor(rnd() * 4));
      const items: PlaceItem[] = cells.map((cell, i) => {
        const cx = (cell % 4) * 25 + 12.5;
        const cy = Math.floor(cell / 4) * 33.3 + 16.6;
        const w = 1.5 + rnd() * 8;
        const h = 1.5 + rnd() * 8;
        const measure = rnd() < 0.4;
        return {
          id: `i${i}`,
          box: { x: cx - w / 2, y: cy - h / 2, width: w, height: h },
          kind: measure ? ("measure" as const) : undefined,
          axis: measure ? (rnd() < 0.5 ? ("horizontal" as const) : ("vertical" as const)) : undefined,
          value: measure && rnd() < 0.7 ? "12px" : undefined,
        };
      });
      const spots = badgeSpots(items, sz);
      for (const spot of spots) {
        const it = items.find((i) => i.id === spot.id)!;
        if (it.kind === "measure") continue;
        assert.equal(spot.coversOwnBox, false, `scene ${n}: ${spot.id} covers its own box`);
        assert.equal(spot.coversDistance, false, `scene ${n}: ${spot.id} covers a distance line or label`);
      }
      for (let a = 0; a < spots.length; a++) {
        for (let b = a + 1; b < spots.length; b++) {
          const d = Math.hypot(spots[a].center.x - spots[b].center.x, spots[a].center.y - spots[b].center.y);
          assert.ok(d >= 24 - 1e-6, `scene ${n}: badges ${spots[a].id} and ${spots[b].id} overlap`);
        }
      }
    }
  });

  it("gives the same placements at any resolution (a property over random scenes)", () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    for (let n = 0; n < 300; n++) {
      const items: PlaceItem[] = [];
      for (let i = 0; i < 1 + Math.floor(rnd() * 3); i++) {
        items.push({ id: `m${i}`, box: { x: 5 + rnd() * 80, y: 5 + rnd() * 80, width: 1 + rnd() * 20, height: 1 + rnd() * 6 }, kind: "measure", axis: rnd() < 0.5 ? "horizontal" : "vertical", value: rnd() < 0.7 ? "4cm" : undefined });
      }
      for (let i = 0; i < 1 + Math.floor(rnd() * 4); i++) {
        items.push({ id: `b${i}`, box: { x: 5 + rnd() * 80, y: 5 + rnd() * 80, width: 2 + rnd() * 16, height: 2 + rnd() * 9 } });
      }
      const base = { width: 700, height: 420 };
      const a = placeBadges(items, base, 24, 20);
      for (const k of [2, 3.5]) {
        const b = placeBadges(items, { width: base.width * k, height: base.height * k }, 24 * k, 20 * k);
        assert.deepEqual(b, a, `scale ${k}, scene ${n}`);
      }
      // Distance lines keep their own rule; no other box is ever given the inside-corner placement.
      for (const it of items) {
        if (it.kind === "measure") assert.equal(a[it.id], badgePlacement(it.box, it.kind, it.axis, base.height / base.width));
        else assert.notEqual(a[it.id], "corner");
      }
    }
  });
});
