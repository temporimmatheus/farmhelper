import { $ } from '../../ui/dom.js';
import { esc } from '../../core/utils.js';
import { emptyMessage } from '../../ui/components.js';

export function createAreasView({ state, model }) {
  function render() {
    const areas = model.visibleZones();
    const maximum = Math.max(1, ...areas.map(area => area.score));
    $('areaCount').textContent = `${areas.length} áreas · ${model.MOBS.length} mobs`;
    $('recommendedBtn').classList.toggle('active', state.scope === 'near');
    $('allBtn').classList.toggle('active', state.scope === 'all');
    $('areaCoverage').textContent = `${areas.filter(area => area.withSpawns).length} com registros C1`;
    $('areaRankingNote').textContent = model.combatConfigured
      ? 'Índice relativo de XP por ação estimada'
      : 'Informe o poder da skill para incluir casts no índice';
    $('areaList').innerHTML = areas.length ? areas.map((area, index) => {
      const selected = state.area === area.zone;
      const score = Math.round(100 * area.score / maximum);
      return `<button type="button" class="area-row ${selected ? 'chosen' : ''}" data-area="${esc(area.zone)}" aria-pressed="${selected}">
        <span class="area-num">${String(index + 1).padStart(2, '0')}</span>
        <span class="area-copy"><span class="area-name">${esc(area.zone)}</span><span class="area-sub">Níveis ${area.lowLv}–${area.highLv} · ${area.mobs.length} monstros · ${area.withSpawns} localizados</span></span>
        <span class="area-score" title="Índice relativo às áreas da lista atual">${score}<small>/100</small></span>
      </button>`;
    }).join('') : emptyMessage('Nenhuma área encontrada', 'Tente outro nome de área ou monstro, ou limpe a busca.');
  }
  return { render };
}
