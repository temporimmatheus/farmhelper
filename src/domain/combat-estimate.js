const EFFECTIVE_HP_FACTOR = 1.6;

function actionEstimate(hp, damageMin, damageMax) {
  if (![hp, damageMin, damageMax].every(Number.isFinite) || hp <= 0 || damageMin <= 0 || damageMax <= 0) return null;
  const min = Math.max(1, Math.ceil(hp / damageMax));
  const max = Math.max(min, Math.ceil(hp / damageMin));
  return {
    min,
    max,
    expected: Math.ceil((min + max) / 2),
    label: min === max ? `~${min}` : `${min}–${max}`,
  };
}

export function estimateMobCombat(state, mob) {
  if (!mob || !Number.isFinite(mob.hp) || mob.hp <= 0) return null;
  const hp = mob.hp * EFFECTIVE_HP_FACTOR;
  if (state.mode === 'physical') {
    const attack = Number(state.patk);
    const defenses = [mob.pLo, mob.pHi].filter(value => Number.isFinite(value) && value > 0);
    if (!Number.isFinite(attack) || attack <= 0 || !defenses.length) return null;
    const defenseMin = Math.min(...defenses), defenseMax = Math.max(...defenses);
    const damageMin = 70 * attack / defenseMax;
    const damageMax = 70 * attack / defenseMin;
    const actions = actionEstimate(hp, damageMin, damageMax);
    if (!actions) return null;
    return {
      mode: 'physical',
      action: 'hits',
      actionText: 'ataques',
      hp,
      damageMin,
      damageMax,
      actions,
      mpPerMob: 0,
      quality: mob.defQuality === 'exact' ? 'reference' : 'low',
    };
  }

  const attack = Number(state.matk), power = Number(state.skillPower), defense = Number(mob.mRef);
  if (![attack, power, defense].every(Number.isFinite) || attack <= 0 || power <= 0 || defense <= 0) return null;
  const damage = 91 * Math.sqrt(attack) * power / defense;
  const actions = actionEstimate(hp, damage, damage);
  if (!actions) return null;
  return {
    mode: 'magic',
    action: 'casts',
    actionText: 'casts',
    hp,
    damageMin: damage,
    damageMax: damage,
    actions,
    mpPerMob: actions.expected * Math.max(0, Number(state.mpSkill) || 0),
    quality: mob.defQuality === 'exact' ? 'reference' : 'low',
  };
}
