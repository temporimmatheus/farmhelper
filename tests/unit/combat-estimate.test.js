import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateMobCombat } from '../../src/domain/combat-estimate.js';

const mob = { hp: 100, pLo: 50, pHi: 50, mRef: 20, defQuality: 'exact' };

test('physical estimate converts attack and defense into a hit range', () => {
  const estimate = estimateMobCombat({ mode: 'physical', patk: 35 }, mob);
  assert.equal(estimate.damageMin, 49);
  assert.equal(estimate.damageMax, 49);
  assert.deepEqual(estimate.actions, { min: 4, max: 4, expected: 4, label: '~4' });
  assert.equal(estimate.mpPerMob, 0);
});

test('physical defense range produces a corresponding action range', () => {
  const estimate = estimateMobCombat({ mode: 'physical', patk: 35 }, { ...mob, pHi: 100 });
  assert.equal(estimate.actions.min, 4);
  assert.equal(estimate.actions.max, 7);
  assert.equal(estimate.actions.expected, 6);
  assert.equal(estimate.actions.label, '4–7');
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
