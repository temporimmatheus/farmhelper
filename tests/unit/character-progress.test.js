import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryStorage } from '../support/memory-storage.js';
import { createStorage, STORAGE_KEYS } from '../../src/core/storage.js';
import { createCharacterStore, sanitizeState } from '../../src/state/character-store.js';
import { calculateProgress } from '../../src/domain/progress.js';

test('fresh character starts at level zero without XP estimates', () => {
  const { state } = createCharacterStore(memoryStorage());
  assert.equal(state.level, 0);
  const progress = calculateProgress(state, 100);
  assert.equal(progress.configured, false);
  assert.equal(progress.kills, null);
  assert.equal(progress.mpRemaining, null);
});

test('previous settings restore and calculated mana requires a combat estimate', () => {
  const storage = memoryStorage({ [STORAGE_KEYS.state]: JSON.stringify({ level: 17, xpPercent: 50, mpSkill: 15, castsKill: 2 }) });
  const store = createCharacterStore(storage);
  assert.deepEqual(calculateProgress(store.state, 100), {
    configured: true, total: 113712, remaining: 56856, kills: 569,
    mpPerKill: null, mpRemaining: null, xpPerMp: null,
  });
  assert.deepEqual(calculateProgress(store.state, 100, { mpPerMob: 30 }), {
    configured: true, total: 113712, remaining: 56856, kills: 569,
    mpPerKill: 30, mpRemaining: 17070, xpPerMp: 100 / 30,
  });
  store.patch({ matk: 100, skillPower: 42, xpPercent: 62.15 });
  const reloaded = createCharacterStore(storage);
  assert.equal(reloaded.state.xpPercent, 62.15);
  assert.equal(reloaded.state.matk, 100);
  assert.equal(reloaded.state.skillPower, 42);
  reloaded.patch({ level: 18 });
  assert.equal(reloaded.state.xpPercent, 0);
});

test('corrupt JSON, wrong types, infinity and out-of-range values are safe', () => {
  assert.equal(createCharacterStore(memoryStorage({ [STORAGE_KEYS.state]: '{' })).state.level, 0);
  const state = sanitizeState({ level: 999, matk: -100, patk: 'bad', skillPower: 20000, world: 'missing', mode: 'other', compare: ['a', 'a', 'b', 'c', 4], castsKill: 0, mpSkill: Infinity, xpPercent: 200, query: {} });
  assert.equal(state.level, 40);
  assert.equal(state.matk, 1);
  assert.equal(state.patk, 17);
  assert.equal(state.world, 'aden');
  assert.equal(state.mode, 'magic');
  assert.deepEqual(state.compare, ['a', 'b']);
  assert.equal(state.skillPower, 9999);
  assert.equal(Object.hasOwn(state, 'castsKill'), false);
  assert.equal(state.mpSkill, 15);
  assert.equal(state.xpPercent, 100);
  assert.equal(state.query, '');
  assert.ok(state.combatObservations.length > 0);
  assert.equal(sanitizeState({
    combatObservations: [{ mobKey: '../bad', mode: 'magic', attack: 26, skillPower: 21, damage: 218 }]
  }).combatObservations.length, 0);
});

test('blocked storage does not break character updates', () => {
  const storage = createStorage({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } });
  const store = createCharacterStore(storage);
  store.patch({ level: 17 });
  assert.equal(store.state.level, 17);
  assert.equal(store.save(), false);
});

test('100% XP requires zero kills; zero MP never produces an infinite ratio', () => {
  const result = calculateProgress(sanitizeState({ level: 40, xpPercent: 100, mpSkill: 0 }), 200);
  assert.equal(result.kills, 0);
  assert.equal(result.mpRemaining, null);
  assert.equal(result.xpPerMp, null);
  assert.equal(calculateProgress(sanitizeState({ level: 17 }), 0).kills, null);
});
