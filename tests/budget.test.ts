import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBudget, type CounterStore } from "../lib/budget.ts";
import { handleAnnotate } from "../lib/annotate-handler.ts";

const fakeStore = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  const store: CounterStore = {
    get: async (k) => data.get(k) ?? null,
    set: async (k, v) => void data.set(k, v),
  };
  return { store, data };
};
const body = async (r: Response | null) => (r ? ((await r.json()) as { error: { code: string } }).error.code : null);

describe("createBudget", () => {
  it("does nothing without TOTAL_REQUEST_CAP and never opens the store", async () => {
    let opened = 0;
    const check = createBudget({}, async () => {
      opened += 1;
      return fakeStore().store;
    });
    assert.equal(await check(), null);
    assert.equal(opened, 0);
  });

  it("counts up to the cap, then refuses", async () => {
    const { store, data } = fakeStore();
    const check = createBudget({ TOTAL_REQUEST_CAP: "3" }, async () => store);
    assert.equal(await check(), null);
    assert.equal(await check(), null);
    assert.equal(await check(), null);
    assert.equal(data.get("requests-1"), "3");
    const refused = await check();
    assert.equal(refused?.status, 503);
    assert.equal(await body(refused), "budget_exhausted");
    assert.equal(data.get("requests-1"), "3"); // a refused request is not counted
  });

  it("a new epoch starts a new count", async () => {
    const { store } = fakeStore({ "requests-1": "5" });
    assert.equal((await createBudget({ TOTAL_REQUEST_CAP: "5" }, async () => store)())?.status, 503);
    assert.equal(await createBudget({ TOTAL_REQUEST_CAP: "5", BUDGET_EPOCH: "2" }, async () => store)(), null);
  });

  it("a cap of 0 refuses everything", async () => {
    assert.equal(await body(await createBudget({ TOTAL_REQUEST_CAP: "0" }, async () => fakeStore().store)()), "budget_exhausted");
  });

  it("fails closed when the store cannot be opened or written, and on an unreadable count", async () => {
    const broken = createBudget({ TOTAL_REQUEST_CAP: "10" }, async () => {
      throw new Error("no site context");
    });
    assert.equal(await body(await broken()), "budget_unavailable");
    const cannotWrite = createBudget({ TOTAL_REQUEST_CAP: "10" }, async () => ({
      get: async () => "1",
      set: async () => {
        throw new Error("write failed");
      },
    }));
    assert.equal(await body(await cannotWrite()), "budget_unavailable");
    const garbage = fakeStore({ "requests-1": "abc" });
    assert.equal(await body(await createBudget({ TOTAL_REQUEST_CAP: "10" }, async () => garbage.store)()), "budget_exhausted");
  });

  it("rejects a cap that is not a whole number", async () => {
    assert.equal(await body(await createBudget({ TOTAL_REQUEST_CAP: "many" }, async () => fakeStore().store)()), "not_configured");
  });
});

describe("handleAnnotate with a budget", () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const form = () => {
    const f = new FormData();
    f.set("image", new File([PNG], "a.png", { type: "image/png" }));
    f.set("notes", "Check it.");
    return f;
  };

  it("does not count a request that fails validation and stops before the model call when over budget", async () => {
    let fetched = 0;
    const fetchImpl = (async () => {
      fetched += 1;
      return new Response("{}");
    }) as typeof fetch;
    let checks = 0;
    const budget = async () => {
      checks += 1;
      return Response.json({ error: { code: "budget_exhausted", message: "x" } }, { status: 503 });
    };
    const bad = await handleAnnotate(new Request("http://x", { method: "POST", body: new FormData() }), { apiKey: "k", fetchImpl, budget });
    assert.equal(bad.status, 400);
    assert.equal(checks, 0);
    const over = await handleAnnotate(new Request("http://x", { method: "POST", body: form() }), { apiKey: "k", fetchImpl, budget });
    assert.equal(over.status, 503);
    assert.equal(checks, 1);
    assert.equal(fetched, 0);
  });
});
