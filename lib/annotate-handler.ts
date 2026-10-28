import { MAX_IMAGE_BYTES } from "./image-validation.ts";
import { sniffImageType } from "./image-sniff.ts";
import { requestAnnotations } from "./meta-client.ts";
import { parseModelOutput } from "./model-output.ts";
import { MAX_NOTES_CHARS } from "./prompts/annotate.ts";

type Deps = {
  apiKey: string | undefined;
  fetchImpl?: typeof fetch;
};

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

/**
 * Request: multipart form with `image` (PNG/JPEG file) and `notes` (text).
 * Success: { annotations, invalid, promptVersion, usage, latencyMs }.
 * Failure: { error: { code, message } }. The API key is never included.
 */
export async function handleAnnotate(request: Request, { apiKey, fetchImpl }: Deps) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, "bad_request", "Expected a multipart form with an image and notes.");
  }

  const image = form.get("image");
  const notes = form.get("notes");
  if (!(image instanceof File)) {
    return error(400, "missing_image", "Attach a screenshot as the `image` field.");
  }
  if (typeof notes !== "string" || notes.trim() === "") {
    return error(400, "missing_notes", "Add some notes in the `notes` field.");
  }
  if (notes.length > MAX_NOTES_CHARS) {
    return error(400, "notes_too_long", `Notes can be at most ${MAX_NOTES_CHARS} characters.`);
  }
  if (image.size === 0) return error(400, "empty_image", "The image is empty.");
  if (image.size > MAX_IMAGE_BYTES) {
    return error(413, "image_too_large", "The image is larger than 10 MB.");
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  const mime = sniffImageType(bytes);
  if (!mime) {
    return error(415, "unsupported_image", "The file is not a PNG or JPEG image.");
  }

  if (!apiKey) {
    return error(503, "not_configured", "The model API key is not configured on the server.");
  }

  const result = await requestAnnotations({
    apiKey,
    image: { bytes, mime },
    notes: notes.trim(),
    fetchImpl,
  });
  if (!result.ok) {
    return error(result.kind === "timeout" ? 504 : 502, `upstream_${result.kind}`, result.message);
  }

  const parsed = parseModelOutput(result.content);
  if (!parsed.ok) return error(502, "bad_model_output", parsed.message);

  return Response.json({
    annotations: parsed.annotations,
    invalid: parsed.invalid,
    promptVersion: result.promptVersion,
    usage: result.usage,
    latencyMs: result.latencyMs,
  });
}
