import test from 'node:test';
import assert from 'node:assert/strict';
import { EFFECTIVE_HP_FACTOR, effectiveMobHp, estimateMobCombat } from '../../src/domain/combat-estimate.js';
import { sanitizeState } from '../../src/state/character-store.js';
import { MOBS } from '../../src/data/monsters.js';

const mob = { hp: 100, pLo: 50, pHi: 50, mRef: 20, defQuality: 'exact' };

test('physical estimate converts attack and defense into a hit range', () => {
  const estimate = estimateMobCombat({ mode: 'physical', patk: 35 }, mob);
  assert.equal(estimate.hp, 160);
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

test('effective HP multiplier is applied uniformly to the entire mob catalog', () => {
  assert.ok(EFFECTIVE_HP_FACTOR > 1);
  for (const mob of MOBS) assert.equal(effectiveMobHp(mob), mob.hp * EFFECTIVE_HP_FACTOR);
});

test('user-reported Ratman observations override formulas only for the matching combat profile', () => {
  const ratmanSpy = { id: 'spy-1', sourceName: 'ratman_spy', hp: 264.34, pLo: 76, pHi: 76, mRef: 55, defQuality: 'ref' };
  const ratmanHunter = { id: 'hunter-1', sourceName: 'ratman_hunter', hp: 301.67, pLo: 89, pHi: 89, mRef: 59, defQuality: 'ref' };
  const state = sanitizeState({ mode: 'magic', matk: 26, skillPower: 21, mpSkill: 15 });
  const spy = estimateMobCombat(state, ratmanSpy);
  const hunter = estimateMobCombat(state, ratmanHunter);
  assert.equal(spy.hp, 264.34 * 1.6);
  assert.equal(spy.damageMin, 218);
  assert.equal(spy.damageMax, 218);
  assert.equal(spy.damageSource, 'observed');
  assert.equal(spy.actions.label, '2');
  assert.equal(spy.actionsSource, 'observed');
  assert.equal(spy.mpPerMob, 30);
  assert.equal(hunter.actions.label, '3');
  assert.equal(hunter.actionsSource, 'observed');

  const spyFromDamage = estimateMobCombat({
    ...state,
    combatObservations: [{
      mobKey: 'spy-calculation-test',
      mode: 'magic',
      attack: 26,
      skillPower: 21,
      damageMin: 218,
      damageMax: 218,
    }],
  }, { ...ratmanSpy, sourceName: 'spy-calculation-test' });
  assert.equal(spyFromDamage.actions.expected, 2);
  assert.equal(spyFromDamage.actionsSource, 'formula');

  const hunterFromFormula = estimateMobCombat({
    ...state,
    combatObservations: [],
  }, { ...ratmanHunter, sourceName: 'hunter-calculation-test' });
  assert.equal(hunterFromFormula.actions.expected, 3);
  assert.equal(hunterFromFormula.actionsSource, 'formula');

  const otherProfile = estimateMobCombat({ ...state, skillPower: 20 }, ratmanSpy);
  assert.equal(otherProfile.damageSource, 'formula');
  assert.equal(otherProfile.actionsSource, 'formula');
});

test('Bugbear mixed-damage observations support the effective HP factor and fit both modes', () => {
  const bugbear = { id: 'raider', sourceName: 'bugbear_raider', hp: 282.57, pLo: 78, pHi: 78, mRef: 57, defQuality: 'ref' };
  const magic = estimateMobCombat(sanitizeState({ mode: 'magic', matk: 26, skillPower: 21 }), bugbear);
  assert.equal(magic.hp, 452.112);
  assert.equal(magic.damageMin, 209);
  assert.equal(magic.actions.expected, 3);
  assert.equal(magic.damageSource, 'observed');
  assert.equal(magic.actionsSource, 'formula');
  assert.ok(2 * 209 + 14 + 16 < magic.hp);
  assert.ok(magic.hp <= 2 * 209 + 14 + 16 + 16);

  const physical = estimateMobCombat(sanitizeState({ mode: 'physical', patk: 18 }), bugbear);
  assert.equal(physical.hp, 452.112);
  assert.equal(physical.damageMin, 14);
  assert.equal(physical.damageMax, 16);
  assert.deepEqual(physical.actions, { min: 29, max: 33, expected: 31, label: '29–33' });
  assert.equal(physical.damageSource, 'observed');
});
