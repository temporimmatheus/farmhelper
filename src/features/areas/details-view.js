import { $ } from '../../ui/dom.js';
import { esc, fnum, matchesQuery } from '../../core/utils.js';
import { metric, inlineStat, icon, emptyMessage } from '../../ui/components.js';

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
    $('areaTitle').textContent = area.zone;
    $('areaLevelLabel').textContent = `REGIÃO · NÍVEIS ${area.lowLv}–${area.highLv}`;
    $('areaBlurb').textContent = area.withSpawns
      ? `${area.withSpawns} de ${area.mobs.length} monstros têm registros de localização C1.`
      : 'Sem registros de localização por enquanto. Os monstros e as estimativas continuam disponíveis.';
    $('metrics').innerHTML = [
      metric('Monstros', fnum(area.mobs.length)),
      metric('Com localização', `${fnum(area.withSpawns)} / ${fnum(area.mobs.length)}`),
    ].join('');
    $('qualityInfo').textContent = model.combatConfigured
      ? 'Fórmulas de dano são provisórias; observações salvas valem apenas para os atributos registrados.'
      : 'No modo mágico, informe o poder da skill para incluir casts nas recomendações.';
    const matchingMobs = area.mobs.filter(mob => matchesQuery(mob.name, state.query));
    const visibleMobs = matchingMobs.length ? matchingMobs : area.mobs;
    const ranked = visibleMobs.map(mob => ({ mob, score: model.mobScore(mob) })).sort((a, b) => b.score - a.score);
    $('mobsTitle').textContent = 'Escolha seu alvo';
    $('mobsCount').textContent = matchingMobs.length && matchingMobs.length < area.mobs.length
      ? `${matchingMobs.length} de ${area.mobs.length} monstros`
      : `${area.mobs.length} monstros`;
    $('mobList').innerHTML = ranked.map(({ mob }) => {
      const selected = state.mob === mob.id;
      const combat = model.estimateCombat(mob);
      const combatValue = combat
        ? `${combat.actions.label} ${combat.actionText}${combat.actionsSource === 'observed' ? ' · observado' : ''}`
        : state.mode === 'magic' ? 'Defina o poder da skill' : 'Estimativa indisponível';
      const locations = model.countPlaces(mob);
      return `<button type="button" class="mob-card ${selected ? 'focus' : ''}" data-mob="${esc(mob.id)}" aria-pressed="${selected}">
        <span class="mob-line"><span class="mob-name">${esc(mob.name)}</span><span class="level">Lv ${mob.lv}</span></span>
        <span class="mob-stats">${inlineStat('XP / kill', fnum(model.expMob(mob)), { tone: 'positive' })}${inlineStat('Para matar', combatValue)}${inlineStat('Locais C1', locations ? fnum(locations) : '—')}</span>
        <span class="mob-card-footer"><span>${icon('pin')}${locations ? 'Localização registrada' : 'Sem localização C1'}</span><span class="mob-action">${icon(selected ? 'check' : 'target')}${selected ? 'Alvo atual' : 'Ver detalhes'}</span></span>
      </button>`;
    }).join('') || emptyMessage('Nenhum monstro nesta área', 'Escolha outra região para continuar.');
    const compared = state.compare.includes(area.zone);
    $('compareAdd').innerHTML = `${icon(compared ? 'check' : 'compare')}<span>${compared ? 'Na seleção' : 'Comparar'}</span>`;
    $('compareAdd').title = compared ? 'Remover esta área da comparação' : 'Adicionar esta área à comparação';
  }
  return { render };
}
