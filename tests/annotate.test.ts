import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { handleAnnotate } from "../lib/annotate-handler.ts";
import { gridBoxToPercent } from "../lib/grounding.ts";
import { sniffImageType } from "../lib/image-sniff.ts";
import { parseModelOutput } from "../lib/model-output.ts";

// No test here touches the network: the model API is replaced by a fake fetch.
const FAKE_KEY = "test-key-not-real";
const PNG = new Uint8Array(readFileSync("public/fixtures/floraday.png"));

function form(fields: { image?: Uint8Array | null; notes?: string | null; type?: string }) {
  const f = new FormData();
  if (fields.image !== null) {
    f.set("image", new File([(fields.image ?? PNG) as BlobPart],"shot.png", { type: fields.type ?? "image/png" }));
  }
  if (fields.notes !== null) f.set("notes", fields.notes ?? "the button is easy to miss");
  return new Request("http://localhost/api/annotate", { method: "POST", body: f });
}

function modelReply(content: unknown, init?: ResponseInit) {
  return Response.json(
    { choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }], usage: { prompt_tokens: 10, completion_tokens: 5 } },
    init,
  );
}

function fakeFetch(reply: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return reply();
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("gridBoxToPercent", () => {
  it("converts a 0-1000 [x1,y1,x2,y2] box to percent x/y/width/height", () => {
    const b = gridBoxToPercent([431, 907, 571, 973]);
    assert.ok(Math.abs(b.x - 43.1) < 1e-9);
    assert.ok(Math.abs(b.y - 90.7) < 1e-9);
    assert.ok(Math.abs(b.width - 14) < 1e-9);
    assert.ok(Math.abs(b.height - 6.6) < 1e-9);
  });
});

describe("parseModelOutput", () => {
  it("assigns ids, converts found boxes and keeps not_found null", () => {
    const r = parseModelOutput(
      JSON.stringify({
        annotations: [
          { label: "Button", description: "d", status: "found", box_2d: [431, 907, 571, 973] },
          { label: "Refresh", description: "d", status: "not_found", box_2d: null },
        ],
      }),
    );
    assert.ok(r.ok);
    assert.deepEqual(r.annotations.map((a) => a.id), ["ann-1", "ann-2"]);
    assert.equal(r.annotations[1].box, null);
    assert.equal(r.invalid.length, 0);
  });

  it("reports out-of-range, inverted and malformed boxes instead of repairing them", () => {
    const r = parseModelOutput(
      JSON.stringify({
        annotations: [
          { label: "a", description: "", status: "found", box_2d: [900, 100, 1001, 200] },
          { label: "b", description: "", status: "found", box_2d: [500, 500, 400, 600] },
          { label: "c", description: "", status: "found", box_2d: [1, 2, 3] },
          { label: "d", description: "", status: "found", box_2d: null },
          { label: "ok", description: "", status: "found", box_2d: [100, 100, 200, 200] },
        ],
      }),
    );
    assert.ok(r.ok);
    assert.equal(r.annotations.length, 1);
    assert.equal(r.annotations[0].label, "ok");
    assert.deepEqual(r.invalid.map((i) => i.index), [0, 1, 2, 3]);
  });

  it("fails on non-JSON and on a missing annotations array", () => {
    assert.equal(parseModelOutput("not json").ok, false);
    assert.equal(parseModelOutput("{}").ok, false);
  });
});

describe("sniffImageType", () => {
  it("detects PNG and JPEG by content and rejects others", () => {
    assert.equal(sniffImageType(PNG), "image/png");
    assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
    assert.equal(sniffImageType(new TextEncoder().encode("<svg></svg>")), null);
  });
});

describe("handleAnnotate", () => {
  const ok = { annotations: [{ label: "Button", description: "d", status: "found", box_2d: [431, 907, 571, 973] }] };

  it("returns validated annotations and calls the model once with the key only in the header", async () => {
    const f = fakeFetch(() => modelReply(ok));
    const res = await handleAnnotate(form({}), { apiKey: FAKE_KEY, fetchImpl: f.impl });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.annotations.length, 1);
    assert.equal(body.promptVersion, "annotate.v11");
    assert.equal(f.calls.length, 1);
    const headers = f.calls[0].init.headers as Record<string, string>;
    assert.equal(headers.Authorization, `Bearer ${FAKE_KEY}`);
    assert.ok(!String(f.calls[0].init.body).includes(FAKE_KEY));
    assert.ok(!JSON.stringify(body).includes(FAKE_KEY));
    const sent = JSON.parse(String(f.calls[0].init.body));
    assert.equal(sent.model, "muse-spark-1.3");
  });

  it("sends no sampling temperature unless one is given", async () => {
    const { requestAnnotations } = await import("../lib/meta-client.ts");
    const input = { apiKey: FAKE_KEY, image: { bytes: new Uint8Array([1]), mime: "image/png" }, notes: "n" };
    const without = fakeFetch(() => modelReply(ok));
    await requestAnnotations({ ...input, fetchImpl: without.impl });
    assert.equal("temperature" in JSON.parse(String(without.calls[0].init.body)), false);
    const withT = fakeFetch(() => modelReply(ok));
    await requestAnnotations({ ...input, temperature: 0, fetchImpl: withT.impl });
    assert.equal(JSON.parse(String(withT.calls[0].init.body)).temperature, 0);
  });

  it("rejects bad input before any model call", async () => {
    const f = fakeFetch(() => modelReply(ok));
    const deps = { apiKey: FAKE_KEY, fetchImpl: f.impl };
    assert.equal((await handleAnnotate(form({ image: null }), deps)).status, 400);
    assert.equal((await handleAnnotate(form({ notes: "  " }), deps)).status, 400);
    assert.equal((await handleAnnotate(form({ notes: "x".repeat(4001) }), deps)).status, 400);
    const fake = new TextEncoder().encode("<svg></svg>");
    assert.equal((await handleAnnotate(form({ image: fake, type: "image/png" }), deps)).status, 415);
    assert.equal(f.calls.length, 0);
  });

  it("returns 503 without calling the model when the key is missing", async () => {
    const f = fakeFetch(() => modelReply(ok));
    const res = await handleAnnotate(form({}), { apiKey: undefined, fetchImpl: f.impl });
    assert.equal(res.status, 503);
    assert.equal(f.calls.length, 0);
  });

  it("maps upstream failures without leaking the upstream body or retrying", async () => {
    const f = fakeFetch(() => new Response(`secret echo ${FAKE_KEY}`, { status: 429 }));
    const res = await handleAnnotate(form({}), { apiKey: FAKE_KEY, fetchImpl: f.impl });
    assert.equal(res.status, 502);
    const text = JSON.stringify(await res.json());
    assert.ok(text.includes("429"));
    assert.ok(!text.includes("secret echo"));
    assert.equal(f.calls.length, 1);
  });

  it("returns 504 on timeout and 502 on unusable model output", async () => {
    const timeout = fakeFetch(() => {
      throw new DOMException("timed out", "TimeoutError");
    });
    assert.equal((await handleAnnotate(form({}), { apiKey: FAKE_KEY, fetchImpl: timeout.impl })).status, 504);
    const garbage = fakeFetch(() => modelReply("not json"));
    assert.equal((await handleAnnotate(form({}), { apiKey: FAKE_KEY, fetchImpl: garbage.impl })).status, 502);
  });
});
