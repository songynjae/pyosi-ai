// Scoring of one run against a case's expectations, and aggregation over runs.
// Pure functions (no I/O) so they are unit-tested (tests/eval-score.test.ts).

// Draft pass criteria from docs/m5-plan.md (to be confirmed by the owner). Errors are
// percent of the image's long side.
export const THRESHOLDS = {
  /** A gap's start or end may be off by at most this much. */
  edgePct: 4,
  /** A gap's position across the line (e.g. its height for a horizontal line). */
  crossPct: 3,
  /** "Tight" gaps for the report: both ends within this much. */
  tightPct: 1.5,
  /** A located element counts as hit when the overlap with the truth box (IoU) is at least this much, and as good at the second value (draft, docs/test-plan.md section 5). */
  iouHit: 0.5,
  iouGood: 0.7,
  /** Per case: the median gap-edge error must be within this much (docs/m5-plan.md, criterion 3). */
  medianEdgePct: 1.5,
  /** Per case: at least this share of the runs must give the same number of entries (criterion 5). */
  stability: 0.8,
  /** Share of runs that must pass: overall, and for each case shown in the demo. */
  overallPassRate: 0.9,
  casePassRate: 0.8,
};

const toPx = (box, size) => ({
  x0: (box.x / 100) * size.width,
  y0: (box.y / 100) * size.height,
  x1: ((box.x + box.width) / 100) * size.width,
  y1: ((box.y + box.height) / 100) * size.height,
});

const iou = (a, b) => {
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  if (w <= 0 || h <= 0) return 0;
  const inter = w * h;
  return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter);
};

const median = (values) => {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * annotations: valid annotations in ORIGINAL-image percent (after mapping back and snapping).
 * expect: the case's expectations (see eval/cases.mjs). size: original image size in px.
 */
export function scoreRun({ annotations, invalidCount, expect, notes, size }) {
  const long = Math.max(size.width, size.height);
  const found = annotations.filter((a) => a.status === "found" && a.box);
  const measures = found.filter((a) => a.kind === "measure");
  const boxes = found.filter((a) => a.kind !== "measure");
  const usedMeasures = new Set();
  const usedBoxes = new Set();
  const targets = [];
  const gaps = [];
  const problems = [];
  let missing = 0;

  for (const e of expect) {
    if (e.type === "gap") {
      const [tx0, ty0, tx1, ty1] = e.box;
      const tc = [(tx0 + tx1) / 2, (ty0 + ty1) / 2];
      let best = null;
      for (const m of measures) {
        if (usedMeasures.has(m) || m.axis !== e.axis) continue;
        const p = toPx(m.box, size);
        const d = Math.hypot((p.x0 + p.x1) / 2 - tc[0], (p.y0 + p.y1) / 2 - tc[1]);
        if (!best || d < best.d) best = { m, p, d };
      }
      if (!best || best.d > 0.12 * long) {
        missing += 1;
        problems.push(`missing ${e.axis} gap at ${e.box.join(",")}`);
        continue;
      }
      usedMeasures.add(best.m);
      const horizontal = e.axis === "horizontal";
      const startErr = Math.abs((horizontal ? best.p.x0 - tx0 : best.p.y0 - ty0));
      const endErr = Math.abs((horizontal ? best.p.x1 - tx1 : best.p.y1 - ty1));
      const center = horizontal ? (best.p.y0 + best.p.y1) / 2 : (best.p.x0 + best.p.x1) / 2;
      // A gap in a row or column can be crossed anywhere along the items' extent (crossRange).
      const [cLo, cHi] = e.crossRange ?? (horizontal ? [ty0, ty1] : [tx0, tx1]);
      const crossErr = e.crossRange ? Math.max(cLo - center, center - cHi, 0) : Math.abs(center - (cLo + cHi) / 2);
      const edgePct = (Math.max(startErr, endErr) / long) * 100;
      const crossPct = (crossErr / long) * 100;
      const ok = edgePct <= THRESHOLDS.edgePct && crossPct <= THRESHOLDS.crossPct;
      if (!ok) problems.push(`gap ${e.box.join(",")} off by edge ${edgePct.toFixed(1)}% / cross ${crossPct.toFixed(1)}%`);
      gaps.push({ edgePct, crossPct, ok, startErr, endErr, crossErr });
    } else if (e.type === "box") {
      const [x0, y0, x1, y1] = e.region;
      const hit = boxes.find((b) => {
        const p = toPx(b.box, size);
        const cx = (p.x0 + p.x1) / 2;
        const cy = (p.y0 + p.y1) / 2;
        return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
      });
      if (!hit) {
        missing += 1;
        problems.push(`missing box in ${e.region.join(",")}`);
      }
    } else if (e.type === "target") {
      // A located element (ContextMark cases): the best unused box must overlap the truth box by at
      // least iouHit (intersection over union, pixels of the original image).
      const [tx0, ty0, tx1, ty1] = e.box;
      let best = null;
      for (const b of boxes) {
        if (usedBoxes.has(b)) continue;
        const p = toPx(b.box, size);
        const v = iou([p.x0, p.y0, p.x1, p.y1], [tx0, ty0, tx1, ty1]);
        if (!best || v > best.v) best = { b, v };
      }
      const v = best ? best.v : 0;
      const ok = v >= THRESHOLDS.iouHit;
      if (best && ok) usedBoxes.add(best.b);
      targets.push({ iou: v, ok, good: v >= THRESHOLDS.iouGood });
      if (!ok) {
        missing += 1;
        problems.push(`target ${e.box.join(",")}: best overlap ${v.toFixed(2)} (needs ${THRESHOLDS.iouHit})`);
      }
    } else if (e.type === "ambiguousOr") {
      // The image itself points to one element (e.g. the only card in the hover state): "ambiguous" and a
      // box on that element (IoU >= iouHit with e.box) are both accepted; a box anywhere else is a guess.
      const [tx0, ty0, tx1, ty1] = e.box;
      const onTarget = boxes.find((b) => {
        const p = toPx(b.box, size);
        return iou([p.x0, p.y0, p.x1, p.y1], [tx0, ty0, tx1, ty1]) >= THRESHOLDS.iouHit;
      });
      const askedBack = annotations.some((a) => a.status === "ambiguous") && boxes.length === 0;
      if (!onTarget && !askedBack) {
        missing += 1;
        problems.push(
          boxes.length > 0
            ? `box not on the element the image points to (${e.box.join(",")}) and not answered as ambiguous`
            : "expected an ambiguous entry or a box on the element the image points to",
        );
      }
    } else if (e.type === "ambiguous") {
      // Several elements fit the notes equally: the answer must be "ambiguous", not a guessed box.
      if (!annotations.some((a) => a.status === "ambiguous")) {
        missing += 1;
        problems.push("expected an ambiguous entry");
      }
      if (boxes.length > 0) problems.push(`guessed ${boxes.length} box(es) where the target is ambiguous`);
    } else if (e.type === "absent") {
      // The notes name an element that is not in the image: it must be reported as not found. A
      // distance line is caught below as an extra one; boxes around other elements that the notes
      // mention (the title the missing button should be far from) are fine.
      if (!annotations.some((a) => a.status === "not_found")) {
        missing += 1;
        problems.push("the named element was not reported as not found");
      }
    } else if (e.type === "none" && found.length > 0) {
      problems.push(`expected nothing to be found, got ${found.length} located entries`);
      missing += 1;
    }
  }

  const extra = measures.filter((m) => !usedMeasures.has(m)).length;
  if (extra > 0) problems.push(`${extra} extra distance line(s)`);
  if (invalidCount > 0) problems.push(`${invalidCount} invalid entr${invalidCount === 1 ? "y" : "ies"}`);

  const lostUnits = unitsNotKept(notes, annotations);
  if (lostUnits.length > 0) problems.push(`number and unit from the notes not kept: ${lostUnits.join(", ")}`);

  const descriptions = annotations.map((a) => (a.description || "").trim().toLowerCase()).filter(Boolean);
  const duplicates = descriptions.length - new Set(descriptions).size;
  if (duplicates > 0) problems.push("repeated description");
  if (notes.includes("?") && !annotations.some((a) => (a.description || "").includes("?"))) {
    problems.push("question in the notes not kept as a question");
  }

  return {
    pass: problems.length === 0,
    entries: annotations.length,
    invalid: invalidCount,
    missing,
    extra,
    gaps,
    targets,
    problems,
  };
}

/**
 * Numbers with a unit in the notes ("5 mm", "24px") that appear nowhere in the labels, descriptions or
 * values (criterion 4: numbers and units are kept as written). Spaces and case are ignored.
 */
export function unitsNotKept(notes, annotations) {
  const wanted = [...notes.matchAll(/(\d+(?:\.\d+)?)\s?(mm|cm|px|pt|rem|em|%)/gi)].map((m) => `${m[1]}${m[2].toLowerCase()}`);
  if (wanted.length === 0) return [];
  const text = annotations
    .map((a) => `${a.label ?? ""} ${a.description ?? ""} ${a.value ?? ""}`)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, "");
  return wanted.filter((w) => !text.includes(w));
}

/** Summary over the runs of one case. */
export function summarizeCase(runs) {
  const done = runs.filter((r) => !r.requestFailed);
  const edges = done.flatMap((r) => r.score.gaps.map((g) => g.edgePct));
  const ious = done.flatMap((r) => (r.score.targets ?? []).map((t) => t.iou));
  const counts = done.map((r) => r.score.entries);
  const modal = counts.length
    ? Math.max(...[...new Set(counts)].map((c) => counts.filter((x) => x === c).length))
    : 0;
  return {
    runs: runs.length,
    failedRequests: runs.length - done.length,
    passes: done.filter((r) => r.score.pass).length,
    entryRange: counts.length ? [Math.min(...counts), Math.max(...counts)] : null,
    stableCount: counts.length ? modal / counts.length : 0,
    invalid: done.reduce((n, r) => n + r.score.invalid, 0),
    medianEdgePct: median(edges),
    maxEdgePct: edges.length ? Math.max(...edges) : null,
    medianIou: median(ious),
    goodShare: ious.length ? ious.filter((v) => v >= THRESHOLDS.iouGood).length / ious.length : null,
    tightShare: edges.length ? edges.filter((e) => e <= THRESHOLDS.tightPct).length / edges.length : null,
  };
}

/**
 * Whether a case meets the draft bar of docs/m5-plan.md: enough runs pass, the median gap-edge error is
 * small and the number of entries is stable. Returns { ok, reasons }.
 */
export function caseVerdict(summary) {
  const reasons = [];
  if (summary.runs === 0) return { ok: false, reasons: ["no runs"] };
  const rate = summary.passes / summary.runs;
  if (rate < THRESHOLDS.casePassRate) reasons.push(`${summary.passes}/${summary.runs} runs pass (needs ${THRESHOLDS.casePassRate * 100}%)`);
  if (summary.medianEdgePct !== null && summary.medianEdgePct > THRESHOLDS.medianEdgePct) {
    reasons.push(`median edge error ${summary.medianEdgePct.toFixed(1)}% (needs <= ${THRESHOLDS.medianEdgePct}%)`);
  }
  if (summary.stableCount < THRESHOLDS.stability) {
    reasons.push(`entry count stable in ${(summary.stableCount * 100).toFixed(0)}% of runs (needs ${THRESHOLDS.stability * 100}%)`);
  }
  return { ok: reasons.length === 0, reasons };
}
