export type SniffedImageType = "image/png" | "image/jpeg";

// Identifies PNG/JPEG by magic bytes. The browser-reported MIME type is not
// trusted on the server.
export function sniffImageType(bytes: Uint8Array): SniffedImageType | null {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= png.length && png.every((b, i) => bytes[i] === b)) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}
