import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAnnotations } from "../lib/annotation-schema.ts";
import {
  FLORADAY_ANNOTATIONS,
  FLORADAY_IMAGE,
  pixelBoxToPercent,
} from "../lib/fixtures/floraday.ts";

describe("fixtures", () => {
  it("the Floraday fixture passes validation with no invalid entries", () => {
    const { annotations, invalid } = parseAnnotations(FLORADAY_ANNOTATIONS);
    assert.equal(invalid.length, 0);
    assert.equal(annotations.length, FLORADAY_ANNOTATIONS.length);
  });

  it("has at least two found annotations and one without a location", () => {
    const found = FLORADAY_ANNOTATIONS.filter((a) => a.status === "found");
    assert.ok(found.length >= 2);
    assert.ok(FLORADAY_ANNOTATIONS.some((a) => a.box === null));
  });

  it("converts the measured pixel boxes to percentages", () => {
    const button = FLORADAY_ANNOTATIONS.find(
      (a) => a.id === "choose-another-sky",
    )?.box;
    assert.ok(button);
    const expected = pixelBoxToPercent([883, 1023, 1169, 1095], FLORADAY_IMAGE);
    assert.deepEqual(button, expected);
    // 883/2048, 1023/1124, 286/2048, 72/1124 of the image
    assert.ok(Math.abs(button.x - 43.115) < 0.001);
    assert.ok(Math.abs(button.y - 91.014) < 0.001);
    assert.ok(Math.abs(button.width - 13.965) < 0.001);
    assert.ok(Math.abs(button.height - 6.406) < 0.001);
  });
});
