import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateMobCombat } from '../../src/domain/combat-estimate.js';
import { sanitizeState } from '../../src/state/character-store.js';

const mob = { hp: 100, pLo: 50, pHi: 50, mRef: 20, defQuality: 'exact' };

test('physical estimate converts attack and defense into a hit range', () => {
  const estimate = estimateMobCombat({ mode: 'physical', patk: 35 }, mob);
  assert.equal(estimate.hp, 100);
  assert.equal(estimate.damageMin, 49);
  assert.equal(estimate.damageMax, 49);
  assert.deepEqual(estimate.actions, { min: 3, max: 3, expected: 3, label: '~3' });
  assert.equal(estimate.mpPerMob, 0);
});

test('physical defense range produces a corresponding action range', () => {
  const estimate = estimateMobCombat({ mode: 'physical', patk: 35 }, { ...mob, pHi: 100 });
  assert.equal(estimate.actions.min, 3);
  assert.equal(estimate.actions.max, 5);
  assert.equal(estimate.actions.expected, 4);
  assert.equal(estimate.actions.label, '3–5');
});

test('magic estimate uses skill power to calculate casts and mana per mob', () => {
  const estimate = estimateMobCombat({ mode: 'magic', matk: 100, skillPower: 10, mpSkill: 12 }, mob);
  assert.equal(estimate.damageMin, 455);
  assert.deepEqual(estimate.actions, { min: 1, max: 1, expected: 1, label: '~1' });
  assert.equal(estimate.mpPerMob, 12);
});

test('magic estimate is unavailable until skill power and usable defense are known', () => {
  assert.equal(estimateMobCombat({ mode: 'magic', matk: 100, skillPower: 0, mpSkill: 12 }, mob), null);
  assert.equal(estimateMobCombat({ mode: 'magic', matk: 100, skillPower: 10, mpSkill: 12 }, { ...mob, mRef: 0 }), null);
});

test('user-reported Ratman observations override formulas only for the matching combat profile', () => {
  const ratmanSpy = { id: 'spy-1', sourceName: 'ratman_spy', hp: 264.34, pLo: 76, pHi: 76, mRef: 55, defQuality: 'ref' };
  const ratmanHunter = { id: 'hunter-1', sourceName: 'ratman_hunter', hp: 301.67, pLo: 89, pHi: 89, mRef: 59, defQuality: 'ref' };
  const state = sanitizeState({ mode: 'magic', matk: 26, skillPower: 21, mpSkill: 15 });
  const spy = estimateMobCombat(state, ratmanSpy);
  const hunter = estimateMobCombat(state, ratmanHunter);
  assert.equal(spy.damageMin, 218);
  assert.equal(spy.damageMax, 218);
  assert.equal(spy.damageSource, 'observed');
  assert.equal(spy.actions.label, '2');
  assert.equal(spy.actionsSource, 'observed');
  assert.equal(spy.mpPerMob, 30);
  assert.equal(hunter.actions.label, '3');
  assert.equal(hunter.actionsSource, 'observed');

  const otherProfile = estimateMobCombat({ ...state, skillPower: 20 }, ratmanSpy);
  assert.equal(otherProfile.damageSource, 'formula');
  assert.equal(otherProfile.actionsSource, 'formula');
});
