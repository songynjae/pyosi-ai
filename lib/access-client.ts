// The invitation link carries the access code: https://<site>/?code=<code>. The page reads it from the
// address and keeps it in sessionStorage for the tab, then sends it with every Generate (lib/access.ts).

export const ACCESS_STORAGE_KEY = "pyosi-access-code";

/** The code in the address (`?code=...`) wins over the one stored earlier in this tab. */
export function pickAccessCode(search: string, stored: string | null): string | null {
  const fromUrl = new URLSearchParams(search).get("code")?.trim();
  return fromUrl || stored || null;
}

/** Browser only. Storage can be blocked, so every access is guarded. */
export function readAccessCode(): string | null {
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(ACCESS_STORAGE_KEY);
  } catch {
    // storage blocked: the code in the address still works until the page is reloaded without it
  }
  const code = pickAccessCode(window.location.search, stored);
  if (code && code !== stored) {
    try {
      window.sessionStorage.setItem(ACCESS_STORAGE_KEY, code);
    } catch {
      // ignore
    }
  }
  return code;
}
