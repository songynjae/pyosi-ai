#!/usr/bin/env node
// Evaluation harness (M5, see docs/m5-plan.md and docs/test-plan.md).
//
//   node --experimental-strip-types scripts/eval.mjs                 dry run: lists the plan and the cost, sends nothing
//   ... --replay .eval/<dir>                                         scores saved raw responses (free)
//   ... --send [--cases D1,D3] [--runs 5]                            LIVE requests (cost; approve first)
//   ... --set contextmark | text | message | plural                                  the ContextMark cases or the text-heavy mock screens instead of D1 to D10
//
// It runs the app's own code on every answer: the request, parseModelOutput, mapping back from the
// padded image, validation and pixel snapping on the original image. The browser's canvas
// resampling is replaced by a plain 2x bilinear copy. Raw responses are saved to
// .eval/<date>-<prompt version>/ (git-ignored) so any failure can be replayed for free.

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseModelOutput } from "../lib/model-output.ts";
import { parseAnnotations } from "../lib/annotation-schema.ts";
import { mapAnnotationsFromPadded, planPad } from "../lib/pad-aspect.ts";
import { planUpscale } from "../lib/upscale.ts";
import { refineAnnotations } from "../lib/refine-gap.ts";
import { requestAnnotations } from "../lib/meta-client.ts";
import { PROMPT_VERSION } from "../lib/prompts/annotate.ts";
import { CASES as DISTANCE_CASES } from "../eval/cases.mjs";
import { CM_CASES } from "../eval/cases-contextmark.mjs";
import { TEXT_CASES } from "../eval/cases-text.mjs";
import { MESSAGE_CASES } from "../eval/cases-message.mjs";
import { PLURAL_CASES } from "../eval/cases-plural.mjs";
import { decodePng, encodePng, padBelow, upscale2x } from "../eval/png.mjs";
import { THRESHOLDS, caseVerdict, scoreRun, summarizeCase } from "../eval/score.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);

const send = flag("--send");
const replayDir = value("--replay", null);
const runs = Number(value("--runs", 5));
const only = value("--cases", null)?.split(",");
// --set contextmark: the converted ContextMark cases (plain box notes, ambiguous and missing elements)
const setName = value("--set", "distance");
if (!["distance", "contextmark", "text", "message", "plural"].includes(setName)) throw new Error(`Unknown --set ${setName} (distance, contextmark, text, message or plural)`);
const isCm = setName !== "distance"; // the sets scored by overlap (IoU) instead of gap edges
const CASES = { distance: DISTANCE_CASES, contextmark: CM_CASES, text: TEXT_CASES, message: MESSAGE_CASES, plural: PLURAL_CASES }[setName];
const stamp = new Date().toISOString().slice(0, 10);
const outDir = resolve(root, value("--out", replayDir ?? `.eval/${stamp}-${PROMPT_VERSION}`));
const COST_PER_REQUEST = 0.005;
const temperature = argv.includes("--temperature") ? Number(value("--temperature")) : undefined;

function loadCase(c) {
  if (c.image.make) return c.image.make();
  const path = resolve(root, c.image.path);
  return existsSync(path) ? decodePng(path) : null;
}

/** What the app would send: pad below if very wide, then 2x if small. */
function prepare(original) {
  const size = { width: original.width, height: original.height };
  const pad = planPad(size);
  let img = pad ? padBelow(original, pad.height) : original;
  if (planUpscale(size)) img = upscale2x(img);
  return { pad, sent: img, bytes: new Uint8Array(encodePng(img)) };
}

function processContent(content, original, pad) {
  const size = { width: original.width, height: original.height };
  const parsed = parseModelOutput(content);
  if (!parsed.ok) return { annotations: [], invalidCount: 1, error: parsed.message, size };
  const mapped = pad ? mapAnnotationsFromPadded(parsed.annotations, pad) : parsed.annotations;
  const again = parseAnnotations(mapped);
  const refined = refineAnnotations(again.annotations, original);
  return { annotations: refined, invalidCount: parsed.invalid.length + again.invalid.length, size };
}

function apiKey() {
  const env = readFileSync(resolve(root, ".env.local"), "utf8");
  const key = env.match(/^MODEL_API_KEY=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!key) throw new Error("MODEL_API_KEY is not set in .env.local");
  return key;
}

const cases = CASES.filter((c) => !only || only.includes(c.id));
const prepared = cases.map((c) => {
  const original = loadCase(c);
  return { c, original, ...(original ? prepare(original) : {}) };
});

if (temperature !== undefined) console.log(`Sampling temperature: ${temperature} (set by --temperature; the app does not send one)`);
console.log(`Prompt ${PROMPT_VERSION} | cases: ${cases.map((c) => c.id).join(", ")} | runs per case: ${runs}`);
console.log("");
for (const p of prepared) {
  if (!p.original) {
    console.log(`${p.c.id.padEnd(3)} SKIPPED (image not found: ${p.c.image.path})  ${p.c.title}`);
    continue;
  }
  const sentSize = `${p.sent.width}x${p.sent.height}`;
  console.log(
    `${p.c.id.padEnd(3)} original ${p.original.width}x${p.original.height}  sends ${sentSize}${p.pad ? " (padded below)" : ""}  expects ${p.c.expect.length}  ${p.c.title}`,
  );
}
const ready = prepared.filter((p) => p.original);
const requests = ready.length * runs;
console.log("");
if (!send && !replayDir) {
  console.log(`DRY RUN: nothing was sent. A live run would make ${requests} requests, about $${(requests * COST_PER_REQUEST).toFixed(2)}.`);
  console.log("Re-run with --send to spend that (needs the owner's approval), or --replay <dir> to score saved responses.");
  process.exit(0);
}
if (send) {
  console.log(`LIVE: ${requests} requests, about $${(requests * COST_PER_REQUEST).toFixed(2)}. Raw responses go to ${outDir}`);
  mkdirSync(outDir, { recursive: true });
}

const key = send ? apiKey() : null;
const results = [];
for (const p of ready) {
  const caseRuns = [];
  for (let k = 1; k <= runs; k++) {
    const file = resolve(outDir, `${p.c.id}-run${k}.json`);
    let content = null;
    let note = null;
    if (send) {
      const res = await requestAnnotations({ apiKey: key, image: { bytes: p.bytes, mime: "image/png" }, notes: p.c.notes, temperature });
      writeFileSync(file, JSON.stringify(res.ok ? { content: res.content, usage: res.usage, latencyMs: res.latencyMs, promptVersion: res.promptVersion } : { error: res.message }, null, 1));
      if (res.ok) content = res.content;
      else note = res.message;
    } else if (existsSync(file)) {
      const saved = JSON.parse(readFileSync(file, "utf8"));
      content = saved.content ?? null;
      note = saved.error ?? null;
    } else {
      continue;
    }
    if (content === null) {
      caseRuns.push({ requestFailed: true, note });
      continue;
    }
    const r = processContent(content, p.original, p.pad);
    caseRuns.push({ score: scoreRun({ annotations: r.annotations, invalidCount: r.invalidCount, expect: p.c.expect, notes: p.c.notes, size: r.size }) });
  }
  results.push({ c: p.c, runs: caseRuns, summary: summarizeCase(caseRuns) });
}

const pct = (v) => (v === null || v === undefined ? "-" : `${v.toFixed(1)}%`);
console.log("");
if (isCm) console.log("case   pass   entries  invalid  median IoU  IoU>=0.7  failures");
else console.log("case  pass     entries  stable  invalid  median edge  max edge  tight  case  failures");
let totalRuns = 0;
let totalPass = 0;
for (const r of results) {
  const s = r.summary;
  totalRuns += s.runs;
  totalPass += s.passes;
  const reasons = [...new Set(r.runs.filter((x) => x.score && !x.score.pass).flatMap((x) => x.score.problems))].slice(0, 3).join("; ");
  const verdict = caseVerdict(s);
  if (isCm) {
    console.log(
      `${r.c.id.padEnd(6)} ${`${s.passes}/${s.runs}`.padEnd(6)} ${(s.entryRange ? s.entryRange.join("-") : "-").padEnd(8)} ${String(s.invalid).padEnd(8)} ${(s.medianIou === null ? "-" : s.medianIou.toFixed(2)).padEnd(11)} ${(s.goodShare === null ? "-" : (s.goodShare * 100).toFixed(0) + "%").padEnd(9)} ${reasons}${s.failedRequests ? `${reasons ? " | " : ""}${s.failedRequests} request(s) failed` : ""}`,
    );
    continue;
  }
  console.log(
    `${r.c.id.padEnd(5)} ${`${s.passes}/${s.runs}`.padEnd(8)} ${(s.entryRange ? s.entryRange.join("-") : "-").padEnd(8)} ${(s.stableCount * 100).toFixed(0).padStart(3)}%    ${String(s.invalid).padEnd(8)} ${pct(s.medianEdgePct).padEnd(12)} ${pct(s.maxEdgePct).padEnd(9)} ${(s.tightShare === null ? "-" : (s.tightShare * 100).toFixed(0) + "%").padEnd(6)} ${(verdict.ok ? "OK" : "FAIL").padEnd(5)} ${reasons}${s.failedRequests ? `${reasons ? " | " : ""}${s.failedRequests} request(s) failed` : ""}`,
  );
}
const overall = totalRuns ? totalPass / totalRuns : 0;
console.log("");
if (isCm) {
  console.log(`Overall: ${totalPass}/${totalRuns} runs pass (${(overall * 100).toFixed(0)}%). No bar is applied to this set yet (thresholds are drafts: docs/test-plan.md sections 5 and 6).`);
  if (flag("--report")) console.log("--report is not used for the contextmark set (add the result to docs/eval-log.md by hand after review).");
  process.exit(0);
}
console.log(`Overall: ${totalPass}/${totalRuns} runs pass (${(overall * 100).toFixed(0)}%), bar ${(THRESHOLDS.overallPassRate * 100).toFixed(0)}% overall and ${(THRESHOLDS.casePassRate * 100).toFixed(0)}% per demo case (draft: docs/m5-plan.md).`);
const failing = results.filter((r) => !caseVerdict(r.summary).ok);
console.log(`Cases meeting the bar: ${results.length - failing.length}/${results.length}. The bar per case: >= ${THRESHOLDS.casePassRate * 100}% of runs pass, median edge error <= ${THRESHOLDS.medianEdgePct}%, entry count stable in >= ${THRESHOLDS.stability * 100}% of runs.`);
for (const r of failing) console.log(`  ${r.c.id}: ${caseVerdict(r.summary).reasons.join("; ")}`);
console.log(overall >= THRESHOLDS.overallPassRate && failing.length === 0 ? "RESULT: bar met." : "RESULT: bar NOT met.");

if (flag("--report")) {
  const sha = execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim();
  const rows = results.map((r) => `| ${r.c.id} | ${r.summary.passes}/${r.summary.runs} | ${r.summary.entryRange ? r.summary.entryRange.join("-") : "-"} | ${r.summary.invalid} | ${pct(r.summary.medianEdgePct)} | ${pct(r.summary.maxEdgePct)} |`).join("\n");
  appendFileSync(
    resolve(root, "docs/eval-log.md"),
    `\n## ${stamp}, prompt ${PROMPT_VERSION}, commit ${sha}${send ? "" : " (replay)"}\nOverall ${totalPass}/${totalRuns} runs pass. Raw responses: ${outDir.replace(root + "/", "")} (git-ignored).\n\n| case | pass | entries | invalid | median edge | max edge |\n|---|---|---|---|---|---|\n${rows}\n`,
  );
  console.log("Report appended to docs/eval-log.md");
}
