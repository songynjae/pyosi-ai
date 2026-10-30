import { handleAnnotate } from "../../../lib/annotate-handler.ts";
import { createGuard } from "../../../lib/access.ts";

// Called by the Generate button. The API key is read here, server-side only. Node.js is the default runtime, and
// the `runtime` segment option is not allowed with cacheComponents.
// The guard (access code + call limit, lib/access.ts) lives for the lifetime of the server instance.
const guard = createGuard(process.env);
const timeoutMs = Number(process.env.MODEL_TIMEOUT_MS) > 0 ? Number(process.env.MODEL_TIMEOUT_MS) : undefined;

export async function POST(request: Request) {
  return handleAnnotate(request, { apiKey: process.env.MODEL_API_KEY, guard, timeoutMs });
}
