import { XP_TO_NEXT } from '../data/experience.js';

export function xpRemaining(state) {
  const total = XP_TO_NEXT[state.level - 1] || 0;
  return Math.max(0, Math.round(total * (100 - state.xpPercent) / 100));
}

export function calculateProgress(state, earnedXp = 0, combat = null) {
  const configured = state.level >= 1 && state.level <= XP_TO_NEXT.length;
  const total = configured ? XP_TO_NEXT[state.level - 1] : 0;
  const remaining = configured ? xpRemaining(state) : 0;
  const mpPerKill = combat?.mpPerMob ?? null;
  const kills = configured && earnedXp > 0 ? Math.ceil(remaining / earnedXp) : null;
  return {
    configured, total, remaining, kills, mpPerKill,
    mpRemaining: kills === null || mpPerKill === null ? null : kills * mpPerKill,
    xpPerMp: configured && mpPerKill > 0 && earnedXp > 0 ? earnedXp / mpPerKill : null,
  };
}
