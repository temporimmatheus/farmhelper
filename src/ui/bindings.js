import { $ } from './dom.js';
import { byName, clamp } from '../core/utils.js';

export function bindControls({ store, model, map, render, renderProgress, sync, shell }) {
  const { state } = store;
  let searchTimer;
  const cleanup = [];
  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    cleanup.push(() => target.removeEventListener(event, handler));
  }
  function numericInput(id, key, min, max) {
    const element = $(id);
    element.value = state[key];
    const apply = () => {
      const value = Number(element.value);
      if (element.value.trim() === '' || !Number.isFinite(value)) return;
      store.patch({ [key]: clamp(Math.round(value), min, max) });
      render();
    };
    listen(element, 'input', apply);
    listen(element, 'change', () => { apply(); element.value = state[key]; });
  }
  numericInput('level', 'level', 0, 40);
  numericInput('matk', 'matk', 1, 99999);
  numericInput('patk', 'patk', 1, 99999);
  numericInput('skillPower', 'skillPower', 0, 9999);
  numericInput('mpSkill', 'mpSkill', 0, 9999);
  const setXp = event => {
    const raw = event.target.value.trim();
    const value = Number(raw.replace(',', '.'));
    if (!raw || !Number.isFinite(value)) return;
    store.patch({ xpPercent: clamp(Math.round(value * 100) / 100, 0, 100) });
    renderProgress();
  };
  listen($('xpRange'), 'input', setXp);
  listen($('xpExact'), 'input', setXp);
  listen($('xpExact'), 'blur', renderProgress);
  listen($('targetLocate'), 'click', () => { shell.showMap(); render({ focus: true, targetOnly: true }); });
  listen($('saveCombatObservation'), 'click', () => {
    const mob = model.MOB.get(state.mob);
    if (!mob) return;
    const minInput = $('observedDamageMin'), maxInput = $('observedDamageMax'), actionsInput = $('observedActions');
    const minText = minInput.value.trim(), maxText = maxInput.value.trim(), actionsText = actionsInput.value.trim();
    const damageMin = minText ? Number(minText) : null;
    const damageMax = maxText ? Number(maxText) : null;
    const actions = actionsText ? Number(actionsText) : null;
    const invalidMin = minText && (!Number.isFinite(damageMin) || damageMin <= 0 || damageMin > 99999);
    const invalidMax = maxText && (!Number.isFinite(damageMax) || damageMax <= 0 || damageMax > 99999);
    const invalidRange = Boolean(minText) !== Boolean(maxText) || (damageMin !== null && damageMax !== null && damageMax < damageMin);
    const invalidActions = actionsText && (!Number.isInteger(actions) || actions <= 0 || actions > 1000);
    minInput.setAttribute('aria-invalid', String(Boolean(invalidMin || invalidRange)));
    maxInput.setAttribute('aria-invalid', String(Boolean(invalidMax || invalidRange)));
    actionsInput.setAttribute('aria-invalid', String(Boolean(invalidActions)));
    if (invalidMin || invalidMax || invalidRange || invalidActions) {
      $('combatObservationStatus').textContent = 'Informe dano mínimo/máximo válidos e ações positivas, ou deixe os campos em branco.';
      return;
    }
    const mobKey = mob.sourceName || mob.id;
    const mode = state.mode;
    const attack = mode === 'magic' ? state.matk : state.patk;
    const skillPower = mode === 'magic' ? state.skillPower : 0;
    const observations = state.combatObservations.filter(observation =>
      !(observation.mobKey === mobKey && observation.mode === mode && observation.attack === attack && observation.skillPower === skillPower)
    );
    if (damageMin !== null || actions !== null) {
      observations.push({
        mobKey, mode, attack, skillPower,
        ...(damageMin !== null ? { damageMin, damageMax } : {}),
        ...(actions !== null ? { actions } : {}),
      });
    }
    store.patch({ combatObservations: observations });
    render();
    $('combatObservationStatus').textContent = damageMin !== null || actions !== null
      ? 'Observação salva para esta configuração.'
      : 'Observação removida.';
  });
  $('attackMode').value = state.mode;
  listen($('attackMode'), 'change', event => { store.patch({ mode: event.target.value }); render(); });
  $('search').value = state.query;
  listen($('search'), 'input', event => {
    store.patch({ query: event.target.value });
    const query = byName(event.target.value);
    const exactMobName = model.MOBS.some(mob => byName(mob.name) === query);
    shell.showBrowser(exactMobName ? 'mobs' : 'areas');
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => render({ focus: true }), 100);
  });
  for (const [id, scope] of [['recommendedBtn', 'near'], ['allBtn', 'all']]) {
    listen($(id), 'click', () => { store.patch({ scope }); render(); });
  }
  listen(document, 'click', event => {
    const button = event.target.closest('[data-area],[data-mob],[data-world],[data-remove-compare],[data-explore]');
    if (!button) return;
    if (button.dataset.removeCompare) {
      store.patch({ compare: state.compare.filter(zone => zone !== button.dataset.removeCompare) });
      render();
      $('navCompare').focus();
      return;
    }
    if (Object.hasOwn(button.dataset, 'explore')) {
      shell.showView('explore'); shell.showBrowser('areas'); $('search').focus();
      return;
    }
    if (button.dataset.area && model.zMap.has(button.dataset.area)) {
      const fromComparison = shell.view === 'compare';
      store.patch({ area: button.dataset.area, mob: '', ...(fromComparison ? { query: '', scope: 'all' } : {}) });
      if (fromComparison) $('search').value = '';
      shell.closeTarget();
      shell.showView('explore');
      shell.showBrowser('mobs');
      render({ focus: true });
    }
    if (button.dataset.mob) {
      const mob = model.MOB.get(button.dataset.mob);
      if (mob) { store.patch({ area: mob.zone, mob: mob.id }); render({ focus: true }); shell.openTarget(); }
    }
    if (button.dataset.world) map.setWorld(button.dataset.world);
  });
  listen($('compareAdd'), 'click', () => {
    const area = state.area;
    if (!area) return;
    store.patch({ compare: state.compare.includes(area) ? state.compare.filter(z => z !== area) : [...state.compare.slice(-1), area] });
    render();
  });
  listen($('compareClose'), 'click', () => { store.patch({ compare: [] }); render(); });
  listen($('reload'), 'click', () => sync.sync(true));
  return () => { cleanup.forEach(fn => fn()); clearTimeout(searchTimer); };
}
