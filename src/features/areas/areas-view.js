import { $ } from '../../ui/dom.js';
import { esc } from '../../core/utils.js';

export function createAreasView({ state, model }) {
  function render() {
    const areas = model.visibleZones();
    const maximum = Math.max(1, ...areas.map(area => area.score));
    $('areaCount').textContent = `${areas.length} áreas · ${model.MOBS.length} mobs no catálogo`;
    $('recommendedBtn').classList.toggle('active', state.scope === 'near');
    $('allBtn').classList.toggle('active', state.scope === 'all');
    $('areaCoverage').textContent = `${areas.filter(area => area.withSpawns).length} com spawns`;
    $('areaList').innerHTML = areas.length ? areas.map((area, index) => `
      <div class="area-row ${state.area === area.zone ? 'chosen' : ''}">
        <span class="area-num">${index + 1}</span>
        <button class="area-select" data-area="${esc(area.zone)}">
          <span class="area-name">${esc(area.zone)}</span>
          <span class="area-sub">Lv ${area.lowLv}–${area.highLv} · ${area.mobs.length} mobs · ${area.sites ? area.sites + ' registros C1' : 'sem mapa C1'}</span>
        </button>
        <span class="area-score">${Math.round(100 * area.score / maximum)}<small>/100</small></span>
      </div>`).join('') : '<div class="no-data">Nenhuma área corresponde à busca. Apague o termo ou selecione “Todas”.</div>';
  }
  return { render };
}
