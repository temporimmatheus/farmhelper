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

function mergeEntries(first, second) {
  const points = new Map([...first.points, ...second.points].map(point => [`${point.x}|${point.y}|${point.z || 0}`, point]));
  const areas = new Map([...first.areas, ...second.areas].map(area => [area.vertices.map(point => `${point.x},${point.y},${point.z || 0}`).join('|'), area]));
  return { points: [...points.values()], areas: [...areas.values()], source: second.source || first.source };
}

export function createSpawnRepository(storage, monsters) {
  const entries = new Map();
  let revision = 1;
  const cached = storage.read(STORAGE_KEYS.spawns, {});
  for (const mob of monsters) {
    const stored = cached && Object.hasOwn(cached, mob.id) ? cleanEntry(cached[mob.id]) : null;
    const imported = mob.spawnData ? cleanEntry(mob.spawnData) : null;
    if (stored && imported) entries.set(mob.id, mergeEntries(imported, stored));
    else if (stored || imported) entries.set(mob.id, stored || imported);
  }
  const lookup = new Map(), byId = new Map(monsters.map(mob => [mob.id, mob]));
  for (const mob of monsters) {
    for (const key of new Set([mob.name, mob.sourceName].filter(Boolean).flatMap(name => {
      const normalized = byName(name);
      return [normalized, normalized.replace(/^the /, ''), normalized.replace(/\s+/g, '')];
    }))) {
      const ids = lookup.get(key) || new Set();
      ids.add(mob.id);
      lookup.set(key, ids);
    }
  }
  const get = id => entries.get(id) || EMPTY;
  const count = () => monsters.filter(m => get(m.id).points.length + get(m.id).areas.length > 0).length;
  function incorporate(rows) {
    let matched = 0;
    const grouping = new Map();
    for (const row of rows) {
      const ids = [...(lookup.get(byName(row.name)) || [])];
      const matches = row.sourceRegion
        ? ids.filter(id => !byId.get(id)?.sourceRegion || byId.get(id)?.sourceRegion === row.sourceRegion)
        : ids.length === 1 ? ids : [];
      for (const id of matches) {
        const group = grouping.get(id) || { points: [], areas: [] };
        if (validPoint(row.point)) { group.points.push(row.point); matched++; }
        if (row.area && cleanEntry({ areas: [row.area] }).areas.length) { group.areas.push(row.area); matched++; }
        grouping.set(id, group);
      }
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
