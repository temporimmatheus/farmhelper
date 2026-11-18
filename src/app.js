import { $ } from './ui/dom.js';
import { byName } from './core/utils.js';
import { createStorage } from './core/storage.js';
import { createCharacterStore } from './state/character-store.js';
import { createSpawnRepository } from './services/spawn-repository.js';
import { createSpawnSync } from './services/spawn-sync.js';
import { MOBS } from './data/monsters.js';
import { createFarmModel } from './domain/farm-model.js';
import { createAreasView } from './features/areas/areas-view.js';
import { createDetailsView } from './features/areas/details-view.js';
import { createCompareView } from './features/compare/compare-view.js';
import { createProgressView } from './features/progress/progress-view.js';
import { createMapController } from './features/map/map-controller.js';
import { bindControls } from './ui/bindings.js';

export function createApp({ storage = createStorage(), source } = {}) {
  const store = createCharacterStore(storage);
  const { state } = store;
  const repository = createSpawnRepository(storage, MOBS);
  const model = createFarmModel(state, repository);
  const context = { state, model };
  const areas = createAreasView(context);
  const details = createDetailsView(context);
  const compare = createCompareView(context);
  const progress = createProgressView(context);
  const map = createMapController({ ...context, repository, updateWorld: world => store.patch({ world }) });
  function render(options = {}) {
    const visible = model.visibleZones();
    if (!visible.some(area => area.zone === state.area)) store.patch({ area: visible[0]?.zone || '', mob: '' });
    const query = byName(state.query);
    if (query) {
      const exact = MOBS.find(mob => byName(mob.name) === query);
      const matches = exact ? [exact] : MOBS.filter(mob => byName(mob.name).includes(query));
      if (matches.length === 1 && matches[0].zone === state.area) store.patch({ mob: matches[0].id });
    }
    areas.render(); details.render(); progress.render(); map.render(options); compare.render();
    store.save();
  }
  const sync = createSpawnSync({
    repository, storage, monsters: MOBS, source,
    onStatus(message, type) { $('sourceBadge').textContent = message; $('sourceBadge').className = `status-pill ${type}`; },
    onBusy(busy) { $('reload').disabled = busy; },
    onComplete() { render({ focus: true }); },
  });
  const unbind = bindControls({ store, model, map, render, renderProgress: progress.render, sync });
  map.initialize();
  render({ focus: true }); sync.refresh();
  const timer = setTimeout(() => sync.sync(), 450);
  return { destroy() { clearTimeout(timer); unbind(); map.destroy(); } };
}
