import { createStorage } from '../../src/core/storage.js';

export function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return createStorage({ getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) });
}
