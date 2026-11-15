export function sessionValue<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function saveSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Browsing without storage still supports the current view. */
  }
}
