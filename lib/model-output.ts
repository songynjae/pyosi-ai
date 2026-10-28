import { parseAnnotations } from "./annotation-schema.ts";
import { gridBoxToPercent, isGridBox } from "./grounding.ts";
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

  const raw = entries.map((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    // A well-formed grid box is converted; null stays null; anything else is
    // passed through as-is so validation reports it.
    const box = isGridBox(e.box_2d) ? gridBoxToPercent(e.box_2d) : e.box_2d;
    return {
      id: `ann-${i + 1}`,
      label: e.label,
      description: e.description,
      status: e.status,
      box,
    };
  });
  return { ok: true, ...parseAnnotations(raw) };
}
