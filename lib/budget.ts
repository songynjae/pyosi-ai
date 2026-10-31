// A hard cap on the number of model requests for the whole deployment.
// The call limits in lib/access.ts are counted per server instance; this one is a single counter that
// every instance reads and writes (a Netlify Blobs store), so the spending cannot grow past
// TOTAL_REQUEST_CAP requests whatever the access codes or the instance count. The model account itself
// only sends alerts, it does not stop spending.
//
// TOTAL_REQUEST_CAP unset: no cap (local use). Set but the counter cannot be read or written: the request
// is refused (fail closed), because the owner asked for a cap and a silent failure would remove it.
// BUDGET_EPOCH (default "1") is part of the counter's name: change it to start a new count.
// The count is read and then written, so requests that arrive at the same moment can overshoot the cap by a
// few; it is a brake near the cap, not an exact counter.

export type CounterStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
};

/** The environment: reads TOTAL_REQUEST_CAP and BUDGET_EPOCH. */
export type BudgetEnv = Record<string, string | undefined>;

function reply(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

/** Returns a check to call just before each model request: null to go on, or the response to send. */
export function createBudget(
  env: BudgetEnv,
  openStore: () => Promise<CounterStore>,
): () => Promise<Response | null> {
  const raw = env.TOTAL_REQUEST_CAP?.trim();
  if (!raw) return async () => null;
  const cap = Number(raw);
  if (!Number.isInteger(cap) || cap < 0) {
    return async () => reply(503, "not_configured", "TOTAL_REQUEST_CAP must be a whole number (0 or more).");
  }
  const key = `requests-${(env.BUDGET_EPOCH?.trim() || "1").replace(/[^A-Za-z0-9_-]/g, "")}`;

  return async () => {
    try {
      const store = await openStore();
      const stored = await store.get(key);
      const parsed = stored === null ? 0 : Number.parseInt(stored, 10);
      const count = Number.isFinite(parsed) && parsed >= 0 ? parsed : cap; // an unreadable value counts as used up
      if (count >= cap) {
        return reply(503, "budget_exhausted", "This demo's request budget is used up. Please contact the author.");
      }
      await store.set(key, String(count + 1));
      return null;
    } catch {
      return reply(503, "budget_unavailable", "The demo's request counter is unavailable right now. Please try again later.");
    }
  };
}

/** The store on Netlify. Imported on demand so that local runs never load it. */
export async function openNetlifyStore(): Promise<CounterStore> {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: "pyosi-budget", consistency: "strong" });
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
  };
}
