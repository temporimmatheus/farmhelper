import { $ } from '../../ui/dom.js';
import { esc, fnum } from '../../core/utils.js';

export function createCompareView({ state, model }) {
  function render() {
    const areas = state.compare.filter(zone => model.zMap.has(zone));
    $('comparePanel').classList.toggle('visible', areas.length > 0);
    $('compareGrid').innerHTML = areas.map(zone => {
      const area = model.statZone(zone), target = area.rank[0]?.m || area.mobs[0];
      return `<div class="compare-box">
        <h3>${esc(zone)}</h3>
        <p>Potencial comparativo: <strong>${area.score.toFixed(1)}</strong><br>
        Mobs: ${area.mobs.length} · níveis ${area.lowLv}–${area.highLv}<br>
        Registros C1: ${area.sites} · mobs com localização: ${area.withSpawns}<br>
        Melhor alvo estimado: ${esc(target.name)}<br>
        XP por kill deste alvo: ${fnum(model.expMob(target))}</p>
        <button class="quiet-btn" data-area="${esc(zone)}" style="margin-top:8px">Ver no mapa</button>
      </div>`;
    }).join('');
    if (areas.length === 1) $('compareGrid').insertAdjacentHTML('beforeend', '<div class="compare-box"><h3>Escolha uma segunda área</h3><p>Use o botão “Comparar” no painel da região desejada.</p></div>');
  }
  return { render };
}
