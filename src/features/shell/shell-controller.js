import { $ } from '../../ui/dom.js';
import { fnum } from '../../core/utils.js';
import { badge } from '../../ui/components.js';

// Navigation belongs to the shell; character, formulas and saved selections stay in the store.
const VIEWS = {
  explore: { button: 'navExplore', panel: 'exploreView' },
  compare: { button: 'navCompare', panel: 'compareView' },
};
const BROWSER_TABS = {
  areas: { button: 'browserAreas', panel: 'browseAreas' },
  mobs: { button: 'browserMobs', panel: 'browseMobs' },
};

export function createShellController({ state, model }) {
  let currentView = 'explore', currentBrowser = 'areas';
  let inspectorOpen = Boolean(state.mob);
  const cleanups = [];
  const layoutChanged = () => window.dispatchEvent(new Event('resize'));
  function listen(id, event, handler) {
    const element = $(id);
    element.addEventListener(event, handler);
    cleanups.push(() => element.removeEventListener(event, handler));
  }
  function showView(name) {
    if (!Object.hasOwn(VIEWS, name)) return;
    currentView = name;
    for (const [key, view] of Object.entries(VIEWS)) {
      $(view.panel).hidden = key !== name;
      if (key === name) $(view.button).setAttribute('aria-current', 'page');
      else $(view.button).removeAttribute('aria-current');
    }
    layoutChanged();
  }
  function showBrowser(name) {
    if (!Object.hasOwn(BROWSER_TABS, name)) return;
    currentBrowser = name;
    for (const [key, tab] of Object.entries(BROWSER_TABS)) {
      const selected = key === name;
      $(tab.panel).hidden = !selected;
      $(tab.button).setAttribute('aria-selected', String(selected));
      $(tab.button).tabIndex = selected ? 0 : -1;
    }
    layoutChanged();
  }
  function update() {
    const comparisons = state.compare.filter(zone => model.zMap.has(zone));
    $('compareNavCount').textContent = comparisons.length;
    $('compareEmpty').hidden = comparisons.length > 0;
    const notice = `${comparisons.length} de 2 áreas selecionadas`;
    if ($('compareNotice').textContent !== notice) $('compareNotice').textContent = notice;
    $('recommendedBtn').setAttribute('aria-pressed', String(state.scope === 'near'));
    $('allBtn').setAttribute('aria-pressed', String(state.scope === 'all'));
    const target = model.MOB.get(state.mob);
    const visible = Boolean(inspectorOpen && target && target.zone === state.area);
    const changed = $('targetPanel').hidden === visible;
    $('targetPanel').hidden = !visible;
    $('exploreWorkspace').classList.toggle('has-target', visible);
    if (visible) {
      $('targetName').textContent = target.name;
      $('targetLevel').textContent = `Nível ${target.lv}`;
      $('targetZone').textContent = target.zone;
      $('targetXp').textContent = fnum(model.expMob(target));
      $('targetHp').textContent = fnum(target.hp * 1.6);
      $('targetDefenseLabel').textContent = state.mode === 'magic' ? 'M.Def' : 'P.Def';
      $('targetDefense').textContent = fnum(model.def(target));
      $('targetSpawns').textContent = fnum(model.countPlaces(target));
      $('targetTraits').innerHTML = badge(target.agg ? 'Agressivo' : 'Passivo', { tone: target.agg ? 'warning' : 'neutral' }) + badge(target.defQuality === 'exact' ? 'Def. verificada' : 'Def. estimada', { tone: target.defQuality === 'exact' ? 'neutral' : 'warning', symbol: 'shield' });
    }
    if (changed) layoutChanged();
  }
  function openTarget() { inspectorOpen = true; showView('explore'); showBrowser('mobs'); update(); }
  function closeTarget({ focus = false } = {}) {
    inspectorOpen = false; update();
    if (focus) $(BROWSER_TABS[currentBrowser].button).focus();
  }
  for (const [name, view] of Object.entries(VIEWS)) listen(view.button, 'click', () => showView(name));
  for (const [name, tab] of Object.entries(BROWSER_TABS)) {
    listen(tab.button, 'click', () => showBrowser(name));
    listen(tab.button, 'keydown', event => {
      const names = Object.keys(BROWSER_TABS), index = names.indexOf(name);
      const offsets = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: names.length - 1 - index };
      if (!Object.hasOwn(offsets, event.key)) return;
      event.preventDefault();
      const next = names[(index + offsets[event.key] + names.length) % names.length];
      showBrowser(next); $(BROWSER_TABS[next].button).focus();
    });
  }
  for (const id of ['compareExplore', 'compareEmptyExplore']) listen(id, 'click', () => { showView('explore'); showBrowser('areas'); $('search').focus(); });
  listen('targetClose', 'click', () => closeTarget({ focus: true }));
  showView('explore'); showBrowser(state.mob ? 'mobs' : 'areas'); update();
  return { showView, showBrowser, openTarget, closeTarget, update, get view() { return currentView; }, destroy() { cleanups.forEach(fn => fn()); } };
}
