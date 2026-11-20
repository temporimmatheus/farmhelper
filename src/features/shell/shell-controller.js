import { $ } from '../../ui/dom.js';
import { fnum } from '../../core/utils.js';
import { badge } from '../../ui/components.js';
import { getCombatObservation } from '../../domain/combat-estimate.js';
import { createMobileController } from '../mobile/mobile-controller.js';

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
  const mobile = createMobileController({ initialSection: state.mob ? 'mobs' : 'areas', onNavigate: showMobileSection, onShowCompare: () => showView('compare'), onOpenTarget: openTarget, onCloseTarget: () => closeTarget({ focus: true }) });
  function listen(id, event, handler) {
    const element = $(id);
    element.addEventListener(event, handler);
    cleanups.push(() => element.removeEventListener(event, handler));
  }
  function showView(name) {
    if (!Object.hasOwn(VIEWS, name)) return;
    currentView = name;
    if (name !== 'explore' && mobile.isMobile) inspectorOpen = false;
    for (const [key, view] of Object.entries(VIEWS)) {
      $(view.panel).hidden = key !== name;
      if (key === name) $(view.button).setAttribute('aria-current', 'page');
      else $(view.button).removeAttribute('aria-current');
    }
    mobile.setView(name);
    if (name !== 'explore' && mobile.isMobile) update();
    layoutChanged();
  }
  function showBrowser(name) {
    if (!Object.hasOwn(BROWSER_TABS, name)) return;
    currentBrowser = name;
    mobile.setSection(name);
    for (const [key, tab] of Object.entries(BROWSER_TABS)) {
      const selected = key === name;
      $(tab.panel).hidden = !selected;
      $(tab.button).setAttribute('aria-selected', String(selected));
      $(tab.button).tabIndex = selected ? 0 : -1;
    }
    layoutChanged();
  }
  function showMobileSection(name) {
    showView('explore');
    if (name === 'map') mobile.setSection('map');
    else showBrowser(name);
  }
  function update() {
    const comparisons = state.compare.filter(zone => model.zMap.has(zone));
    $('compareNavCount').textContent = comparisons.length;
    $('mobileCompareCount').textContent = comparisons.length;
    $('mobileCompareOpen').setAttribute('aria-label', `Comparar áreas: ${comparisons.length} selecionadas`);
    $('compareEmpty').hidden = comparisons.length > 0;
    const notice = `${comparisons.length} de 2 áreas selecionadas`;
    if ($('compareNotice').textContent !== notice) $('compareNotice').textContent = notice;
    $('recommendedBtn').setAttribute('aria-pressed', String(state.scope === 'near'));
    $('allBtn').setAttribute('aria-pressed', String(state.scope === 'all'));
    $('matkField').hidden = state.mode === 'physical';
    $('patkField').hidden = state.mode === 'magic';
    $('skillPowerField').hidden = state.mode === 'physical';
    $('mpSkillField').hidden = state.mode === 'physical';
    $('mpPanel').hidden = state.mode === 'physical';
    $('progressDashboard').classList.toggle('physical-mode', state.mode === 'physical');
    $('mobileMpSkillStat').hidden = state.mode === 'physical';
    $('mobileMpPerMobStat').hidden = state.mode === 'physical';
    $('mobileMpRemainingStat').hidden = state.mode === 'physical';
    $('mobileSummary').classList.toggle('physical-mode', state.mode === 'physical');
    const target = model.MOB.get(state.mob);
    const visible = Boolean(inspectorOpen && target && target.zone === state.area);
    const changed = $('targetPanel').hidden === visible;
    $('targetPanel').hidden = !visible;
    $('exploreWorkspace').classList.toggle('has-target', visible);
    if (visible) {
      $('targetName').textContent = target.name;
      $('targetLevel').textContent = `Nível ${target.lv}`;
      $('targetZone').textContent = target.zone;
      const combat = model.estimateCombat(target);
      const observation = getCombatObservation(state, target);
      const damageText = combat && combat.damageMin === combat.damageMax
        ? fnum(combat.damageMin)
        : combat ? `${fnum(combat.damageMin)}–${fnum(combat.damageMax)}` : '';
      $('targetCombatEstimate').textContent = combat
        ? `${combat.actions.label} ${combat.actionText} ${combat.actionsSource === 'observed' ? 'observados' : 'estimados'} por mob · ${damageText} de dano ${combat.damageSource === 'observed' ? 'observado' : 'estimado'} por ação${combat.mode === 'magic' ? ` · ${fnum(combat.mpPerMob)} MP por mob` : ''}.`
        : state.mode === 'magic'
          ? 'Informe o poder da skill para estimar casts e mana.'
          : 'Sem dados suficientes para estimar ataques contra este monstro.';
      $('observedDamageMin').value = observation?.damageMin ?? '';
      $('observedDamageMax').value = observation?.damageMax ?? '';
      $('observedActions').value = observation?.actions ?? '';
      $('combatObservationStatus').textContent = observation
        ? 'Observação carregada para os atributos atuais.'
        : 'Nenhuma observação salva para este monstro e configuração.';
      const locations = model.mobData(target);
      const locationSummary = [];
      if (locations.points.length) locationSummary.push(`${fnum(locations.points.length)} coordenadas fixas`);
      if (locations.areas.length) locationSummary.push(`${fnum(locations.areas.length)} territórios aproximados`);
      $('targetLocationSummary').textContent = locationSummary.length
        ? `${locationSummary.join(' · ')}. Os spawns podem diferir do servidor atual.`
        : 'Sem registros de localização C1 para este monstro.';
      $('targetXp').textContent = fnum(model.expMob(target));
      $('targetHp').textContent = fnum(target.hp);
      $('targetDefenseLabel').textContent = state.mode === 'magic' ? 'M.Def' : 'P.Def';
      $('targetDefense').textContent = fnum(model.def(target));
      $('targetSpawns').textContent = fnum(model.countPlaces(target));
      const aggression = typeof target.agg === 'boolean'
        ? badge(target.agg ? 'Agressivo' : 'Passivo', { tone: target.agg ? 'warning' : 'neutral' })
        : badge('Agressividade n/d');
      $('targetTraits').innerHTML = aggression + badge(target.defQuality === 'exact' ? 'Def. verificada' : 'Def. estimada', { tone: target.defQuality === 'exact' ? 'neutral' : 'warning', symbol: 'shield' });
    }
    mobile.setTargetVisible(visible);
    if (changed) layoutChanged();
  }
  function openTarget() { inspectorOpen = true; showView('explore'); if (!mobile.isMobile || mobile.section !== 'map') showBrowser('mobs'); update(); }
  function closeTarget({ focus = false } = {}) {
    inspectorOpen = false; update();
    if (focus) {
      if (mobile.isMobile) mobile.focusNavigation();
      else $(BROWSER_TABS[currentBrowser].button).focus();
    }
  }
  function showMap() {
    showView('explore');
    if (mobile.isMobile) {
      inspectorOpen = false;
      update();
      mobile.setSection('map');
    }
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
  mobile.initialize();
  showView('explore'); showBrowser(state.mob ? 'mobs' : 'areas'); update();
  return { showView, showBrowser, showMap, openTarget, closeTarget, update, get view() { return currentView; }, destroy() { cleanups.forEach(fn => fn()); mobile.destroy(); } };
}
