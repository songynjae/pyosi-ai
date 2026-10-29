import {
  MODEL_RESPONSE_SCHEMA,
  PROMPT_VERSION,
  buildPrompt,
} from "./prompts/annotate.ts";

// Server-side only: the caller passes the API key, which is used solely in the
// Authorization header and never logged or returned.
export const META_ENDPOINT = "https://api.meta.ai/v1/chat/completions";
// Standard mode on purpose: the -contributor model trains on prompts and files.
export const META_MODEL = "muse-spark-1.3";
export const REQUEST_TIMEOUT_MS = 60_000;

export type MetaUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
};

export type MetaResult =
  | { ok: true; content: string; usage: MetaUsage | null; latencyMs: number; promptVersion: string }
  | {
      ok: false;
      kind: "timeout" | "network" | "http" | "bad_response";
      status?: number;
      message: string;
    };

export async function requestAnnotations(input: {
  apiKey: string;
  image: { bytes: Uint8Array; mime: string };
  notes: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Sampling temperature. Not sent when undefined (the API default applies); only the evaluation harness sets it. */
  temperature?: number;
}): Promise<MetaResult> {
  const { apiKey, image, notes, fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS, temperature } = input;
  const dataUrl = `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}`;
  const body = {
    model: META_MODEL,
    reasoning_effort: "minimal",
    max_completion_tokens: 4000,
    ...(temperature === undefined ? {} : { temperature }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildPrompt(notes) },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "annotations", strict: false, schema: MODEL_RESPONSE_SCHEMA },
    },
  };

  const t0 = performance.now();
  let res: Response;
  try {
    // One attempt only: no automatic retries.
    res = await fetchImpl(META_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return timedOut
      ? { ok: false, kind: "timeout", message: "The model request timed out." }
      : { ok: false, kind: "network", message: "Could not reach the model API." };
  }
  const latencyMs = Math.round(performance.now() - t0);

  if (!res.ok) {
    // Status only: the upstream body is not forwarded.
    return { ok: false, kind: "http", status: res.status, message: `The model API returned HTTP ${res.status}.` };
  }

  let json: { choices?: { message?: { content?: unknown } }[]; usage?: MetaUsage };
  try {
    json = await res.json();
  } catch {
    return { ok: false, kind: "bad_response", message: "The model API returned a non-JSON body." };
  }
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content === "") {
    return { ok: false, kind: "bad_response", message: "The model API returned no content." };
  }
  return { ok: true, content, usage: json.usage ?? null, latencyMs, promptVersion: PROMPT_VERSION };
}
