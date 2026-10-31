import type { Annotation } from "../types";

// MANUAL FIXTURE (not model output): annotations for /fixtures/floraday.png,
// a 2048x1124 screenshot of the Floraday page. The pixel boxes are the
// human-measured ground truth from test case 2 of the previous project
// (CM_Case_1_2.png, [x1, y1, x2, y2] in original-image pixels), converted to
// Pyosi's percent boxes below.
export const FLORADAY_IMAGE = {
  src: "/fixtures/floraday.png",
  width: 2048,
  height: 1124,
};

type PixelBox = [number, number, number, number];

export function pixelBoxToPercent(
  [x1, y1, x2, y2]: PixelBox,
  image: { width: number; height: number },
) {
  return {
    x: (x1 / image.width) * 100,
    y: (y1 / image.height) * 100,
    width: ((x2 - x1) / image.width) * 100,
    height: ((y2 - y1) / image.height) * 100,
  };
}

const LILY_CARD: PixelBox = [550, 198, 1502, 978];
const CHOOSE_BUTTON: PixelBox = [883, 1023, 1169, 1095];

export const FLORADAY_ANNOTATIONS: Annotation[] = [
  {
    id: "lily-card",
    label: "Lily card",
    description:
      "The whole flower card (photo, name and message). The photo looks too large relative to the text.",
    status: "found",
    box: pixelBoxToPercent(LILY_CARD, FLORADAY_IMAGE),
  },
  {
    id: "choose-another-sky",
    label: "Choose Another Sky button",
    description:
      "The secondary button under the card. Its outline and grey text make it easy to miss.",
    status: "found",
    box: pixelBoxToPercent(CHOOSE_BUTTON, FLORADAY_IMAGE),
  },
  {
    id: "refresh-button",
    label: "Refresh button",
    description:
      "No refresh control is visible anywhere on the card, so there is no location to mark.",
    status: "not_found",
    box: null,
  },
];
