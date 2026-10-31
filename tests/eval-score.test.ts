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
    // "absent": the named element must be not_found, no distance line, other boxes are fine.
    const title = { id: "t", label: "Title", description: "The title.", status: "found", box: pct(300, 20, 600, 60) };
    const missingButton = { id: "m", label: "Refresh button", description: "Not visible.", status: "not_found", box: null };
    assert.equal(run([missingButton, title], [{ type: "absent" }]).pass, true);
    assert.equal(run([title], [{ type: "absent" }]).pass, false);
    assert.equal(run([missingButton, measure(pct(100, 100, 200, 140))], [{ type: "absent" }]).pass, false);
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

describe("unitsNotKept and caseVerdict", () => {
  it("finds numbers with a unit from the notes that the answer lost", async () => {
    const { unitsNotKept } = await import("../eval/score.mjs");
    const kept = [{ label: "Gap", description: "Should be at least 5 mm.", value: "5mm" }];
    assert.deepEqual(unitsNotKept("Check it, at least 5 mm.", kept), []);
    assert.deepEqual(unitsNotKept("Check it, at least 5 mm.", [{ label: "Gap", description: "Check it." }]), ["5mm"]);
    assert.deepEqual(unitsNotKept("Is it 24px or 1.5 rem?", [{ description: "Is it 24 PX?" }]), ["1.5rem"]);
    assert.deepEqual(unitsNotKept("No numbers here.", []), []);
  });

  it("a case meets the bar only with enough passing runs, small median error and a stable count", async () => {
    const { caseVerdict } = await import("../eval/score.mjs");
    const good = { runs: 5, passes: 5, medianEdgePct: 0.5, stableCount: 1 };
    assert.equal(caseVerdict(good).ok, true);
    assert.equal(caseVerdict({ ...good, passes: 3 }).ok, false);
    assert.equal(caseVerdict({ ...good, medianEdgePct: 2.4 }).ok, false);
    assert.equal(caseVerdict({ ...good, stableCount: 0.6 }).ok, false);
    assert.equal(caseVerdict({ ...good, medianEdgePct: null }).ok, true);
    assert.equal(caseVerdict({ runs: 0, passes: 0, medianEdgePct: null, stableCount: 0 }).ok, false);
  });
});

describe("scoreRun with located and ambiguous expectations (cases of the previous project)", () => {
  const found = (label: string, box: ReturnType<typeof pct>, status = "found") => ({
    id: label,
    label,
    description: `${label}.`,
    status,
    box: status === "found" ? box : null,
  });
  const target = (x0: number, y0: number, x1: number, y1: number) => ({ type: "target", box: [x0, y0, x1, y1] });

  it("hits a box that overlaps the truth enough and reports its IoU", () => {
    const r = run([found("A", pct(100, 100, 200, 200))], [target(100, 100, 200, 200)]);
    assert.equal(r.pass, true);
    assert.equal(r.targets[0].iou, 1);
    assert.equal(r.targets[0].good, true);
  });

  it("fails when the box overlaps less than the hit threshold", () => {
    // Truth 100x100, box shifted by 60 px: intersection 40x100, union 16000 -> IoU 0.25.
    const r = run([found("A", pct(160, 100, 260, 200))], [target(100, 100, 200, 200)]);
    assert.equal(r.pass, false);
    assert.ok(r.targets[0].iou < THRESHOLDS.iouHit);
    assert.equal(r.missing, 1);
  });

  it("uses each box for one target only", () => {
    const expect = [target(100, 100, 200, 200), target(110, 110, 210, 210)];
    const r = run([found("A", pct(100, 100, 200, 200))], expect);
    assert.equal(r.pass, false);
    assert.equal(r.targets.filter((t) => t.ok).length, 1);
  });

  it("passes two separate boxes for two targets", () => {
    const expect = [target(100, 100, 200, 200), target(400, 100, 500, 200)];
    const r = run([found("A", pct(100, 100, 200, 200)), found("B", pct(400, 100, 500, 200))], expect);
    assert.equal(r.pass, true);
  });

  it("accepts an ambiguous entry and rejects a guessed box", () => {
    const ok = run([found("Hover", pct(0, 0, 1, 1), "ambiguous")], [{ type: "ambiguous" }]);
    assert.equal(ok.pass, true);
    const guessed = run([found("Card", pct(100, 100, 200, 200))], [{ type: "ambiguous" }]);
    assert.equal(guessed.pass, false);
    assert.ok(guessed.problems.some((p) => p.includes("expected an ambiguous entry")));
  });

  it("ambiguousOr accepts an ambiguous answer or a box on the element the image points to, not another box", () => {
    const expect = [{ type: "ambiguousOr", box: [100, 100, 200, 200] }];
    assert.equal(run([found("Hover", pct(0, 0, 1, 1), "ambiguous")], expect).pass, true);
    assert.equal(run([found("Card", pct(100, 100, 200, 200))], expect).pass, true);
    const elsewhere = run([found("Cards", pct(400, 100, 800, 200))], expect);
    assert.equal(elsewhere.pass, false);
    assert.ok(elsewhere.problems.some((p) => p.includes("not on the element")));
    assert.equal(run([], expect).pass, false);
  });

  it("summarizeCase reports the median IoU and the share of good hits", () => {
    const runs = [0.9, 0.6, 0.8].map((v) => ({
      score: { pass: true, entries: 1, invalid: 0, gaps: [], targets: [{ iou: v, ok: true, good: v >= 0.7 }] },
    }));
    const s = summarizeCase(runs);
    assert.equal(s.medianIou, 0.8);
    assert.ok(Math.abs((s.goodShare ?? 0) - 2 / 3) < 1e-9);
  });
});
