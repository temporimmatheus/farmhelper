import { MOBS } from '../data/monsters.js';
import { byName } from '../core/utils.js';

/** Relative farm model. Formulas are preserved from the original atlas. */
export function createFarmModel(state, repository) {
  const MOB = new Map(MOBS.map(m => [m.id, m]));
  const zones = [...new Set(MOBS.map(m => m.zone))].sort((a, b) => a.localeCompare(b));
  const zMap = new Map(zones.map(z => [z, MOBS.filter(m => m.zone === z)]));
  const mobData = m => repository.get(m.id);
  const countPlaces = m => mobData(m).points.length + mobData(m).areas.length;
  const def = m => state.mode === 'magic'
    ? Math.max(1, m.mRef || 1)
    : Math.max(1, ((m.pLo || 1) + (m.pHi || m.pLo || 1)) / 2);
  const expMob = m => Math.max(0, Math.floor(m.xp * Math.pow(.909, Math.max(0, state.level - m.lv))));

  function mobScore(mob) {
    // Normalized effort, not actual skill damage or a count of hits.
    const hp = Math.max(1, mob.hp * 1.6);
    const attack = state.mode === 'magic' ? 1000 * Math.sqrt(state.matk) : 140 * state.patk;
    const effort = 1 + hp * def(mob) / Math.max(1, attack);
    const higher = Math.max(0, mob.lv - state.level - 2);
    const risk = (mob.agg ? 1.075 : 1) * (1 + higher * .26);
    return expMob(mob) / Math.max(.2, effort * risk);
  }

  function statZone(zone) {
    const mobs = zMap.get(zone) || [];
    const inRange = mobs.filter(m => m.lv >= state.level - 4 && m.lv <= state.level + 5);
    const eligible = inRange.length ? inRange : mobs;
    const rank = eligible.map(m => ({ m, s: mobScore(m) })).sort((a, b) => b.s - a.s);
    const first = rank[0]?.s || 0, second = rank[1]?.s || first, third = rank[2]?.s || second;
    const average = rank.reduce((sum, row) => sum + row.s, 0) / Math.max(1, rank.length);
    let sites = 0, withSpawns = 0;
    for (const mob of mobs) {
      const count = countPlaces(mob);
      sites += count;
      if (count) withSpawns++;
    }
    // A capped visibility bonus, not a measured respawn rate.
    const availability = 1 + Math.min(.18, Math.log1p(sites) * .045);
    return {
      zone, mobs, eligible, inRange, rank, sites, withSpawns,
      score: (first * .56 + second * .23 + third * .12 + average * .09) * availability,
      lowLv: mobs.length ? Math.min(...mobs.map(m => m.lv)) : 0,
      highLv: mobs.length ? Math.max(...mobs.map(m => m.lv)) : 0,
    };
  }

  function visibleZones() {
    const query = byName(state.query);
    return zones.filter(zone => {
      const mobs = zMap.get(zone);
      if (query) return byName(zone).includes(query) || mobs.some(m => byName(m.name).includes(query));
      return state.level === 0 || state.scope === 'all' || mobs.some(m => m.lv >= state.level - 4 && m.lv <= state.level + 5);
    }).map(statZone).sort((a, b) => b.score - a.score);
  }
  return { MOBS, MOB, zMap, zones, mobData, countPlaces, def, expMob, mobScore, statZone, visibleZones };
}
