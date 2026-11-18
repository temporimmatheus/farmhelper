import { byName } from '../core/utils.js';

export function parseTerritories(text, output) {
  const territories = /territory_begin\s*\[([^\]]+)\]([\s\S]*?)territory_end/gi;
  for (const match of text.matchAll(territories)) {
    const vertices = [...match[2].matchAll(/\{\s*(-?\d+)\s*;\s*(-?\d+)\s*;\s*(-?\d+)\s*;\s*(-?\d+)\s*\}/g)]
      .map(point => ({ x: +point[1], y: +point[2], z: +point[3] }));
    if (vertices.length >= 3) output.set(byName(match[1]), vertices);
  }
}

function parseNpcs(text, territory, reference) {
  const rows = [];
  const npcs = /npc(?:_ex)?_begin\s*\[([^\]]+)\]([\s\S]*?)npc(?:_ex)?_end/gi;
  for (const npc of text.matchAll(npcs)) {
    const positions = [...npc[2].matchAll(/\bpos\s*=\s*\{\s*(-?\d+)\s*;\s*(-?\d+)\s*;\s*(-?\d+)/gi)];
    if (positions.length) {
      for (const point of positions) rows.push({ name: npc[1], point: { x: +point[1], y: +point[2], z: +point[3] } });
    } else if (territory) rows.push({ name: npc[1], area: { vertices: territory, territory: reference } });
  }
  return rows;
}

export function parseRows(text, territories) {
  const makers = [...text.matchAll(/npcmaker(?:_ex)?_begin\s*\[([^\]]+)\]([\s\S]*?)npcmaker(?:_ex)?_end/gi)];
  if (!makers.length) return parseNpcs(text);
  return makers.flatMap(maker => {
    const body = maker[2];
    const reference = body.slice(0, 800).match(/\bterritory\s*=\s*\[?([\w.\-]+)\]?/i)?.[1] || maker[1];
    const territory = territories.get(byName(reference)) || territories.get(byName(maker[1]));
    return parseNpcs(body, territory, reference);
  });
}
