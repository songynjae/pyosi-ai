// The fixed English demo set (see docs/m5-plan.md). Truth boxes are [x0, y0, x1, y1] in
// ORIGINAL image pixels, measured from the pixels (never by eye). Cases whose image is
// private (personal data or third-party branding) live in .eval-private/ and are skipped
// when the file is missing.
import { blank, drawLabel, fillCircle, fillRect, hatchRect } from "./png.mjs";

const BG = [244, 244, 246];
const DARK = [34, 34, 34];

function squaresRow() {
  const img = blank(760, 240, BG);
  const xs = [40, 130, 236, 312, 452, 548];
  for (const x of xs) fillRect(img, x, 98, 44, 44, DARK);
  return img;
}

function tallList() {
  const img = blank(300, 820, BG);
  const ys = [30, 120, 204, 300, 372, 480, 560, 672];
  for (const y of ys) {
    fillRect(img, 40, y, 44, 44, DARK);
    fillRect(img, 110, y + 16, 120, 12, [150, 150, 156]);
  }
  return img;
}

// Hardware drawings (synthetic, scale 10 px = 1 mm). Labels are drawn so the notes can name parts.
function pcbTopView() {
  const img = blank(900, 600, [255, 255, 255]);
  fillRect(img, 40, 40, 820, 520, [58, 128, 88]); // board
  fillRect(img, 200, 200, 180, 180, [30, 30, 35]); // U1 chip
  fillRect(img, 330, 150, 130, 140, [150, 152, 160]); // H1 heat sink
  fillRect(img, 330, 200, 50, 90, [214, 72, 72]); // where H1 overlaps U1
  fillRect(img, 540, 250, 80, 100, [215, 215, 220]); // C3 capacitor
  fillRect(img, 700, 230, 140, 140, [50, 50, 55]); // J1 connector
  drawLabel(img, "U1", 215, 215, 4, [255, 255, 255]);
  drawLabel(img, "H1", 345, 160, 4, [20, 20, 24]);
  drawLabel(img, "C3", 552, 262, 4, [20, 20, 24]);
  drawLabel(img, "J1", 715, 245, 4, [255, 255, 255]);
  return img;
}

function mountingPlate() {
  const img = blank(900, 560, [255, 255, 255]);
  fillRect(img, 60, 60, 780, 440, [200, 204, 212]); // plate
  for (const [x, y] of [[200, 150], [600, 150], [200, 410], [600, 410]]) {
    fillCircle(img, x, y, 26, [60, 62, 70]);
    fillCircle(img, x, y, 22, [255, 255, 255]); // hole
  }
  hatchRect(img, 360, 250, 160, 190, [200, 70, 70]); // keep-out zone
  fillRect(img, 480, 380, 80, 40, [40, 40, 46]); // component that intrudes into the zone
  return img;
}

const gaps = (axis, list) => list.map((box) => ({ type: "gap", axis, box }));

export const CASES = [
  {
    id: "D1",
    title: "Chrome toolbar strip, spacing between icons",
    image: { path: ".eval-private/toolbar.png" },
    notes: "distance between icons - are they located with the correct location?",
    expect: gaps("horizontal", [
      [82, 29, 154, 56],
      [185, 28, 260, 57],
      [291, 28, 328, 59],
      [367, 24, 392, 63],
    ]),
  },
  {
    id: "D2",
    title: "Icon list (Image / Audio / Segment), spacing plus one box",
    image: { path: ".eval-private/d2-original.png" },
    notes: "Check the spacing between each icon, and I'd like the Audio icon reviewed with another image.",
    expect: [
      ...gaps("vertical", [
        [22, 205, 53, 257],
        [22, 289, 53, 340],
      ]),
      { type: "box", region: [21, 257, 54, 289] },
    ],
  },
  {
    id: "D3",
    title: "Floraday, card and button too close",
    image: { path: "public/fixtures/floraday.png" },
    notes: "The result card and the bottom button are too close.",
    expect: gaps("vertical", [[883, 978, 1169, 1023]]),
  },
  {
    id: "D4",
    title: "Floraday, plain box note (no distance line)",
    image: { path: "public/fixtures/floraday.png" },
    notes: "The photo looks too large compared to the text below it.",
    expect: [{ type: "box", region: [550, 198, 1502, 978] }],
  },
  {
    id: "D5",
    title: "Floraday, element that does not exist",
    image: { path: "public/fixtures/floraday.png" },
    notes: "The Refresh button is too far from the title.",
    expect: [{ type: "none" }],
  },
  {
    id: "D6",
    title: "Synthetic row of 6 squares (wide, padded)",
    image: { make: squaresRow },
    notes: "Check the spacing between the squares.",
    expect: gaps("horizontal", [
      [84, 98, 130, 142],
      [174, 98, 236, 142],
      [280, 98, 312, 142],
      [356, 98, 452, 142],
      [496, 98, 548, 142],
    ]),
  },
  {
    id: "D7",
    title: "Synthetic tall list of 8 items",
    image: { make: tallList },
    notes: "Check the spacing between all items in this list.",
    // The row spans the squares and their label bars (x 40-230), so a line anywhere in it is right.
    expect: gaps("vertical", [
      [40, 74, 84, 120],
      [40, 164, 84, 204],
      [40, 248, 84, 300],
      [40, 344, 84, 372],
      [40, 416, 84, 480],
      [40, 524, 84, 560],
      [40, 604, 84, 672],
    ]).map((g) => ({ ...g, crossRange: [40, 230] })),
  },
  {
    id: "D8",
    title: "Floraday, one box note and one spacing note",
    image: { path: "public/fixtures/floraday.png" },
    notes: "The photo is too large, and the gap between the card and the bottom button is too small.",
    expect: [
      { type: "gap", axis: "vertical", box: [883, 978, 1169, 1023] },
      { type: "box", region: [550, 198, 1502, 978] },
    ],
  },
  {
    id: "D9",
    title: "Synthetic PCB top view: clearance between parts and an overlap",
    image: { make: pcbTopView },
    notes: "Check the clearance between C3 and J1, it should be at least 5 mm. Also, H1 seems to overlap U1.",
    expect: [
      { type: "gap", axis: "horizontal", box: [620, 250, 700, 350] },
      { type: "box", region: [200, 150, 460, 380] },
    ],
  },
  {
    id: "D10",
    title: "Synthetic mounting plate: hole spacing and a keep-out zone",
    image: { make: mountingPlate },
    notes: "The spacing between the two top mounting holes should be 40 mm. Please check. Also check whether anything sits inside the red hatched keep-out zone.",
    expect: [
      { type: "gap", axis: "horizontal", box: [226, 124, 574, 176] },
      { type: "box", region: [360, 250, 560, 440] },
    ],
  },
];
