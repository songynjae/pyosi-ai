import { createHash, timingSafeEqual } from "node:crypto";

// Access control and a call limit for the public deployment (docs/m6-plan.md, section 2). Server side only.
// Every request must carry a code from ACCESS_CODES (one per tester, so one can be removed alone), and each
// code and the whole site have a call limit. The limits are counted in memory: on a serverless host every
// instance counts for itself, so they are a best-effort brake; the real backstop is the spending limit on
// the model account. Without ACCESS_CODES the route is open in development and refuses everything in
// production ("fail closed"), unless ACCESS_CODES=off.

import { ACCESS_HEADER } from "./access-header.ts";

export { ACCESS_HEADER };

export type AccessCode = { name: string; code: string };

/** "alice:abc123,bob:xyz" or "abc123,xyz". Blank entries are ignored; a code without a name is named by its position. */
export function parseAccessCodes(raw: string | undefined): AccessCode[] {
  if (!raw) return [];
  const out: AccessCode[] = [];
  raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part, i) => {
      const colon = part.indexOf(":");
      const name = colon > 0 ? part.slice(0, colon).trim() : `code-${i + 1}`;
      const code = (colon > 0 ? part.slice(colon + 1) : part).trim();
      if (code) out.push({ name: name || `code-${i + 1}`, code });
    });
  return out;
}

function sameCode(a: string, b: string): boolean {
  // Hash first so the comparison has a fixed length and takes the same time for any input.
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export function findAccessCode(given: string | null, codes: AccessCode[]): AccessCode | null {
  if (!given) return null;
  let found: AccessCode | null = null;
  for (const c of codes) if (sameCode(given, c.code)) found = c;
  return found;
}

type Take = { ok: true } | { ok: false; retryAfterSec: number };

/** A sliding window: at most `limit` calls per key in the last `windowMs`. */
export function createLimiter({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }) {
  const calls = new Map<string, number[]>();
  return {
    take(key: string): Take {
      const t = now();
      const recent = (calls.get(key) ?? []).filter((x) => t - x < windowMs);
      if (recent.length >= limit) {
        calls.set(key, recent);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - t) / 1000)) };
      }
      recent.push(t);
      calls.set(key, recent);
      return { ok: true };
    },
  };
}

function reply(status: number, code: string, message: string, headers?: Record<string, string>) {
  return Response.json({ error: { code, message } }, { status, headers });
}

export type GuardEnv = {
  ACCESS_CODES?: string;
  NODE_ENV?: string;
  RATE_LIMIT_PER_CODE_PER_HOUR?: string;
  RATE_LIMIT_TOTAL_PER_DAY?: string;
};

const positive = (raw: string | undefined, fallback: number) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

/** Returns null when the request may go on, or the error response to send. */
export function createGuard(env: GuardEnv, now: () => number = Date.now): (request: Request) => Response | null {
  const raw = env.ACCESS_CODES?.trim();
  if (raw === "off" || (!raw && env.NODE_ENV !== "production")) return () => null;

  const codes = parseAccessCodes(raw);
  if (codes.length === 0) {
    return () =>
      reply(503, "not_configured", "Access codes are not configured on the server (set ACCESS_CODES, or ACCESS_CODES=off).");
  }

  const perCode = createLimiter({ limit: positive(env.RATE_LIMIT_PER_CODE_PER_HOUR, 30), windowMs: 3_600_000, now });
  const total = createLimiter({ limit: positive(env.RATE_LIMIT_TOTAL_PER_DAY, 400), windowMs: 86_400_000, now });

  return (request) => {
    const match = findAccessCode(request.headers.get(ACCESS_HEADER), codes);
    if (!match) {
      return reply(401, "access_denied", "This demo needs an invitation link. Ask the author for one.");
    }
    for (const [limiter, key, what] of [
      [perCode, match.name, "from this invitation"],
      [total, "all", "to the demo today"],
    ] as const) {
      const r = limiter.take(key);
      if (!r.ok) {
        const minutes = Math.ceil(r.retryAfterSec / 60);
        return reply(429, "rate_limited", `Too many requests ${what}. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`, {
          "Retry-After": String(r.retryAfterSec),
        });
      }
    }
    return null;
  };
}
