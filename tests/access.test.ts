import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACCESS_HEADER, createGuard, createLimiter, findAccessCode, parseAccessCodes } from "../lib/access.ts";
import { handleAnnotate } from "../lib/annotate-handler.ts";
import { pickAccessCode } from "../lib/access-client.ts";

const req = (code?: string) =>
  new Request("http://localhost/api/annotate", { method: "POST", headers: code ? { [ACCESS_HEADER]: code } : {} });
const body = async (r: Response | null) => (r ? ((await r.json()) as { error: { code: string; message: string } }).error : null);

describe("parseAccessCodes", () => {
  it("reads named and unnamed codes and ignores blanks", () => {
    assert.deepEqual(parseAccessCodes("alice:abc, ,xyz ,bob : q1"), [
      { name: "alice", code: "abc" },
      { name: "code-2", code: "xyz" },
      { name: "bob", code: "q1" },
    ]);
    assert.deepEqual(parseAccessCodes(undefined), []);
    assert.deepEqual(parseAccessCodes("  "), []);
  });
  it("matches a code exactly", () => {
    const codes = parseAccessCodes("alice:abc");
    assert.equal(findAccessCode("abc", codes)?.name, "alice");
    assert.equal(findAccessCode("abcd", codes), null);
    assert.equal(findAccessCode("ab", codes), null);
    assert.equal(findAccessCode(null, codes), null);
  });
});

describe("createLimiter", () => {
  it("allows the limit within the window, then says when to retry, then allows again", () => {
    let t = 0;
    const l = createLimiter({ limit: 2, windowMs: 1000, now: () => t });
    assert.equal(l.take("k").ok, true);
    t = 100;
    assert.equal(l.take("k").ok, true);
    t = 200;
    const third = l.take("k");
    assert.equal(third.ok, false);
    if (!third.ok) assert.equal(third.retryAfterSec, 1);
    assert.equal(l.take("other").ok, true);
    t = 1001;
    assert.equal(l.take("k").ok, true);
  });
});

describe("createGuard", () => {
  it("is open in development without codes and with ACCESS_CODES=off", () => {
    assert.equal(createGuard({ NODE_ENV: "development" })(req()), null);
    assert.equal(createGuard({ NODE_ENV: "production", ACCESS_CODES: "off" })(req()), null);
  });
  it("fails closed in production without codes", async () => {
    const r = createGuard({ NODE_ENV: "production" })(req("anything"));
    assert.equal(r?.status, 503);
    assert.equal((await body(r))?.code, "not_configured");
  });
  it("rejects a missing or wrong code and passes a right one", async () => {
    const guard = createGuard({ ACCESS_CODES: "alice:abc,bob:xyz", NODE_ENV: "production" });
    assert.equal(guard(req())?.status, 401);
    assert.equal(guard(req("nope"))?.status, 401);
    assert.equal(guard(req("abc")), null);
    assert.equal(guard(req("xyz")), null);
    const denied = guard(req("nope"));
    assert.match((await body(denied))?.message ?? "", /invitation link/);
  });
  it("limits each code and the whole site", async () => {
    let t = 0;
    const guard = createGuard(
      { ACCESS_CODES: "a:1,b:2", RATE_LIMIT_PER_CODE_PER_HOUR: "2", RATE_LIMIT_TOTAL_PER_DAY: "3" },
      () => t,
    );
    assert.equal(guard(req("1")), null);
    assert.equal(guard(req("1")), null);
    const limited = guard(req("1"));
    assert.equal(limited?.status, 429);
    assert.ok(Number(limited?.headers.get("Retry-After")) > 0);
    assert.equal(guard(req("2")), null); // the other code still has its own allowance (3rd call of the day)
    const day = guard(req("2"));
    assert.equal(day?.status, 429);
    assert.match((await body(day))?.message ?? "", /today/);
    t = 3_600_001; // an hour later the per-code window is free again, the daily total is not
    assert.equal(guard(req("1"))?.status, 429);
  });
});

describe("handleAnnotate with a guard", () => {
  it("returns the guard's response before reading the request", async () => {
    let fetched = 0;
    const res = await handleAnnotate(req("bad"), {
      apiKey: "k",
      guard: createGuard({ ACCESS_CODES: "good" }),
      fetchImpl: (async () => {
        fetched += 1;
        return new Response("{}");
      }) as typeof fetch,
    });
    assert.equal(res.status, 401);
    assert.equal(fetched, 0);
  });
});

describe("pickAccessCode", () => {
  it("prefers the code in the address over the stored one", () => {
    assert.equal(pickAccessCode("?code=abc", "old"), "abc");
    assert.equal(pickAccessCode("", "old"), "old");
    assert.equal(pickAccessCode("?x=1", null), null);
    assert.equal(pickAccessCode("?code=%20abc%20", null), "abc");
    assert.equal(pickAccessCode("?code=", "old"), "old");
  });
});
