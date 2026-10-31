// 4 MB: the public deployment (Netlify) accepts about 4.5 MB per request.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg"];

export type ImageCheck = { ok: true } | { ok: false; message: string };

function toMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Checks the browser-reported MIME type and size only. A server route must
// re-check the file contents before trusting it.
export function validateImageFile(file: {
  type: string;
  size: number;
}): ImageCheck {
  if (file.size === 0) {
    return { ok: false, message: "The selected file is empty." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    const found = file.type ? ` (${file.type})` : "";
    return {
      ok: false,
      message: `Unsupported file type${found}. Please upload a PNG or JPEG image.`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: `The image is too large (${toMb(file.size)}). The maximum size is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
    };
  }
  return { ok: true };
}
