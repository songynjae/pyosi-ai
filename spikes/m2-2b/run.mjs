// M2.2-B SPIKE (not production code): one Meta Model API request to check
// connectivity and visual grounding. Isolated from the app; nothing imports it.
//
//   node spikes/m2-2b/run.mjs                        dry run: prints the request shape, sends nothing
//   node spikes/m2-2b/run.mjs --send                 sends exactly ONE request (case "button"), no retries
//   node spikes/m2-2b/run.mjs --case refresh --send  same, for the not_found case
//
// The API key is read from .env.local (MODEL_API_KEY) and is only ever placed
// in the Authorization header. It is never printed or written to disk.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const send = process.argv.includes("--send");
const caseIdx = process.argv.indexOf("--case");
const caseName = caseIdx === -1 ? "button" : process.argv[caseIdx + 1];

const ENDPOINT = "https://api.meta.ai/v1/chat/completions";
const MODEL = "muse-spark-1.3"; // standard mode. NOT -contributor (that tier trains on prompts).
const IMAGE_PATH = resolve(root, "public/fixtures/floraday.png");
const IMAGE = { width: 2048, height: 1124 };

// Ground truth comes from lib/fixtures/floraday.ts. truthPx is [x1, y1, x2, y2] in
// image pixels, or null when the element is not visible (expected status "not_found").
const CASES = {
  button: {
    instruction:
      "Locate the secondary button below the flower card that lets the user pick a different sky.",
    truthPx: [883, 1023, 1169, 1095], // CHOOSE_BUTTON
  },
  refresh: {
    instruction: "Locate the Refresh button on the flower card.", // no such control exists
    truthPx: null,
  },
};
const testCase = CASES[caseName];
if (!testCase) {
  console.error(`Unknown case "${caseName}". Use: ${Object.keys(CASES).join(", ")}`);
  process.exit(1);
}
const INSTRUCTION = testCase.instruction;
const TRUTH_PX = testCase.truthPx;

const SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["found", "ambiguous", "not_found"] },
    label: { type: "string" },
    // [x_min, y_min, x_max, y_max] on a 0-1000 grid, top-left origin; null unless found.
    box_2d: {
      anyOf: [
        { type: "array", items: { type: "integer" }, minItems: 4, maxItems: 4 },
        { type: "null" },
      ],
    },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
  required: ["status", "label", "box_2d", "confidence", "reason"],
};

const PROMPT = [
  "You are looking at a screenshot of a web page. Find the single UI element described below.",
  `Element: ${INSTRUCTION}`,
  "",
  "Return JSON only. Use a 0-1000 grid relative to the image: (0,0) is the top-left corner and (1000,1000) the bottom-right.",
  "box_2d is [x_min, y_min, x_max, y_max] of the whole element, including its border.",
  'Set status to "found" with a box_2d when you can see exactly one matching element.',
  'Set status to "ambiguous" with box_2d null when several elements could match.',
  'Set status to "not_found" with box_2d null when no such element is visible. Do not guess a location.',
  "confidence is 0 to 1. reason is one short sentence.",
].join("\n");

function buildBody(imageB64) {
  return {
    model: MODEL,
    reasoning_effort: "minimal",
    max_completion_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: `data:image/png;base64,${imageB64}` } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "ui_element_location", strict: false, schema: SCHEMA },
    },
  };
}

function iou(a, b) {
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  const inter = Math.max(0, w) * Math.max(0, h);
  const area = (r) => (r[2] - r[0]) * (r[3] - r[1]);
  const union = area(a) + area(b) - inter;
  return union > 0 ? inter / union : 0;
}

const imageBytes = readFileSync(IMAGE_PATH);
const body = buildBody(imageBytes.toString("base64"));
const truthGrid = TRUTH_PX && [
  (TRUTH_PX[0] / IMAGE.width) * 1000,
  (TRUTH_PX[1] / IMAGE.height) * 1000,
  (TRUTH_PX[2] / IMAGE.width) * 1000,
  (TRUTH_PX[3] / IMAGE.height) * 1000,
];

// Request summary with the base64 payload elided.
const summary = {
  endpoint: ENDPOINT,
  ...body,
  messages: body.messages.map((m) => ({
    ...m,
    content: m.content.map((c) =>
      c.type === "image_url"
        ? { type: "image_url", image_url: { url: `data:image/png;base64,<${imageBytes.length} bytes, elided>` } }
        : c,
    ),
  })),
};
console.log("Request:", JSON.stringify(summary, null, 2));
console.log(`Case: ${caseName}`);
console.log(
  "Ground truth (0-1000 grid):",
  truthGrid ? truthGrid.map((v) => Math.round(v)) : "none (expect status not_found, box_2d null)",
);

if (!send) {
  console.log("\nDry run: nothing sent. Re-run with --send to make the single request.");
  process.exit(0);
}

try {
  process.loadEnvFile(resolve(root, ".env.local"));
} catch {
  console.error("Could not load .env.local");
  process.exit(1);
}
const key = process.env.MODEL_API_KEY;
if (!key) {
  console.error("MODEL_API_KEY is empty or missing in .env.local. Nothing sent.");
  process.exit(1);
}

const startedAt = new Date().toISOString();
const t0 = performance.now();
let res;
let text;
try {
  // Single attempt: no retry loop anywhere in this script.
  res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  text = await res.text();
} catch (err) {
  console.error(`Request failed after ${Math.round(performance.now() - t0)} ms: ${err.name}: ${err.message}`);
  process.exit(1);
}
const latencyMs = Math.round(performance.now() - t0);

const headers = Object.fromEntries(
  [...res.headers.entries()].filter(([k]) => /ratelimit|request-id|x-req|retry-after/i.test(k)),
);

let json = null;
try {
  json = JSON.parse(text);
} catch {
  /* non-JSON body, saved raw below */
}

mkdirSync(resolve(root, "spikes/m2-2b/results"), { recursive: true });
const outPath = resolve(root, `spikes/m2-2b/results/${caseName}-${startedAt.replace(/[:.]/g, "-")}.json`);
writeFileSync(
  outPath,
  JSON.stringify({ startedAt, latencyMs, status: res.status, headers, response: json ?? text }, null, 2),
);

console.log(`\nHTTP ${res.status} in ${latencyMs} ms`);
console.log("Headers:", headers);
if (!res.ok || !json) {
  console.log("Body:", json ?? text.slice(0, 1000));
  console.log("Saved:", outPath);
  process.exit(1);
}

const choice = json.choices?.[0];
console.log("finish_reason:", choice?.finish_reason);
console.log("usage:", JSON.stringify(json.usage));
const cost =
  ((json.usage?.prompt_tokens ?? 0) * 1.25 + (json.usage?.completion_tokens ?? 0) * 4.25) / 1e6;
console.log(`Estimated cost (standard rates, ignores caching): $${cost.toFixed(5)}`);

let parsed = null;
try {
  parsed = JSON.parse(choice?.message?.content ?? "");
} catch {
  console.log("Content is not valid JSON:", String(choice?.message?.content).slice(0, 500));
}
if (parsed) {
  console.log("Parsed:", parsed);
  const box = parsed.box_2d;
  if (truthGrid) {
    if (Array.isArray(box) && box.length === 4) {
      console.log("Out of 0-1000 range:", box.some((v) => v < 0 || v > 1000));
      console.log("IoU vs ground truth:", iou(box, truthGrid).toFixed(3));
    }
  } else {
    console.log("Expected not_found with null box:", parsed.status === "not_found" && box === null);
  }
}
console.log("Saved:", outPath);
