// Picks the file to use from a drop or a paste.

/** First file of any type, so a wrong type gets the normal "unsupported" message. */
export function pickDroppedFile(files: ArrayLike<File> | null | undefined): File | undefined {
  return files && files.length > 0 ? files[0] : undefined;
}

/**
 * First image in pasted files, or undefined. Pastes without an image (plain
 * text into the notes box) must be left alone, so non-images are ignored.
 */
export function pickImageFile(files: ArrayLike<File> | null | undefined): File | undefined {
  if (!files) return undefined;
  for (let i = 0; i < files.length; i++) {
    if (files[i].type.startsWith("image/")) return files[i];
  }
  return undefined;
}

type ClipboardLike = {
  files?: ArrayLike<File> | null;
  items?: ArrayLike<{ kind: string; type: string; getAsFile(): File | null }> | null;
};

/**
 * Image from a paste event. `files` is checked first; some browsers only
 * expose a pasted screenshot through `items`.
 */
export function pickPastedImage(data: ClipboardLike | null | undefined): File | undefined {
  if (!data) return undefined;
  const fromFiles = pickImageFile(data.files);
  if (fromFiles) return fromFiles;
  const items = data.items;
  if (!items) return undefined;
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === "file" && items[i].type.startsWith("image/")) {
      const file = items[i].getAsFile();
      if (file) return file;
    }
  }
  return undefined;
}
