import { calculateProgress } from '../../domain/progress.js';
import { effectiveMobHp } from '../../domain/combat-estimate.js';

/** Display data built from the same farm and progress models used by Explore. */
export function buildComparison(state, model) {
  const entries = state.compare.filter(zone => model.zMap.has(zone)).slice(0, 2).map(zone => {
    const area = model.statZone(zone);
    const target = area.rank[0]?.m || area.mobs[0];
    const xp = model.expMob(target);
    const combat = model.estimateCombat(target);
    return { area, target, xp, combat, defense: model.def(target), progress: calculateProgress(state, xp, combat) };
  });
  const rows = [
    { label: 'Índice comparativo', note: 'XP, esforço e risco estimados', values: entries.map(e => +e.area.score.toFixed(1)), direction: 'higher', decimals: 1 },
    { label: 'XP por kill', note: 'Do alvo líder de cada área', values: entries.map(e => e.xp), direction: 'higher', unit: 'XP' },
    { label: state.mode === 'magic' ? 'Casts estimados por mob' : 'Ataques estimados por mob', note: 'Sem críticos, buffs, soulshots ou falhas', values: entries.map(e => e.combat?.actions.expected ?? null), direction: 'lower', unit: state.mode === 'magic' ? 'casts' : 'hits' },
    { label: 'MP estimado por mob', note: 'Skill selecionada · sem regeneração', values: entries.map(e => e.combat?.mpPerMob ?? null), direction: 'lower', unit: 'MP' },
    { label: 'Mobs até subir', note: 'A partir da sua XP atual', values: entries.map(e => e.progress.kills), direction: 'lower' },
    { label: 'MP até subir', note: 'Com base nos casts estimados por mob', values: entries.map(e => e.progress.mpRemaining), direction: 'lower', unit: 'MP' },
    { label: 'XP por MP', note: 'Rendimento bruto, sem regeneração', values: entries.map(e => e.progress.xpPerMp === null ? null : +e.progress.xpPerMp.toFixed(1)), direction: 'higher', decimals: 1 },
    { label: 'HP base do catálogo', note: 'Valor de referência C1', values: entries.map(e => e.target.hp) },
    { label: 'HP efetivo estimado', note: 'HP base ×1,6 (calibrado por observações)', values: entries.map(e => effectiveMobHp(e.target)) },
    { label: state.mode === 'magic' ? 'M.Def do alvo' : 'P.Def do alvo', note: 'Verifique a qualidade da defesa no cartão', values: entries.map(e => e.defense) },
    { label: 'Monstros no catálogo', note: 'Variedade de alvos da área', values: entries.map(e => e.area.mobs.length) },
    { label: 'Monstros com localização', note: 'Cobertura dos registros C1', values: entries.map(e => e.area.withSpawns), totals: entries.map(e => e.area.mobs.length) },
    { label: 'Registros C1', note: 'Não é contagem de mobs ativos', values: entries.map(e => e.area.sites) },
  ];
  for (const row of rows) row.winner = getRowWinner(row.values, row.direction);
  return { entries, rows, winner: rows[0].winner };
}

export function getRowWinner(values, direction) {
  if (!direction || values.length !== 2 || !values.every(Number.isFinite) || values[0] === values[1]) return null;
  const largest = values[0] > values[1] ? 0 : 1;
  return direction === 'higher' ? largest : 1 - largest;
}
