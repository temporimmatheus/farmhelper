import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateMobCombat } from '../../src/domain/combat-estimate.js';

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

test('Ratman Spy empirical case uses base catalog HP and estimates two casts', () => {
  const ratmanSpy = { hp: 264.34, pLo: 76, pHi: 76, mRef: 55, defQuality: 'ref' };
  const estimate = estimateMobCombat({ mode: 'magic', matk: 26, skillPower: 21, mpSkill: 15 }, ratmanSpy);
  assert.equal(estimate.hp, 264.34);
  assert.deepEqual(estimate.actions, { min: 2, max: 2, expected: 2, label: '~2' });
  assert.equal(estimate.mpPerMob, 30);
});
