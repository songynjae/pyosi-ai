import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreRun, summarizeCase, THRESHOLDS } from "../eval/score.mjs";

const size = { width: 1000, height: 500 };
// A horizontal gap truth: x 100-200, y 100-140 (px of a 1000x500 image).
const expectGap = [{ type: "gap", axis: "horizontal", box: [100, 100, 200, 140] }];
const pct = (x0: number, y0: number, x1: number, y1: number) => ({
  x: (x0 / 1000) * 100,
  y: (y0 / 500) * 100,
  width: ((x1 - x0) / 1000) * 100,
  height: ((y1 - y0) / 500) * 100,
});
const measure = (box: ReturnType<typeof pct>, description = "The gap.") => ({
  id: "a",
  label: "Gap",
  description,
  status: "found",
  kind: "measure",
  axis: "horizontal",
  box,
});
const run = (annotations: unknown[], expect: unknown[] = expectGap, notes = "Check the gap.", invalidCount = 0) =>
  scoreRun({ annotations, invalidCount, expect, notes, size });

describe("scoreRun", () => {
  it("passes an exact gap and reports zero error", () => {
    const r = run([measure(pct(100, 100, 200, 140))]);
    assert.equal(r.pass, true);
    assert.equal(r.gaps[0].edgePct, 0);
  });

  it("measures the edge error as percent of the long side and fails past the limit", () => {
    const near = run([measure(pct(110, 100, 200, 140))]); // 10 px = 1%
    assert.equal(near.pass, true);
    assert.ok(Math.abs(near.gaps[0].edgePct - 1) < 1e-9);
    const far = run([measure(pct(160, 100, 200, 140))]); // 60 px = 6% > limit
    assert.equal(far.pass, false);
    assert.ok(far.gaps[0].edgePct > THRESHOLDS.edgePct);
  });

  it("fails a vertical offset across the line", () => {
    const r = run([measure(pct(100, 160, 200, 200))]); // 60 px lower = 6% of the long side
    assert.equal(r.pass, false);
  });

  it("counts a missing gap, an extra distance line and invalid entries", () => {
    const missing = run([]);
    assert.equal(missing.missing, 1);
    assert.equal(missing.pass, false);
    const extra = run([measure(pct(100, 100, 200, 140)), measure(pct(500, 100, 600, 140), "Another.")]);
    assert.equal(extra.extra, 1);
    assert.equal(extra.pass, false);
    assert.equal(run([measure(pct(100, 100, 200, 140))], expectGap, "Check the gap.", 2).pass, false);
  });

  it("does not match a line of the wrong axis", () => {
    const wrong = { ...measure(pct(100, 100, 200, 140)), axis: "vertical" };
    assert.equal(run([wrong]).missing, 1);
  });

  it("flags repeated descriptions and a question that lost its question mark", () => {
    const two = [{ type: "gap", axis: "horizontal", box: [100, 100, 200, 140] }, { type: "gap", axis: "horizontal", box: [300, 100, 400, 140] }];
    const same = run([measure(pct(100, 100, 200, 140), "Same."), measure(pct(300, 100, 400, 140), "Same.")], two);
    assert.ok(same.problems.includes("repeated description"));
    const q = run([measure(pct(100, 100, 200, 140), "Check it.")], expectGap, "Is the gap right?");
    assert.ok(q.problems.some((p: string) => p.includes("question")));
    assert.equal(run([measure(pct(100, 100, 200, 140), "Is the gap right?")], expectGap, "Is the gap right?").pass, true);
  });

  it("checks plain boxes by region, and that 'nothing' stays empty", () => {
    const plain = { id: "b", label: "Photo", description: "Too large.", status: "found", box: pct(300, 200, 500, 300) };
    assert.equal(run([plain], [{ type: "box", region: [250, 150, 600, 350] }]).pass, true);
    assert.equal(run([plain], [{ type: "box", region: [0, 0, 100, 100] }]).missing, 1);
    assert.equal(run([plain], [{ type: "none" }]).pass, false);
    const notFound = { id: "c", label: "Refresh", description: "Not visible.", status: "not_found", box: null };
    assert.equal(run([notFound], [{ type: "none" }]).pass, true);
  });
});

describe("summarizeCase", () => {
  const ok = { score: { pass: true, entries: 4, invalid: 0, gaps: [{ edgePct: 1 }, { edgePct: 2 }] } };
  const bad = { score: { pass: false, entries: 3, invalid: 1, gaps: [{ edgePct: 5 }] } };

  it("summarizes passes, entry range, stability, invalid and edge error", () => {
    const s = summarizeCase([ok, ok, ok, bad, { requestFailed: true }]);
    assert.equal(s.runs, 5);
    assert.equal(s.failedRequests, 1);
    assert.equal(s.passes, 3);
    assert.deepEqual(s.entryRange, [3, 4]);
    assert.equal(s.stableCount, 0.75);
    assert.equal(s.invalid, 1);
    assert.equal(s.maxEdgePct, 5);
    assert.equal(s.medianEdgePct, 2);
    assert.equal(s.tightShare, 3 / 7);
  });
});
