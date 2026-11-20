import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { STORAGE_KEYS } from '../../src/core/storage.js';
import { installDomFixture } from '../support/dom-fixture.js';
import { memoryStorage } from '../support/memory-storage.js';

const source = { async listFiles() { return []; } };
function mount(t, state = {}, { mobile = true, spawns = {} } = {}) {
  const dom = installDomFixture({ mobile });
  const storage = memoryStorage({ [STORAGE_KEYS.state]: JSON.stringify(state), [STORAGE_KEYS.spawns]: JSON.stringify(spawns) });
  const app = createApp({ storage, source });
  t.after(() => { app.destroy(); dom.cleanup(); });
  return { dom, storage };
}

test('mobile starts with one exploration section and an editable compact XP/MP summary', t => {
  const { dom } = mount(t);
  assert.equal(dom.get('mobileSummary').hidden, false);
  assert.equal(dom.get('mobileNavigation').hidden, false);
  assert.equal(dom.get('browserPanel').hidden, false);
  assert.equal(dom.get('mapPanel').hidden, true);
  assert.equal(dom.get('setupPanel').hidden, true);
  assert.equal(dom.get('mobileXpRemaining').textContent, '—');
  assert.equal(dom.get('mobileMpSkill').textContent, '15');
  assert.equal(dom.get('mobileMpPerKill').textContent, '—');
  dom.click('mobileSettingsToggle');
  assert.equal(dom.get('setupPanel').hidden, false);
  assert.equal(dom.get('setupPanel').open, true);
  assert.equal(dom.get('mobileSettingsToggle').getAttribute('aria-expanded'), 'true');
  dom.input('level', 17); dom.input('xpExact', '50,25'); dom.input('mpSkill', 20); dom.input('skillPower', 10);
  assert.equal(dom.get('mobileLevelSummary').textContent, 'Nível 17');
  assert.equal(dom.get('mobileXpPercent').textContent, dom.get('xpPercentLabel').textContent);
  assert.equal(dom.get('mobileXpRemaining').textContent, dom.get('xpRemaining').textContent);
  assert.equal(dom.get('mobileKills').textContent, dom.get('xpKills').textContent);
  assert.equal(dom.get('mobileMpSkill').textContent, '20');
  assert.equal(dom.get('mobileMpPerKill').textContent, dom.get('mpPerKill').textContent.replace(' MP', ''));
  assert.equal(dom.get('mobileMpRemaining').textContent + ' MP', dom.get('mpRemaining').textContent);
  dom.click('mobileSettingsToggle');
  assert.equal(dom.get('setupPanel').hidden, true);
  assert.equal(dom.get('mobileXpPercent').textContent, '50,25%');
});

test('numbered mobile steps preserve lists and map zoom', t => {
  const { dom } = mount(t);
  dom.get('areaList').scrollTop = 170;
  dom.click('mobileMapTab');
  assert.equal(dom.get('browserPanel').hidden, true);
  assert.equal(dom.get('mapPanel').hidden, false);
  assert.equal(dom.get('mobileMapTab').getAttribute('aria-selected'), 'true');
  dom.click('zoomIn');
  const transform = dom.get('mapWorld').style.transform;
  dom.click('mobileMobsTab');
  dom.get('mobScroll').scrollTop = 50;
  dom.get('areaList').scrollTop = 170;
  assert.equal(dom.get('browseMobs').hidden, false);
  assert.equal(dom.get('mapPanel').hidden, true);
  dom.click('mobileAreasTab');
  assert.equal(dom.get('areaList').scrollTop, 170);
  dom.click('mobileMobsTab');
  assert.equal(dom.get('mobScroll').scrollTop, 50);
  dom.click('mobileMapTab');
  assert.equal(dom.get('mapWorld').style.transform, transform);
  assert.equal(dom.get('exploreWorkspace').lastScrollIntoView.block, 'start');
});

test('mobile navigation supports arrows, Home and End with roving focus', t => {
  const { dom } = mount(t);
  function key(id, value) {
    const event = new Event('keydown', { cancelable: true });
    Object.defineProperty(event, 'key', { value });
    dom.get(id).dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
  }
  key('mobileAreasTab', 'ArrowRight');
  assert.equal(globalThis.document.activeElement, dom.get('mobileMobsTab'));
  assert.equal(dom.get('mobileMobsTab').tabIndex, 0);
  key('mobileMobsTab', 'End');
  assert.equal(dom.get('mapPanel').hidden, false);
  key('mobileMapTab', 'Home');
  assert.equal(dom.get('browseAreas').hidden, false);
  assert.equal(dom.get('mobileAreasTab').tabIndex, 0);
});

test('target sheet closes by button, Escape or backdrop without clearing the target', t => {
  const { dom, storage } = mount(t, { level: 17, scope: 'all' });
  dom.delegate({ area: 'Shadow of the Mother Tree' });
  dom.delegate({ mob: 'm001' });
  const sheet = dom.get('mobileTargetSheet');
  assert.equal(sheet.open, true);
  assert.equal(dom.get('targetPanel').parentElement, sheet);
  assert.equal(globalThis.document.activeElement, dom.get('targetClose'));
  assert.equal(globalThis.document.documentElement.classList.contains('target-sheet-open'), true);
  dom.click('targetClose');
  assert.equal(sheet.open, false);
  assert.equal(storage.read(STORAGE_KEYS.state).mob, 'm001');
  assert.equal(globalThis.document.activeElement, dom.get('mobileMobsTab'));
  dom.click('mobileTargetReopen');
  const cancel = new Event('cancel', { cancelable: true }); sheet.dispatchEvent(cancel);
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(sheet.open, false);
  dom.click('mobileTargetReopen');
  const inside = new Event('click');
  Object.defineProperties(inside, { clientX: { value: 20 }, clientY: { value: 20 } });
  sheet.dispatchEvent(inside);
  assert.equal(sheet.open, true);
  const outside = new Event('click');
  Object.defineProperties(outside, { clientX: { value: -1 }, clientY: { value: -1 } });
  sheet.dispatchEvent(outside);
  assert.equal(sheet.open, false);
  assert.equal(globalThis.document.documentElement.classList.contains('target-sheet-open'), false);
  assert.equal(storage.read(STORAGE_KEYS.state).mob, 'm001');
});

test('opening target details from the map preserves the active mobile map section', t => {
  const { dom } = mount(t, { scope: 'all' });
  dom.click('mobileMapTab');
  dom.delegate({ mob: 'm001' });
  assert.equal(dom.get('mobileTargetSheet').open, true);
  assert.equal(dom.get('mapPanel').hidden, false);
  assert.equal(dom.get('mobileMapTab').getAttribute('aria-selected'), 'true');
  dom.click('targetClose');
  assert.equal(dom.get('mapPanel').hidden, false);
  assert.equal(globalThis.document.activeElement, dom.get('mobileMapTab'));
});

test('target location action opens the selected mob on the mobile map', t => {
  const { dom, storage } = mount(t, { scope: 'all' });
  dom.delegate({ mob: 'c1-bind-poison-spider-06-gludin-town' });
  assert.equal(dom.get('mobileTargetSheet').open, true);
  dom.click('targetLocate');
  assert.equal(dom.get('mobileTargetSheet').open, false);
  assert.equal(dom.get('mobileMapTab').getAttribute('aria-selected'), 'true');
  assert.equal(dom.get('mapPanel').hidden, false);
  assert.equal(storage.read(STORAGE_KEYS.state).mob, 'c1-bind-poison-spider-06-gludin-town');
  assert.match(dom.get('mapStatus').textContent, /^Bind Poison Spider:/);
});

test('mobile Compare keeps the compact summary available and restores exploration navigation', t => {
  const { dom } = mount(t, { level: 17, xpPercent: 25 });
  dom.click('compareAdd');
  assert.equal(dom.get('mobileCompareCount').textContent, 1);
  dom.click('mobileCompareOpen');
  assert.equal(dom.get('compareView').hidden, false);
  assert.equal(dom.get('mobileNavigation').hidden, true);
  assert.equal(dom.get('mobileSummary').hidden, false);
  assert.equal(dom.get('mobileXpPercent').textContent, '25,00%');
  dom.click('compareExplore');
  assert.equal(dom.get('mobileNavigation').hidden, false);
  assert.equal(dom.get('browseAreas').hidden, false);
});

test('desktop/mobile transitions reuse the same target panel and restore the full configuration', t => {
  const { dom, storage } = mount(t, { area: 'Shadow of the Mother Tree', mob: 'm001' }, { mobile: false });
  const panel = dom.get('targetPanel');
  assert.equal(panel.parentElement, dom.get('exploreWorkspace'));
  dom.setMobile(true);
  assert.equal(dom.get('mobileTargetSheet').open, true);
  assert.equal(panel.parentElement, dom.get('mobileTargetSheet'));
  dom.setMobile(false);
  assert.equal(dom.get('mobileTargetSheet').open, false);
  assert.equal(panel.parentElement, dom.get('exploreWorkspace'));
  assert.equal(panel.hidden, false);
  assert.equal(dom.get('mobileSummary').hidden, true);
  assert.equal(dom.get('setupPanel').hidden, false);
  assert.equal(dom.get('mapPanel').hidden, false);
  assert.equal(dom.get('mapPanel').getAttribute('role'), undefined);
  assert.equal(storage.read(STORAGE_KEYS.state).mob, 'm001');
});

test('switching to mobile while editing keeps the focused field available', t => {
  const { dom } = mount(t, { level: 17 }, { mobile: false });
  dom.get('mpSkill').focus();
  dom.setMobile(true);
  assert.equal(dom.get('setupPanel').hidden, false);
  assert.equal(dom.get('setupPanel').open, true);
  assert.equal(dom.get('mobileSettingsToggle').getAttribute('aria-expanded'), 'true');
  assert.equal(globalThis.document.activeElement, dom.get('mpSkill'));
});

test('destroying the mobile shell closes its sheet, unlocks scrolling and removes media listeners', () => {
  const dom = installDomFixture({ mobile: true });
  const storage = memoryStorage({ [STORAGE_KEYS.state]: JSON.stringify({ area: 'Shadow of the Mother Tree', mob: 'm001' }) });
  const app = createApp({ storage, source });
  try {
    assert.equal(dom.get('mobileTargetSheet').open, true);
    app.destroy();
    assert.equal(dom.get('mobileTargetSheet').open, false);
    assert.equal(globalThis.document.documentElement.classList.contains('target-sheet-open'), false);
    assert.equal(dom.get('targetPanel').parentElement, dom.get('exploreWorkspace'));
    assert.equal(dom.get('mapPanel').getAttribute('role'), undefined);
    dom.setMobile(false); dom.setMobile(true); dom.click('mobileSettingsToggle');
    assert.equal(dom.get('appShell').classList.contains('mobile-mode'), false);
    assert.equal(dom.get('mobileNavigation').hidden, true);
  } finally { dom.cleanup(); }
});

test('framing requested while the map is hidden is applied when its viewport becomes visible', t => {
  const { dom } = mount(t, { area: 'Talking Island Village', scope: 'all' }, { spawns: {
    m002: { points: [{ x: -84318, y: 244579 }], areas: [] },
    m010: { points: [{ x: 140450, y: 26199 }], areas: [] },
  } });
  const viewport = dom.get('mapViewport');
  viewport.clientWidth = 0; viewport.clientHeight = 0;
  dom.delegate({ mob: 'm002' });
  dom.click('targetClose');
  viewport.clientWidth = 600; viewport.clientHeight = 525;
  dom.click('mobileMapTab');
  assert.equal(dom.get('mapZoomLabel').textContent, '500%');
});
