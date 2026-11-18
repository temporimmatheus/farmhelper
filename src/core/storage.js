export const STORAGE_KEYS = Object.freeze({
  state: 'legacy-c1-v20-state',
  spawns: 'legacy-c1-v8-spawns',
  metadata: 'legacy-c1-v10-auto-metadata',
});

/** Storage may be unavailable in private browsing or when the quota is full. */
export function createStorage(backend) {
  if (backend === undefined) {
    try { backend = globalThis.localStorage; } catch { backend = null; }
  }
  return {
    read(key, fallback) {
      try { return JSON.parse(backend?.getItem(key) ?? 'null') ?? fallback; }
      catch { return fallback; }
    },
    write(key, value) {
      try {
        if (!backend) return false;
        backend.setItem(key, JSON.stringify(value));
        return true;
      } catch { return false; }
    },
  };
}
