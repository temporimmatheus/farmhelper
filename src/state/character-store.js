import { clamp } from '../core/utils.js';
import { STORAGE_KEYS } from '../core/storage.js';
import { DEFAULT_COMBAT_OBSERVATIONS } from '../data/combat-observations.js';

export const DEFAULT_STATE = Object.freeze({
  level: 0, matk: 26, patk: 17, skillPower: 0, mode: 'magic', query: '', scope: 'near',
  area: '', mob: '', world: 'aden', compare: Object.freeze([]),
  xpPercent: 0, mpSkill: 15, combatObservations: DEFAULT_COMBAT_OBSERVATIONS,
});

function sanitizeCombatObservations(value) {
  if (!Array.isArray(value)) return DEFAULT_COMBAT_OBSERVATIONS.map(observation => ({ ...observation }));
  return value.slice(0, 200).flatMap(observation => {
    if (!observation || typeof observation !== 'object') return [];
    const { mobKey, mode } = observation;
    if (typeof mobKey !== 'string' || !/^[a-z0-9_-]{1,128}$/i.test(mobKey) || !['magic', 'physical'].includes(mode)) return [];
    const attack = Number(observation.attack), skillPower = Number(observation.skillPower);
    if (!Number.isFinite(attack) || attack <= 0 || attack > 99999 || !Number.isFinite(skillPower) || skillPower < 0 || skillPower > 9999) return [];
    const result = { mobKey, mode, attack, skillPower };
    const damageMin = Number(observation.damageMin), damageMax = Number(observation.damageMax);
    const actions = Number(observation.actions);
    if (Number.isFinite(damageMin) && damageMin > 0 && damageMin <= 99999
      && Number.isFinite(damageMax) && damageMax >= damageMin && damageMax <= 99999) {
      result.damageMin = damageMin;
      result.damageMax = damageMax;
    }
    if (Number.isInteger(actions) && actions > 0 && actions <= 1000) result.actions = actions;
    return result.damageMin || result.actions ? [result] : [];
  });
}

export function sanitizeState(value) {
  const input = value && typeof value === 'object' ? value : {};
  const result = { ...DEFAULT_STATE, compare: [] };
  const number = (key, min, max, integer = true) => {
    const raw = input[key];
    if (raw === null || raw === '' || typeof raw === 'boolean') return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) result[key] = clamp(integer ? Math.round(parsed) : parsed, min, max);
  };
  number('level', 0, 40); number('matk', 1, 99999); number('patk', 1, 99999); number('skillPower', 0, 9999);
  number('xpPercent', 0, 100, false); number('mpSkill', 0, 9999);
  for (const key of ['query', 'area', 'mob']) {
    if (typeof input[key] === 'string') result[key] = input[key].slice(0, 300);
  }
  for (const [key, allowed] of Object.entries({ mode: ['magic', 'physical'], scope: ['near', 'all'], world: ['aden', 'elmore'] })) {
    if (allowed.includes(input[key])) result[key] = input[key];
  }
  if (Array.isArray(input.compare)) result.compare = [...new Set(input.compare.filter(v => typeof v === 'string'))].slice(0, 2);
  result.combatObservations = sanitizeCombatObservations(input.combatObservations);
  return result;
}

export function createCharacterStore(storage) {
  // Keep the previous storage key to retain settings on the same origin.
  const state = sanitizeState(storage.read(STORAGE_KEYS.state, {}));
  const save = () => storage.write(STORAGE_KEYS.state, state);
  function patch(values) {
    const next = sanitizeState({ ...state, ...values });
    if (next.level !== state.level && !Object.hasOwn(values, 'xpPercent')) next.xpPercent = 0;
    Object.assign(state, next);
    save();
  }
  return { state, patch, save };
}
