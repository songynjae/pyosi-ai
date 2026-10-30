import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_IMAGE_BYTES, validateImageFile } from "../lib/image-validation.ts";

describe("validateImageFile", () => {
  it("accepts PNG and JPEG", () => {
    assert.deepEqual(validateImageFile({ type: "image/png", size: 1000 }), {
      ok: true,
    });
    assert.deepEqual(validateImageFile({ type: "image/jpeg", size: 1000 }), {
      ok: true,
    });
  });

  it("accepts a file of exactly 4 MB and rejects one byte more", () => {
    assert.equal(
      validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES }).ok,
      true,
    );
    const r = validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /too large.*maximum size is 4 MB/);
  });

  it("rejects other image types with a clear message", () => {
    for (const type of ["image/gif", "image/webp", "image/svg+xml"]) {
      const r = validateImageFile({ type, size: 1000 });
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.match(r.message, /PNG or JPEG/);
        assert.ok(r.message.includes(type));
      }
    }
  });

  it("rejects an unknown type and an empty file", () => {
    const unknown = validateImageFile({ type: "", size: 1000 });
    assert.equal(unknown.ok, false);
    const empty = validateImageFile({ type: "image/png", size: 0 });
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.match(empty.message, /empty/);
  });
});
