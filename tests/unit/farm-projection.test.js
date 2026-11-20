import test from 'node:test';
import assert from 'node:assert/strict';
import { CURATED_MOBS, MOBS } from '../../src/data/monsters.js';
import { IMPORTED_MOBS } from '../../src/data/imported-monsters.js';
import { createFarmModel } from '../../src/domain/farm-model.js';
import { project, pointInside } from '../../src/domain/projection.js';
import { ADEN_LANDMARKS, ELMORE_LANDMARKS } from '../../src/data/maps.js';
import { sanitizeState } from '../../src/state/character-store.js';

const emptyRepository = { get: () => ({ points: [], areas: [] }) };

test('imported catalog contains only spawned mobs through level 40', () => {
  assert.ok(IMPORTED_MOBS.length > 0);
  assert.ok(IMPORTED_MOBS.every(mob => mob.lv >= 1 && mob.lv <= 40));
  assert.ok(IMPORTED_MOBS.every(mob => mob.spawnData.points.length || mob.spawnData.areas.length));
  assert.ok(IMPORTED_MOBS.every(mob => mob.agg === null));
  assert.ok(MOBS.length > CURATED_MOBS.length);
});

test('configured physical ranking favors XP earned per estimated attack', () => {
  const mobs = [
    { id: 'quick', name: 'Quick', zone: 'Test', lv: 10, hp: 100, xp: 80, pLo: 50, pHi: 50, mRef: 20, defQuality: 'exact' },
    { id: 'tough', name: 'Tough', zone: 'Test', lv: 10, hp: 500, xp: 100, pLo: 50, pHi: 50, mRef: 20, defQuality: 'exact' },
  ];
  const state = sanitizeState({ level: 10, mode: 'physical', patk: 35 });
  const model = createFarmModel(state, emptyRepository, mobs);
  assert.ok(model.mobScore(mobs[0]) > model.mobScore(mobs[1]));
  assert.equal(model.statZone('Test').rank[0].m.id, 'quick');
});

test('magic recommendations fall back to XP until a skill power is entered', () => {
  const state = sanitizeState({ level: 17, mode: 'magic' });
  const model = createFarmModel(state, emptyRepository, CURATED_MOBS);
  assert.equal(model.combatConfigured, false);
  assert.equal(model.estimateCombat(CURATED_MOBS[0]), null);
});

test('monster IDs are unique; searching ignores accents and punctuation', () => {
  assert.equal(new Set(MOBS.map(m => m.id)).size, MOBS.length);
  const model = createFarmModel(sanitizeState({ level: 40, query: 'Yóung_Red Keltir' }), emptyRepository);
  assert.ok(model.visibleZones().some(area => area.zone === 'Shadow of the Mother Tree'));
  const empty = createFarmModel(sanitizeState({ query: 'nothing-exists-here' }), emptyRepository);
  assert.deepEqual(empty.visibleZones(), []);
  assert.equal(empty.statZone('').lowLv, 0);
  const ratman = createFarmModel(sanitizeState({ query: 'spy ratman' }), emptyRepository);
  assert.ok(ratman.visibleZones().some(area => area.mobs.some(mob => mob.name === 'Ratman Spy')));
});

test('map calibration reproduces known Aden and Elmore landmarks', () => {
  for (const [world, landmarks] of [['aden', ADEN_LANDMARKS], ['elmore', ELMORE_LANDMARKS]]) {
    for (const [x, y, expectedX, expectedY] of landmarks) assert.deepEqual(project(x, y, world), { x: expectedX, y: expectedY });
  }
  assert.equal(project(0, NaN), null);
  assert.equal(project(0, -100000, 'aden'), null);
  assert.equal(project(0, 100000, 'elmore'), null);
});

test('territory hit testing distinguishes inside and outside points', () => {
  const polygon = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.equal(pointInside(5, 5, polygon), true);
  assert.equal(pointInside(20, 5, polygon), false);
});
