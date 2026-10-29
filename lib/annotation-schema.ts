import { z } from "zod";
import type {
  Annotation,
  InvalidAnnotation,
  ParsedAnnotations,
} from "./types";

// Tolerance for floating-point sums such as 0.1 + 99.9.
const EPSILON = 1e-9;

export const BoxSchema = z
  .object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().gt(0).max(100),
    height: z.number().gt(0).max(100),
  })
  .superRefine((box, ctx) => {
    if (box.x + box.width > 100 + EPSILON) {
      ctx.addIssue({
        code: "custom",
        path: ["width"],
        message: "x + width must be <= 100",
      });
    }
    if (box.y + box.height > 100 + EPSILON) {
      ctx.addIssue({
        code: "custom",
        path: ["height"],
        message: "y + height must be <= 100",
      });
    }
  });

export const AnnotationSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string(),
    status: z.enum(["found", "ambiguous", "not_found"]),
    box: BoxSchema.nullable(),
    kind: z.enum(["box", "measure"]).optional(),
    axis: z.enum(["horizontal", "vertical"]).optional(),
    value: z.string().min(1).optional(),
  })
  .superRefine((annotation, ctx) => {
    if (annotation.kind === "measure") {
      if (annotation.axis === undefined) {
        ctx.addIssue({ code: "custom", path: ["axis"], message: 'a "measure" annotation requires an axis' });
      }
      if (annotation.status !== "found") {
        ctx.addIssue({ code: "custom", path: ["kind"], message: 'a "measure" annotation must be "found"' });
      }
    } else if (annotation.axis !== undefined || annotation.value !== undefined) {
      ctx.addIssue({ code: "custom", path: ["kind"], message: 'axis and value are only allowed on a "measure" annotation' });
    }
    if (annotation.status === "found" && annotation.box === null) {
      ctx.addIssue({
        code: "custom",
        path: ["box"],
        message: 'a "found" annotation requires a box',
      });
    }
    if (annotation.status !== "found" && annotation.box !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["box"],
        message: `box must be null when status is "${annotation.status}"`,
      });
    }
  });

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.map(String).join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

function readId(entry: unknown): string | null {
  if (typeof entry === "object" && entry !== null && "id" in entry) {
    const id = (entry as { id: unknown }).id;
    if (typeof id === "string") return id;
  }
  return null;
}

/**
 * Validates each entry on its own. Valid entries are kept in their original
 * order; invalid ones are reported in `invalid` and never repaired, clamped,
 * or reinterpreted as "not_found".
 */
export function parseAnnotations(input: unknown): ParsedAnnotations {
  if (!Array.isArray(input)) {
    return {
      annotations: [],
      invalid: [
        { index: null, id: null, issues: ["annotations must be an array"] },
      ],
    };
  }

  const annotations: Annotation[] = [];
  const invalid: InvalidAnnotation[] = [];
  const seenIds = new Set<string>();

  input.forEach((entry, index) => {
    const result = AnnotationSchema.safeParse(entry);
    if (!result.success) {
      invalid.push({
        index,
        id: readId(entry),
        issues: formatIssues(result.error),
      });
      return;
    }
    if (seenIds.has(result.data.id)) {
      invalid.push({
        index,
        id: result.data.id,
        issues: [`id: duplicate id "${result.data.id}"`],
      });
      return;
    }
    seenIds.add(result.data.id);
    annotations.push(result.data);
  });

  return { annotations, invalid };
}
