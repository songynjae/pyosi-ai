import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickDroppedFile, pickImageFile, pickPastedImage } from "../lib/dropped-file.ts";

const f = (name: string, type: string) => new File(["x"], name, { type });

describe("pickDroppedFile", () => {
  it("returns the first file of any type, or undefined when empty", () => {
    const pdf = f("a.pdf", "application/pdf");
    assert.equal(pickDroppedFile([pdf, f("b.png", "image/png")]), pdf);
    assert.equal(pickDroppedFile([]), undefined);
    assert.equal(pickDroppedFile(null), undefined);
  });
});

describe("pickImageFile", () => {
  it("returns the first image, skipping other files", () => {
    const png = f("image.png", "image/png");
    assert.equal(pickImageFile([f("a.txt", "text/plain"), png]), png);
  });

  it("returns undefined for text pastes and empty clipboards", () => {
    assert.equal(pickImageFile([f("a.txt", "text/plain")]), undefined);
    assert.equal(pickImageFile([]), undefined);
    assert.equal(pickImageFile(undefined), undefined);
  });
});

describe("pickPastedImage", () => {
  const item = (kind: string, type: string, file: File | null) => ({ kind, type, getAsFile: () => file });

  it("prefers files, then falls back to file items", () => {
    const png = f("image.png", "image/png");
    assert.equal(pickPastedImage({ files: [png], items: [] }), png);
    assert.equal(pickPastedImage({ files: [], items: [item("file", "image/png", png)] }), png);
  });

  it("ignores text items, non-image files and missing data", () => {
    assert.equal(pickPastedImage({ files: [], items: [item("string", "text/plain", null)] }), undefined);
    assert.equal(pickPastedImage({ files: [], items: [item("file", "application/pdf", f("a.pdf", "application/pdf"))] }), undefined);
    assert.equal(pickPastedImage({ files: [], items: [item("file", "image/png", null)] }), undefined);
    assert.equal(pickPastedImage(null), undefined);
  });
});
