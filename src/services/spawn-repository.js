import { STORAGE_KEYS } from '../core/storage.js';
import { byName } from '../core/utils.js';

const EMPTY = Object.freeze({ points: Object.freeze([]), areas: Object.freeze([]) });
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.z === undefined || Number.isFinite(p.z));

function cleanEntry(value) {
  return {
    points: Array.isArray(value?.points) ? value.points.filter(validPoint) : [],
    areas: Array.isArray(value?.areas) ? value.areas.filter(a => Array.isArray(a?.vertices) && a.vertices.length >= 3 && a.vertices.every(validPoint)) : [],
    source: typeof value?.source === 'string' ? value.source : '',
  };
}

export function createSpawnRepository(storage, monsters) {
  const entries = new Map();
  let revision = 1;
  const cached = storage.read(STORAGE_KEYS.spawns, {});
  for (const mob of monsters) {
    if (cached && Object.hasOwn(cached, mob.id)) entries.set(mob.id, cleanEntry(cached[mob.id]));
  }
  const lookup = new Map();
  for (const mob of monsters) {
    for (const key of new Set([byName(mob.name), byName(mob.name).replace(/^the /, ''), byName(mob.name).replace(/\s+/g, '')])) {
      if (!lookup.has(key)) lookup.set(key, mob.id);
      else if (lookup.get(key) !== mob.id) lookup.set(key, null);
    }
  }
  const get = id => entries.get(id) || EMPTY;
  const count = () => monsters.filter(m => get(m.id).points.length + get(m.id).areas.length > 0).length;
  function incorporate(rows) {
    let matched = 0;
    const grouping = new Map();
    for (const row of rows) {
      const id = lookup.get(byName(row.name));
      if (!id) continue;
      const group = grouping.get(id) || { points: [], areas: [] };
      if (validPoint(row.point)) { group.points.push(row.point); matched++; }
      if (row.area && cleanEntry({ areas: [row.area] }).areas.length) { group.areas.push(row.area); matched++; }
      grouping.set(id, group);
    }
    for (const [id, group] of grouping) {
      const old = get(id);
      const points = new Map([...old.points, ...group.points].map(p => [`${p.x}|${p.y}|${p.z || 0}`, p]));
      const areas = new Map([...old.areas, ...group.areas].map(a => [a.vertices.map(p => `${p.x},${p.y},${p.z || 0}`).join('|'), a]));
      entries.set(id, { points: [...points.values()], areas: [...areas.values()], source: 'Master Toma C1' });
    }
    if (matched) revision++;
    return matched;
  }
  return {
    get, count, incorporate,
    get revision() { return revision; },
    persist: () => storage.write(STORAGE_KEYS.spawns, Object.fromEntries(entries)),
  };
}
