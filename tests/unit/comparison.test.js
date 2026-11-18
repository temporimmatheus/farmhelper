import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComparison, getRowWinner } from '../../src/features/compare/comparison-model.js';
import { createFarmModel } from '../../src/domain/farm-model.js';
import { sanitizeState } from '../../src/state/character-store.js';
import { badge, metric, inlineStat, emptyMessage } from '../../src/ui/components.js';

const repository = { get: () => ({ points: [], areas: [] }) };

test('comparison highlights use the correct direction, including zero, ties and missing values', () => {
  assert.equal(getRowWinner([10, 20], 'higher'), 1);
  assert.equal(getRowWinner([10, 20], 'lower'), 0);
  assert.equal(getRowWinner([0, 20], 'lower'), 0);
  assert.equal(getRowWinner([20, 20], 'higher'), null);
  assert.equal(getRowWinner([null, 20], 'lower'), null);
  assert.equal(getRowWinner([Infinity, 20], 'higher'), null);
  assert.equal(getRowWinner([10], 'higher'), null);
  assert.equal(getRowWinner([10, 20]), null);
});

test('comparison has no invented kills or mana estimate at level zero', () => {
  const state = sanitizeState({ compare: ['Talking Island Village', 'Gludin Village'] });
  const result = buildComparison(state, createFarmModel(state, repository));
  assert.equal(result.entries.length, 2);
  for (const label of ['Mobs até subir', 'MP até subir', 'XP por MP']) {
    const row = result.rows.find(row => row.label === label);
    assert.deepEqual(row.values, [null, null]);
    assert.equal(row.winner, null);
  }
});

test('zero MP and physical combat retain finite, correctly labeled comparison values', () => {
  const state = sanitizeState({ level: 17, mpSkill: 0, mode: 'physical', compare: ['Talking Island Village', 'Gludin Village'] });
  const result = buildComparison(state, createFarmModel(state, repository));
  assert.deepEqual(result.rows.find(row => row.label === 'XP por MP').values, [null, null]);
  assert.deepEqual(result.rows.find(row => row.label === 'MP até subir').values, [0, 0]);
  assert.ok(result.rows.some(row => row.label === 'P.Def do alvo'));
  assert.ok(result.entries.every(entry => Number.isFinite(entry.xp)));
});

test('shared visual components escape labels, values and attribute content', () => {
  const content = '<script>"&';
  for (const html of [badge(content, { title: content, tone: 'invalid' }), metric(content, content, { description: content, unit: content }), inlineStat(content, content), emptyMessage(content, content)]) {
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
  }
  assert.match(badge('text', { tone: 'invalid' }), /badge--neutral/);
});
