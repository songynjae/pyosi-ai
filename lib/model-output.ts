import { parseAnnotations } from "./annotation-schema.ts";
import { gridBoxToPercent, isGridBox } from "./grounding.ts";
import { explainMeasureProblem, parseGroups, resolveMeasure } from "./spacing.ts";
import type { ParsedAnnotations } from "./types";

export type ModelOutputResult =
  | ({ ok: true } & ParsedAnnotations)
  | { ok: false; message: string };

/**
 * Turns the model's JSON text into validated annotations. Ids are assigned
 * here ("ann-1", ...) because the model is not asked for them. Entries that
 * do not fit the schema are reported in `invalid`, never repaired.
 */
export function parseModelOutput(content: string): ModelOutputResult {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return { ok: false, message: "The model did not return valid JSON." };
  }
  const entries = (json as { annotations?: unknown } | null)?.annotations;
  if (!Array.isArray(entries)) {
    return { ok: false, message: 'The model response has no "annotations" array.' };
  }

  const groups = parseGroups((json as { groups?: unknown }).groups);

  // Measurement entries that point at nothing usable: reported with the reason.
  const unresolved = new Map<number, string>();

  const raw = entries.map((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    // A well-formed grid box is converted; null stays null; anything else is
    // passed through as-is so validation reports it.
    let box = isGridBox(e.box_2d) ? gridBoxToPercent(e.box_2d) : e.box_2d;
    // A distance line comes from the row of items the model located once. When
    // the entry does not point at usable items it is passed on as it is and
    // validation decides.
    let measure: { kind: "measure"; axis: string; value?: string } | null = null;
    if (e.kind === "measure" && e.status === "found") {
      const result = resolveMeasure(e, groups);
      if (result) {
        box = result.box;
        const value = typeof e.value === "string" ? e.value.trim() : "";
        measure = { kind: "measure", axis: result.axis, ...(value ? { value } : {}) };
      } else {
        unresolved.set(i, explainMeasureProblem(e, groups));
      }
    }
    return {
      id: `ann-${i + 1}`,
      label: e.label,
      description: e.description,
      status: e.status,
      box,
      ...measure,
    };
  });
  const parsed = parseAnnotations(raw);
  const invalid = parsed.invalid.map((item) =>
    item.index !== null && unresolved.has(item.index)
      ? { ...item, issues: [unresolved.get(item.index) as string] }
      : item,
  );
  return { ok: true, annotations: parsed.annotations, invalid };
}
