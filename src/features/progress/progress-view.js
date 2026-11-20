import { $ } from '../../ui/dom.js';
import { fnum } from '../../core/utils.js';
import { calculateProgress } from '../../domain/progress.js';

export function createProgressView({ state, model }) {
  function render() {
    const mobs = model.zMap.get(state.area) || [];
    const target = mobs.find(m => m.id === state.mob) || model.statZone(state.area).rank[0]?.m || mobs[0];
    const earned = target ? model.expMob(target) : 0;
    const combat = target ? model.estimateCombat(target) : null;
    const result = calculateProgress(state, earned, combat);
    const { configured, total, remaining, kills, mpPerKill, mpRemaining, xpPerMp } = result;
    $('xpLevel').textContent = state.level;
    $('xpNextLevel').textContent = configured ? state.level + 1 : '—';
    $('xpRange').disabled = !configured;
    $('xpExact').disabled = !configured;
    $('xpRange').value = state.xpPercent.toFixed(2);
    if (document.activeElement !== $('xpExact')) $('xpExact').value = state.xpPercent.toFixed(2);
    $('xpPercentLabel').textContent = configured ? state.xpPercent.toFixed(2).replace('.', ',') + '%' : '—';
    $('xpFill').style.width = (configured ? state.xpPercent : 0) + '%';
    $('xpProgressBar').setAttribute('aria-valuenow', configured ? state.xpPercent.toFixed(2) : '0');
    $('xpRemaining').textContent = configured ? fnum(remaining) : '—';
    $('xpLevelTotal').textContent = configured ? fnum(total) : '—';
    if (document.activeElement !== $('mpSkill')) $('mpSkill').value = state.mpSkill;
    $('skillPowerField').hidden = state.mode !== 'magic';
    $('mpSkillField').hidden = state.mode !== 'magic';
    $('mpPerKill').textContent = mpPerKill === null ? '—' : fnum(mpPerKill) + ' MP';
    $('xpKills').textContent = kills === null ? '—' : fnum(kills);
    $('mpRemaining').textContent = mpRemaining === null ? '—' : fnum(mpRemaining) + ' MP';
    $('xpPerMp').textContent = xpPerMp === null ? '—' : xpPerMp.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    $('progressTargetName').textContent = !configured ? 'Informe seu nível para começar' : target?.name || 'Nenhum alvo disponível';
    $('progressTargetMode').textContent = state.mob ? 'Selecionado' : 'Automático';
    $('progressTargetMode').className = `badge ${state.mob ? 'badge--gold' : ''}`;
    $('mobileLevelSummary').textContent = configured ? `Nível ${state.level}` : 'Defina seu nível';
    $('mobileXpPercent').textContent = configured ? state.xpPercent.toFixed(2).replace('.', ',') + '%' : '—';
    $('mobileXpFill').style.width = (configured ? state.xpPercent : 0) + '%';
    $('mobileXpBar').setAttribute('aria-valuenow', configured ? state.xpPercent.toFixed(2) : '0');
    $('mobileXpRemaining').textContent = configured ? fnum(remaining) : '—';
    $('mobileMpSkill').textContent = fnum(state.mpSkill);
    $('mobileMpPerKill').textContent = mpPerKill === null ? '—' : fnum(mpPerKill);
    $('mobileKills').textContent = kills === null ? '—' : fnum(kills);
    $('mobileMpRemaining').textContent = mpRemaining === null ? '—' : fnum(mpRemaining);
    $('mobileTargetName').textContent = $('progressTargetName').textContent;
    $('mobileTargetName').title = $('progressTargetName').textContent;
    $('mobileTargetReopen').hidden = !state.mob || !target;
    $('setupSummary').textContent = configured
      ? `Nível ${state.level} · ${state.xpPercent.toFixed(2).replace('.', ',')}% do nível atual`
      : 'Defina seu nível para personalizar as recomendações';
    $('xpTarget').textContent = !configured
      ? 'Informe seu nível (1–40) para ver a XP restante e o custo de mana até subir.'
      : target
        ? `${fnum(earned)} XP/kill · ${combat ? `${combat.actions.label} ${combat.actionText} por mob` : 'informe o poder da skill para estimar casts'} · ${state.mob ? 'alvo escolhido por você' : 'alvo líder estimado da área'}.`
        : 'Selecione uma área ou monstro para estimar os kills restantes.';
  }
  return { render };
}
