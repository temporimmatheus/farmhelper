import { $ } from '../../ui/dom.js';
import { fnum } from '../../core/utils.js';
import { calculateProgress } from '../../domain/progress.js';

export function createProgressView({ state, model }) {
  function render() {
    const mobs = model.zMap.get(state.area) || [];
    const target = mobs.find(m => m.id === state.mob) || model.statZone(state.area).rank[0]?.m || mobs[0];
    const earned = target ? model.expMob(target) : 0;
    const result = calculateProgress(state, earned);
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
    if (document.activeElement !== $('castsKill')) $('castsKill').value = state.castsKill;
    $('mpPerKill').textContent = fnum(mpPerKill) + ' MP';
    $('xpKills').textContent = kills === null ? '—' : fnum(kills);
    $('mpRemaining').textContent = mpRemaining === null ? '—' : fnum(mpRemaining) + ' MP';
    $('xpPerMp').textContent = xpPerMp === null ? '—' : xpPerMp.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    $('xpTarget').textContent = !configured
      ? 'Informe seu nível (1–40) para ver a XP restante e o custo de mana até subir.'
      : target
        ? `Referência: ${target.name} · ${fnum(earned)} XP/kill · ${state.castsKill} skill(s) por kill.`
        : 'Selecione uma área ou monstro para estimar os kills restantes.';
  }
  return { render };
}
