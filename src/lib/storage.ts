/**
 * Safe localStorage wrapper. Every read/write in the app goes through here so
 * malformed data, quota errors and unavailable storage degrade gracefully
 * instead of crashing the UI.
 *
 * Reads return a caller-provided fallback when the key is missing, the JSON
 * is invalid, or (optionally) an entry fails a type guard. Writes never throw.
 */
export const storage = {
  /**
   * Reads and JSON-parses a key. `fallback` is returned when the key is
   * missing, unparseable, or fails the optional `isValue` type guard.
   */
  get<T>(key: string, fallback: T, isValue?: (value: unknown) => value is T): T {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed: unknown = JSON.parse(raw);
      return isValue ? (isValue(parsed) ? parsed : fallback) : (parsed as T);
    } catch {
      return fallback;
    }
  },

  /** Reads a key as a plain string without JSON parsing. */
  getRaw(key: string, fallback: string): string {
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },

  /** Serializes and stores a value. Never throws. */
  set(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (private mode / quota) — persist nothing.
    }
  },

  /** Stores a plain string without JSON serialization. Never throws. */
  setRaw(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },

  /** Removes a key. Never throws. */
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
