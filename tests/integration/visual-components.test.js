import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { STORAGE_KEYS } from '../../src/core/storage.js';
import { installDomFixture } from '../support/dom-fixture.js';
import { memoryStorage } from '../support/memory-storage.js';

const source = { async listFiles() { return []; } };
function mount(t, initial = {}, spawns = {}) {
  const dom = installDomFixture();
  const storage = memoryStorage({ [STORAGE_KEYS.state]: JSON.stringify(initial), [STORAGE_KEYS.spawns]: JSON.stringify(spawns) });
  const app = createApp({ storage, source });
  t.after(() => { app.destroy(); dom.cleanup(); });
  return { dom, storage };
}

test('monster cards prioritize XP, combat actions and locations; target details retain source quality', t => {
  const { dom } = mount(t, { scope: 'all' });
  dom.delegate({ area: 'Shadow of the Mother Tree' });
  dom.delegate({ mob: 'm001' });
  dom.input('attackMode', 'physical', 'change');
  const html = dom.get('mobList').innerHTML;
  assert.match(html, /data-mob="m001" aria-pressed="true"/);
  assert.match(html, /Alvo atual/);
  assert.match(html, /Para matar/);
  assert.match(html, /ataques/);
  assert.match(html, /mob-stats/);
  assert.match(dom.get('targetTraits').innerHTML, /Def\. estimada/);
  assert.match(dom.get('targetCombatEstimate').textContent, /ataques .* por mob/);
  dom.input('level', 17);
  assert.equal(dom.get('progressTargetName').textContent, 'Young Red Keltir');
  assert.equal(dom.get('progressTargetMode').textContent, 'Selecionado');
});

test('comparison aligns indicators, supports individual removal and preserves remaining selection', t => {
  const { dom, storage } = mount(t, { level: 17, compare: ['Talking Island Village', 'Gludin Village'] });
  dom.click('navCompare');
  assert.equal(dom.get('compareMetrics').hidden, false);
  assert.match(dom.get('compareMetrics').innerHTML, /<table class="comparison-table">/);
  assert.match(dom.get('compareMetrics').innerHTML, /MP até subir/);
  assert.match(dom.get('compareMetrics').innerHTML, /Monstros com localização/);
  assert.match(dom.get('compareMetrics').innerHTML, /cell-highlight/);
  dom.delegate({ removeCompare: 'Talking Island Village' });
  assert.deepEqual(storage.read(STORAGE_KEYS.state).compare, ['Gludin Village']);
  assert.equal(dom.get('compareMetrics').hidden, true);
  assert.match(dom.get('compareGrid').innerHTML, /Escolher segunda área/);
  assert.equal(globalThis.document.activeElement, dom.get('navCompare'));
  dom.delegate({ explore: 'areas' });
  assert.equal(dom.get('exploreView').hidden, false);
  assert.equal(dom.get('browseAreas').hidden, false);
});

test('map layers can be toggled independently and survive navigation and input changes', t => {
  const { dom } = mount(t);
  dom.click('toggleHeat');
  assert.equal(dom.get('heatCanvas').hidden, true);
  assert.equal(dom.get('toggleHeat').getAttribute('aria-pressed'), 'false');
  assert.equal(dom.get('mapPins').hidden, false);
  dom.click('toggleSpawns');
  assert.equal(dom.get('mapPins').hidden, true);
  assert.match(dom.get('mapPointHint').textContent, /ocultas/);
  dom.click('navCompare'); dom.click('navExplore'); dom.input('mpSkill', 20);
  assert.equal(dom.get('heatCanvas').hidden, true);
  assert.equal(dom.get('mapPins').hidden, true);
  dom.click('toggleHeat');
  assert.equal(dom.get('heatCanvas').hidden, false);
});

test('region, target and whole-map framing have distinct behavior and an explicit zoom label', t => {
  const { dom } = mount(t, { area: 'Talking Island Village', scope: 'all', mob: 'm002' }, {
    m002: { points: [{ x: -84318, y: 244579 }], areas: [] },
    m010: { points: [{ x: 140450, y: 26199 }], areas: [] },
  });
  assert.equal(dom.get('mapEmpty').hidden, true);
  assert.equal(dom.get('zoomTarget').disabled, false);
  assert.equal(dom.get('mapZoomLabel').textContent, '500%');
  assert.match(dom.get('mapSelectionName').textContent, /Young Keltir/);
  dom.click('zoomArea');
  const regionTransform = dom.get('mapWorld').style.transform;
  assert.equal(dom.get('mapZoomLabel').textContent, '100%');
  dom.click('zoomTarget');
  assert.notEqual(dom.get('mapWorld').style.transform, regionTransform);
  assert.equal(dom.get('mapZoomLabel').textContent, '500%');
  dom.click('zoomFit');
  assert.equal(dom.get('mapZoomLabel').textContent, '100%');
  dom.delegate({ world: 'elmore' });
  assert.equal(dom.get('mapEmpty').hidden, false);
  assert.equal(dom.get('zoomTarget').disabled, true);
  assert.equal(dom.get('zoomArea').disabled, true);
});

test('territory samples never appear as fixed target positions in the legend', t => {
  const { dom } = mount(t, { area: 'Talking Island Village', scope: 'all', mob: 'm002' }, {
    m002: { points: [], areas: [{ vertices: [{ x: -12672, y: 122776 }, { x: -20043, y: 137688 }, { x: -56235, y: 106668 }] }] },
  });
  assert.equal(dom.get('mapEmpty').hidden, true);
  assert.match(dom.get('mapPointHint').textContent, /sem posições fixas/);
  assert.equal(dom.get('targetLegend').hidden, true);
  assert.equal(dom.get('mapPins').innerHTML, '');
});

test('selected mob map isolates its location records and explains approximate territories', t => {
  const { dom } = mount(t, { scope: 'all' });
  dom.delegate({ mob: 'c1-bind-poison-spider-06-gludin-town' });
  assert.match(dom.get('targetLocationSummary').textContent, /territórios aproximados/);
  assert.match(dom.get('mapStatus').textContent, /^Bind Poison Spider: .*amostras aproximadas/);
  assert.match(dom.get('mapSelectionName').textContent, /Bind Poison Spider/);
  assert.equal(dom.get('mapEmpty').hidden, true);
  assert.equal(dom.get('zoomTarget').disabled, false);
});
