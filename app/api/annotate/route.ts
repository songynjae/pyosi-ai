import { handleAnnotate } from "../../../lib/annotate-handler.ts";

// Called by the Generate button. The API key is read here, server-side only. Node.js is the default runtime, and
// the `runtime` segment option is not allowed with cacheComponents.
export async function POST(request: Request) {
  return handleAnnotate(request, { apiKey: process.env.MODEL_API_KEY });
}
