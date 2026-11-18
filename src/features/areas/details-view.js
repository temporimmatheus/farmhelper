import { $ } from '../../ui/dom.js';
import { esc, fnum } from '../../core/utils.js';

export function createDetailsView({ state, model }) {
  function render() {
    const area = model.statZone(state.area);
    $('compareAdd').disabled = !area.mobs.length;
    if (!area.mobs.length) {
      $('areaTitle').textContent = 'Nenhuma área selecionada';
      $('areaLevelLabel').textContent = 'FARM POR ÁREA';
      $('areaBlurb').textContent = 'Busque um mob ou ajuste o nível para encontrar áreas de farm.';
      $('metrics').innerHTML = ''; $('mobList').innerHTML = '';
      $('mobsTitle').textContent = 'Mobs'; $('mobsCount').textContent = '0';
      $('qualityInfo').textContent = ''; $('compareAdd').textContent = '＋ Comparar';
      return;
    }
    const maximum = Math.max(1, ...model.visibleZones().map(row => row.score));
    $('areaTitle').textContent = area.zone;
    $('areaLevelLabel').textContent = `NÍVEIS ${area.lowLv}–${area.highLv} · ${area.mobs.length} MONSTROS`;
    $('areaBlurb').textContent = area.withSpawns
      ? `Existem coordenadas C1 para ${area.withSpawns} de ${area.mobs.length} mobs da região.`
      : 'Os monstros estão listados abaixo; ainda não há coordenadas C1 carregadas para esta área.';
    $('metrics').innerHTML = `
      <div class="metric"><small>Eficiência relativa</small><b>${Math.round(100 * area.score / maximum)}/100</b></div>
      <div class="metric"><small>XP alvo líder</small><b>${fnum(model.expMob(area.rank[0]?.m || area.mobs[0]))}</b></div>
      <div class="metric"><small>Registros de spawn</small><b>${fnum(area.sites)}</b></div>`;
    $('qualityInfo').textContent = 'Índice por HP, defesa, XP e ataque. Não representa XP/h medido; concentração refere-se aos registros da fonte C1.';
    const ranked = area.mobs.map(mob => ({ mob, score: model.mobScore(mob) })).sort((a, b) => b.score - a.score);
    const maximumMob = Math.max(1, ...ranked.map(row => row.score));
    $('mobsTitle').textContent = 'Todos os monstros da área';
    $('mobsCount').textContent = area.mobs.length + ' mobs';
    $('mobList').innerHTML = ranked.map(({ mob, score }) => `
      <button class="mob-card ${state.mob === mob.id ? 'focus' : ''}" data-mob="${esc(mob.id)}">
        <span class="mob-line"><span class="mob-name">${esc(mob.name)}</span><span class="level">Lv ${mob.lv}</span></span>
        <span class="mob-bits"><span>XP <b class="xp">${fnum(model.expMob(mob))}</b></span><span>HP <b>${fnum(mob.hp * 1.6)}</b></span><span>${state.mode === 'magic' ? 'M.Def' : 'P.Def'} <b>${fnum(model.def(mob))}</b></span></span>
        <span class="mob-bits"><span>Eficiência <b>${Math.round(100 * score / maximumMob)}/100</b></span><span>${model.countPlaces(mob)} registros C1</span><span class="${mob.defQuality === 'exact' ? '' : 'estimated'}">${mob.defQuality === 'exact' ? 'Def. verificada' : 'Def. estimada'}</span></span>
      </button>`).join('');
    $('compareAdd').textContent = state.compare.includes(area.zone) ? '✓ Na comparação' : '＋ Comparar';
  }
  return { render };
}
