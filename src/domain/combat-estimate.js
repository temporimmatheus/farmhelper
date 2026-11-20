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

export function getCombatObservation(state, mob) {
  const mobKey = mob?.sourceName || mob?.id;
  if (!mobKey) return null;
  const mode = state.mode === 'physical' ? 'physical' : 'magic';
  const attack = Number(mode === 'physical' ? state.patk : state.matk);
  const skillPower = mode === 'magic' ? Number(state.skillPower) : 0;
  return state.combatObservations?.find(observation =>
    observation.mobKey === mobKey
    && observation.mode === mode
    && observation.attack === attack
    && observation.skillPower === skillPower
  ) || null;
}

export function estimateMobCombat(state, mob) {
  if (!mob || !Number.isFinite(mob.hp) || mob.hp <= 0) return null;
  const hp = mob.hp;
  const observation = getCombatObservation(state, mob);
  if (state.mode === 'physical') {
    const attack = Number(state.patk);
    const defenses = [mob.pLo, mob.pHi].filter(value => Number.isFinite(value) && value > 0);
    if (!Number.isFinite(attack) || attack <= 0 || !defenses.length) return null;
    const defenseMin = Math.min(...defenses), defenseMax = Math.max(...defenses);
    const formulaDamageMin = 70 * attack / defenseMax;
    const formulaDamageMax = 70 * attack / defenseMin;
    const damageMin = observation?.damageMin || formulaDamageMin;
    const damageMax = observation?.damageMax || formulaDamageMax;
    const actions = observation?.actions
      ? { min: observation.actions, max: observation.actions, expected: observation.actions, label: String(observation.actions) }
      : actionEstimate(hp, damageMin, damageMax);
    if (!actions) return null;
    return {
      mode: 'physical',
      action: 'hits',
      actionText: 'ataques',
      hp,
      damageMin,
      damageMax,
      actions,
      actionsSource: observation?.actions ? 'observed' : 'formula',
      damageSource: observation?.damageMin ? 'observed' : 'formula',
      mpPerMob: 0,
      quality: mob.defQuality === 'exact' ? 'reference' : 'low',
    };
  }

  const attack = Number(state.matk), power = Number(state.skillPower), defense = Number(mob.mRef);
  if (![attack, power, defense].every(Number.isFinite) || attack <= 0 || power <= 0 || defense <= 0) return null;
  const formulaDamage = 91 * Math.sqrt(attack) * power / defense;
  const damageMin = observation?.damageMin || formulaDamage;
  const damageMax = observation?.damageMax || formulaDamage;
  const actions = observation?.actions
    ? { min: observation.actions, max: observation.actions, expected: observation.actions, label: String(observation.actions) }
    : actionEstimate(hp, damageMin, damageMax);
  if (!actions) return null;
  return {
    mode: 'magic',
    action: 'casts',
    actionText: 'casts',
    hp,
    damageMin,
    damageMax,
    actions,
    actionsSource: observation?.actions ? 'observed' : 'formula',
    damageSource: observation?.damageMin ? 'observed' : 'formula',
    mpPerMob: actions.expected * Math.max(0, Number(state.mpSkill) || 0),
    quality: mob.defQuality === 'exact' ? 'reference' : 'low',
  };
}
