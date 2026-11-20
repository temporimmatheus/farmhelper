import { $ } from '../../ui/dom.js';
import { esc, fnum, matchesQuery } from '../../core/utils.js';
import { badge, metric, inlineStat, icon, emptyMessage } from '../../ui/components.js';

export function createDetailsView({ state, model }) {
  function render() {
    const area = model.statZone(state.area);
    $('compareAdd').disabled = !area.mobs.length;
    $('compareAdd').setAttribute('aria-pressed', String(state.compare.includes(area.zone)));
    if (!area.mobs.length) {
      $('areaTitle').textContent = 'Nenhuma área selecionada';
      $('areaLevelLabel').textContent = 'FARM POR ÁREA';
      $('areaBlurb').textContent = 'Escolha uma região para conhecer seus monstros.';
      $('metrics').innerHTML = ''; $('mobList').innerHTML = '';
      $('mobsTitle').textContent = 'Monstros'; $('mobsCount').textContent = '0';
      $('qualityInfo').textContent = ''; $('compareAdd').textContent = 'Comparar';
      return;
    }
    const maximum = Math.max(1, ...model.visibleZones().map(row => row.score));
    $('areaTitle').textContent = area.zone;
    $('areaLevelLabel').textContent = `REGIÃO · NÍVEIS ${area.lowLv}–${area.highLv}`;
    $('areaBlurb').textContent = area.withSpawns
      ? `${area.withSpawns} de ${area.mobs.length} monstros têm registros de localização C1.`
      : 'Sem registros de localização por enquanto. Os monstros e as estimativas continuam disponíveis.';
    $('metrics').innerHTML = [
      metric('Índice da área', Math.round(100 * area.score / maximum), { unit: '/100', tone: 'gold' }),
      metric('XP do líder', fnum(model.expMob(area.rank[0]?.m || area.mobs[0])), { tone: 'positive' }),
      metric('Registros C1', fnum(area.sites)),
    ].join('');
    $('qualityInfo').textContent = 'Índice relativo às áreas da lista; não representa XP/h ou respawn medido.';
    const matchingMobs = area.mobs.filter(mob => matchesQuery(mob.name, state.query));
    const visibleMobs = matchingMobs.length ? matchingMobs : area.mobs;
    const ranked = visibleMobs.map(mob => ({ mob, score: model.mobScore(mob) })).sort((a, b) => b.score - a.score);
    const maximumMob = Math.max(1, ...ranked.map(row => row.score));
    $('mobsTitle').textContent = 'Escolha seu alvo';
    $('mobsCount').textContent = matchingMobs.length && matchingMobs.length < area.mobs.length
      ? `${matchingMobs.length} de ${area.mobs.length} monstros`
      : `${area.mobs.length} monstros`;
    $('mobList').innerHTML = ranked.map(({ mob, score }) => {
      const selected = state.mob === mob.id, index = Math.round(100 * score / maximumMob);
      const aggression = typeof mob.agg === 'boolean'
        ? badge(mob.agg ? 'Agressivo' : 'Passivo', { tone: mob.agg ? 'warning' : 'neutral' })
        : badge('Agressividade n/d');
      return `<button type="button" class="mob-card ${selected ? 'focus' : ''}" data-mob="${esc(mob.id)}" aria-pressed="${selected}">
        <span class="mob-line"><span class="mob-name">${esc(mob.name)}</span><span class="level">Lv ${mob.lv}</span></span>
        <span class="mob-stats">${inlineStat('XP / kill', fnum(model.expMob(mob)), { tone: 'positive' })}${inlineStat('HP estimado', fnum(mob.hp * 1.6))}${inlineStat(state.mode === 'magic' ? 'M.Def' : 'P.Def', fnum(model.def(mob)))}</span>
        <span class="mob-score"><span>Índice na área</span><b>${index}<small>/100</small></b></span><span class="score-track" aria-hidden="true"><span style="width:${index}%"></span></span>
        <span class="mob-badges">${badge(mob.defQuality === 'exact' ? 'Def. verificada' : 'Def. estimada', { symbol: 'shield', tone: mob.defQuality === 'exact' ? 'neutral' : 'warning' })}${aggression}</span>
        <span class="mob-card-footer"><span>${icon('pin')}${model.countPlaces(mob) ? `${model.countPlaces(mob)} registros C1` : 'Sem posição C1'}</span><span class="mob-action">${icon(selected ? 'check' : 'target')}${selected ? 'Alvo atual' : 'Selecionar'}</span></span>
      </button>`;
    }).join('') || emptyMessage('Nenhum monstro nesta área', 'Escolha outra região para continuar.');
    const compared = state.compare.includes(area.zone);
    $('compareAdd').innerHTML = `${icon(compared ? 'check' : 'compare')}<span>${compared ? 'Na seleção' : 'Comparar'}</span>`;
    $('compareAdd').title = compared ? 'Remover esta área da comparação' : 'Adicionar esta área à comparação';
  }
  return { render };
}
