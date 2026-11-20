import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { STORAGE_KEYS } from '../../src/core/storage.js';
import { installDomFixture } from '../support/dom-fixture.js';
import { memoryStorage } from '../support/memory-storage.js';

const source = { async listFiles() { return []; } };

test('application mounts against real HTML IDs, starts at level zero and restores autosave', () => {
  const dom = installDomFixture(), storage = memoryStorage();
  let app;
  try {
    app = createApp({ storage, source });
    assert.equal(dom.get('level').value, 0);
    assert.equal(dom.get('xpRange').disabled, true);
    assert.match(dom.get('areaList').innerHTML, /data-area=/);
    dom.input('level', 17);
    dom.input('xpExact', '50,25');
    dom.input('mpSkill', 20);
    dom.input('castsKill', 3);
    assert.equal(dom.get('xpPercentLabel').textContent, '50,25%');
    assert.equal(dom.get('mpPerKill').textContent, '60 MP');
    assert.equal(storage.read(STORAGE_KEYS.state).level, 17);
    app.destroy();
    app = createApp({ storage, source });
    assert.equal(dom.get('level').value, 17);
    assert.equal(dom.get('xpPercentLabel').textContent, '50,25%');
    assert.equal(dom.get('mpPerKill').textContent, '60 MP');
    dom.input('level', 18);
    assert.equal(dom.get('xpPercentLabel').textContent, '0,00%');
  } finally { app?.destroy(); dom.cleanup(); }
});

test('search, delegated monster selection, comparison and map controls remain connected', async () => {
  const dom = installDomFixture(), storage = memoryStorage();
  let app;
  try {
    app = createApp({ storage, source });
    dom.input('search', 'Young Red Keltir');
    await new Promise(resolve => setTimeout(resolve, 140));
    assert.match(dom.get('areaList').innerHTML, /Shadow of the Mother Tree/);
    assert.match(dom.get('mobList').innerHTML, /Young Red Keltir/);
    dom.delegate({ mob: 'm001' });
    assert.equal(storage.read(STORAGE_KEYS.state).mob, 'm001');
    dom.click('compareAdd');
    assert.equal(dom.get('comparePanel').classList.contains('visible'), true);
    assert.match(dom.get('compareGrid').innerHTML, /Shadow of the Mother Tree/);
    dom.click('compareClose');
    assert.equal(dom.get('comparePanel').classList.contains('visible'), false);
    const before = dom.get('mapWorld').style.transform;
    dom.click('zoomIn');
    assert.notEqual(dom.get('mapWorld').style.transform, before);
    dom.delegate({ world: 'elmore' });
    assert.equal(dom.get('mapWorld').style.height, '750px');
    assert.equal(storage.read(STORAGE_KEYS.state).world, 'elmore');
    app.destroy();
    app = createApp({ storage, source });
    assert.equal(dom.get('mapWorld').style.height, '750px');
    dom.input('search', 'nonexistent-monster-123');
    await new Promise(resolve => setTimeout(resolve, 140));
    assert.equal(dom.get('mobList').innerHTML, '');
    assert.equal(dom.get('xpKills').textContent, '—');
  } finally { app?.destroy(); dom.cleanup(); }
});

test('cached map spawns project and render without external services', async () => {
  const dom = installDomFixture();
  const storage = memoryStorage({
    [STORAGE_KEYS.state]: JSON.stringify({ level: 17, area: 'Talking Island Village', scope: 'all', mob: 'm002' }),
    [STORAGE_KEYS.spawns]: JSON.stringify({ m002: { points: [{ x: -12672, y: 122776, z: 0 }], areas: [] } }),
  });
  let app;
  try {
    app = createApp({ storage, source });
    assert.match(dom.get('mapCoverage').textContent, /\d+ concentra/);
    for (let i = 0; i < 5; i++) dom.click('zoomIn');
    await new Promise(resolve => setTimeout(resolve, 130));
    assert.match(dom.get('mapPins').innerHTML, /map-pin selected/);
    dom.click('zoomFit');
    // Rendering after zoom is debounced; transform is immediate.
    assert.match(dom.get('mapWorld').style.transform, /scale\(/);
  } finally { app?.destroy(); dom.cleanup(); }
});
