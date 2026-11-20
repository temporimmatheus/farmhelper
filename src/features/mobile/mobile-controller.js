import { $ } from '../../ui/dom.js';

const TABS = { areas: 'mobileAreasTab', mobs: 'mobileMobsTab', map: 'mobileMapTab' };
const MAP_CONTROLS = ['mapViewport', 'zoomIn', 'zoomOut', 'zoomFit', 'zoomArea', 'zoomTarget', 'toggleHeat', 'toggleSpawns'];
const CONFIGURATION = ['level', 'matk', 'patk', 'skillPower', 'attackMode', 'xpRange', 'xpExact', 'mpSkill'];
const MOBILE_MEDIA = '(max-width: 760px), (max-width: 1024px) and (pointer: coarse)';

/** Owns responsive presentation only. It reuses the existing panels, inputs and selected target. */
export function createMobileController({ initialSection = 'areas', onNavigate, onShowCompare, onOpenTarget, onCloseTarget }) {
  const media = window.matchMedia?.(MOBILE_MEDIA) || { matches: false };
  const sheet = $('mobileTargetSheet'), targetPanel = $('targetPanel');
  let section = initialSection, view = 'explore', targetVisible = false, settingsOpen = false;
  let summaryHeight = 0;
  let destroyed = false;
  const cleanups = [];
  const layoutChanged = () => window.dispatchEvent(new Event('resize'));
  const summaryObserver = globalThis.ResizeObserver ? new ResizeObserver(() => {
    if (destroyed || !media.matches) return;
    const height = Math.ceil($('mobileSummary').getBoundingClientRect().height);
    if (height > 0 && height !== summaryHeight) {
      summaryHeight = height;
      $('appShell').style.setProperty('--mobile-summary-height', `${height}px`);
      layoutChanged();
    }
  }) : null;
  summaryObserver?.observe($('mobileSummary'));
  function listen(element, event, handler) {
    element.addEventListener(event, handler);
    cleanups.push(() => element.removeEventListener(event, handler));
  }
  function updateSheet() {
    const shouldOpen = media.matches && view === 'explore' && targetVisible;
    if (shouldOpen && !sheet.open) {
      sheet.showModal();
      $('targetClose').focus({ preventScroll: true });
    } else if (!shouldOpen && sheet.open) sheet.close();
    document.documentElement.classList.toggle('target-sheet-open', Boolean(sheet.open));
  }
  function updateVisibility() {
    const mobile = media.matches;
    $('mobileSummary').hidden = !mobile;
    $('mobileNavigation').hidden = !mobile || view !== 'explore';
    $('setupPanel').hidden = mobile && !settingsOpen;
    if (mobile) $('setupPanel').open = settingsOpen;
    $('mobileSettingsToggle').setAttribute('aria-expanded', String(settingsOpen));
    $('mobileSettingsToggle').textContent = settingsOpen ? 'Fechar edição' : 'Configurar';
    $('browserPanel').hidden = mobile && section === 'map';
    $('mapPanel').hidden = mobile && section !== 'map';
    $('appShell').dataset.mobileSection = section;
    for (const [name, id] of Object.entries(TABS)) {
      $(id).setAttribute('aria-selected', String(name === section));
      $(id).tabIndex = name === section ? 0 : -1;
    }
    updateSheet();
  }
  function applyMode() {
    const focusedId = document.activeElement?.id;
    $('appShell').classList.toggle('mobile-mode', media.matches);
    if (media.matches) {
      if (targetPanel.parentElement !== sheet) sheet.append(targetPanel);
      if (CONFIGURATION.includes(focusedId)) settingsOpen = true;
    } else {
      if (sheet.open) sheet.close();
      document.documentElement.classList.remove('target-sheet-open');
      if (targetPanel.parentElement !== $('exploreWorkspace')) $('exploreWorkspace').append(targetPanel);
    }
    $('browseAreas').setAttribute('aria-labelledby', media.matches ? TABS.areas : 'browserAreas');
    $('browseMobs').setAttribute('aria-labelledby', media.matches ? TABS.mobs : 'browserMobs');
    $('mapPanel').setAttribute('aria-labelledby', media.matches ? TABS.map : 'mapTitle');
    if (media.matches) $('mapPanel').setAttribute('role', 'tabpanel');
    else $('mapPanel').removeAttribute('role');
    updateVisibility();
    if (media.matches && MAP_CONTROLS.includes(focusedId)) onNavigate('map');
    if (media.matches && ['browserAreas', 'browserMobs'].includes(focusedId)) focusNavigation();
    if (!media.matches && [...Object.values(TABS), 'mobileSettingsToggle'].includes(focusedId)) $('browserAreas').focus();
    layoutChanged();
  }
  function setSection(name) {
    if (!Object.hasOwn(TABS, name)) return;
    section = name; updateVisibility(); layoutChanged();
  }
  function focusNavigation() { $(view === 'explore' ? TABS[section] : 'navCompare').focus({ preventScroll: true }); }
  function navigate(name) {
    onNavigate(name);
    if (media.matches) $('exploreWorkspace').scrollIntoView?.({ block: 'start', behavior: 'auto' });
  }
  for (const [name, id] of Object.entries(TABS)) {
    listen($(id), 'click', () => navigate(name));
    listen($(id), 'keydown', event => {
      const names = Object.keys(TABS), index = names.indexOf(name);
      const offsets = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: names.length - 1 - index };
      if (!Object.hasOwn(offsets, event.key)) return;
      event.preventDefault();
      const next = names[(index + offsets[event.key] + names.length) % names.length];
      navigate(next); $(TABS[next]).focus();
    });
  }
  listen($('mobileSettingsToggle'), 'click', () => { settingsOpen = !settingsOpen; updateVisibility(); layoutChanged(); });
  listen($('mobileTargetReopen'), 'click', onOpenTarget);
  listen($('mobileCompareOpen'), 'click', onShowCompare);
  listen(sheet, 'cancel', event => { event.preventDefault(); onCloseTarget(); });
  listen(sheet, 'click', event => {
    if (event.target !== sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onCloseTarget();
  });
  media.addEventListener?.('change', applyMode);
  return {
    initialize: applyMode,
    setSection,
    setView(name) { view = name; updateVisibility(); },
    setTargetVisible(visible) { targetVisible = visible; updateSheet(); },
    focusNavigation,
    get isMobile() { return media.matches; },
    get section() { return section; },
    destroy() {
      destroyed = true;
      cleanups.forEach(fn => fn());
      media.removeEventListener?.('change', applyMode);
      summaryObserver?.disconnect();
      if (sheet.open) sheet.close();
      document.documentElement.classList.remove('target-sheet-open');
      $('exploreWorkspace').append(targetPanel);
      $('appShell').classList.remove('mobile-mode');
      $('mobileSummary').hidden = true; $('mobileNavigation').hidden = true;
      $('setupPanel').hidden = false;
      $('browserPanel').hidden = false; $('mapPanel').hidden = false;
      $('browseAreas').setAttribute('aria-labelledby', 'browserAreas');
      $('browseMobs').setAttribute('aria-labelledby', 'browserMobs');
      $('mapPanel').setAttribute('aria-labelledby', 'mapTitle');
      $('mapPanel').removeAttribute('role');
    },
  };
}
