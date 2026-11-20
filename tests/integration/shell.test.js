import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { STORAGE_KEYS } from '../../src/core/storage.js';
import { installDomFixture } from '../support/dom-fixture.js';
import { memoryStorage } from '../support/memory-storage.js';

const source = { async listFiles() { return []; } };
function mount(t, initial = {}) {
  const dom = installDomFixture();
  const storage = memoryStorage({ [STORAGE_KEYS.state]: JSON.stringify(initial) });
  const app = createApp({ storage, source });
  t.after(() => { app.destroy(); dom.cleanup(); });
  return { dom, storage };
}

test('Explore and Compare share the character, progress and selected area', t => {
  const { dom, storage } = mount(t);
  dom.input('level', 17); dom.input('xpExact', '42,5'); dom.input('mpSkill', 21); dom.input('skillPower', 20);
  const selected = storage.read(STORAGE_KEYS.state).area;
  dom.click('navCompare');
  assert.equal(dom.get('exploreView').hidden, true);
  assert.equal(dom.get('compareView').hidden, false);
  assert.equal(dom.get('navCompare').getAttribute('aria-current'), 'page');
  assert.equal(dom.get('navExplore').getAttribute('aria-current'), undefined);
  assert.equal(dom.get('xpPercentLabel').textContent, '42,50%');
  assert.match(dom.get('mpPerKill').textContent, /^\d+ MP$/);
  assert.equal(dom.get('compareEmpty').hidden, false);
  dom.click('navExplore');
  assert.equal(dom.get('exploreView').hidden, false);
  assert.equal(dom.get('compareView').hidden, true);
  assert.equal(storage.read(STORAGE_KEYS.state).area, selected);
  assert.equal(storage.read(STORAGE_KEYS.state).level, 17);
});

test('browser tabs support click and keyboard navigation without losing scroll', t => {
  const { dom } = mount(t);
  dom.get('areaList').scrollTop = 120;
  dom.click('browserMobs');
  assert.equal(dom.get('browseAreas').hidden, true);
  assert.equal(dom.get('browseMobs').hidden, false);
  assert.equal(dom.get('browserMobs').getAttribute('aria-selected'), 'true');
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value: 'ArrowLeft' });
  dom.get('browserMobs').dispatchEvent(event);
  assert.equal(dom.get('browseAreas').hidden, false);
  assert.equal(dom.get('browserAreas').tabIndex, 0);
  assert.equal(globalThis.document.activeElement, dom.get('browserAreas'));
  assert.equal(dom.get('areaList').scrollTop, 120);
});

test('selecting a monster opens contextual details; closing preserves the XP target', t => {
  const { dom, storage } = mount(t);
  dom.delegate({ area: 'Shadow of the Mother Tree' });
  assert.equal(dom.get('browseMobs').hidden, false);
  dom.delegate({ mob: 'm001' });
  assert.equal(dom.get('targetPanel').hidden, false);
  assert.equal(dom.get('targetName').textContent, 'Young Red Keltir');
  assert.equal(dom.get('exploreWorkspace').classList.contains('has-target'), true);
  dom.input('attackMode', 'physical', 'change');
  assert.equal(dom.get('matkField').hidden, true);
  assert.equal(dom.get('patkField').hidden, false);
  assert.equal(dom.get('skillPowerField').hidden, true);
  assert.equal(dom.get('mpPanel').hidden, true);
  assert.equal(dom.get('targetDefenseLabel').textContent, 'P.Def');
  dom.click('targetClose');
  assert.equal(dom.get('targetPanel').hidden, true);
  assert.equal(storage.read(STORAGE_KEYS.state).mob, 'm001');
  assert.equal(dom.get('exploreWorkspace').classList.contains('has-target'), false);
  assert.equal(globalThis.document.activeElement, dom.get('browserMobs'));
});

test('comparison selection updates navigation, clears and opens areas outside active filters', async t => {
  const { dom, storage } = mount(t, { level: 17 });
  dom.click('compareAdd');
  const area = storage.read(STORAGE_KEYS.state).area;
  dom.click('navCompare');
  assert.equal(dom.get('compareEmpty').hidden, true);
  assert.equal(dom.get('compareNavCount').textContent, 1);
  assert.match(dom.get('compareNotice').textContent, /^1 de 2/);
  dom.click('navExplore');
  dom.input('search', 'Young Red Keltir');
  await new Promise(resolve => setTimeout(resolve, 140));
  dom.click('navCompare');
  dom.delegate({ area });
  assert.equal(dom.get('compareView').hidden, true);
  assert.equal(dom.get('browseMobs').hidden, false);
  assert.equal(storage.read(STORAGE_KEYS.state).area, area);
  assert.equal(storage.read(STORAGE_KEYS.state).query, '');
  assert.equal(dom.get('search').value, '');
  dom.click('navCompare');
  dom.click('compareClose');
  assert.equal(dom.get('compareEmpty').hidden, false);
  assert.equal(dom.get('compareNavCount').textContent, 0);
  dom.click('compareEmptyExplore');
  assert.equal(dom.get('exploreView').hidden, false);
  assert.equal(globalThis.document.activeElement, dom.get('search'));
});

test('restoring a selected monster opens its panel and destroying removes navigation listeners', t => {
  const dom = installDomFixture();
  const storage = memoryStorage({ [STORAGE_KEYS.state]: JSON.stringify({ area: 'Shadow of the Mother Tree', mob: 'm001' }) });
  const app = createApp({ storage, source });
  t.after(() => dom.cleanup());
  assert.equal(dom.get('targetPanel').hidden, false);
  assert.equal(dom.get('browseMobs').hidden, false);
  app.destroy();
  dom.click('navCompare');
  assert.equal(dom.get('compareView').hidden, true);
});
