import { clamp } from '../../core/utils.js';

export function drawHeatmap(canvas, map, points) {
  const context = canvas.getContext('2d');
  if (!context) return [];
  canvas.width = Math.round(map.w * .68);
  canvas.height = Math.round(map.h * .68);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const bins = new Map();
  for (const point of points) {
    const key = `${Math.floor(point.x / 24)}/${Math.floor(point.y / 24)}`;
    const group = bins.get(key) || { x: 0, y: 0, n: 0, weight: 0 };
    group.x += point.x; group.y += point.y; group.n++; group.weight += point.weight;
    bins.set(key, group);
  }
  const scale = canvas.width / map.w;
  context.globalCompositeOperation = 'screen';
  for (const group of [...bins.values()].sort((a, b) => b.weight - a.weight).slice(0, 650)) {
    const x = group.x / group.n * scale, y = group.y / group.n * scale;
    const intensity = Math.log1p(group.weight);
    const radius = clamp(20 + intensity * 5, 23, 53) * scale;
    const strength = clamp(.38 + intensity * .10, .38, .76);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255,186,85,${(strength * .93).toFixed(3)})`);
    gradient.addColorStop(.27, `rgba(237,214,95,${(strength * .75).toFixed(3)})`);
    gradient.addColorStop(.6, `rgba(74,222,149,${(strength * .53).toFixed(3)})`);
    gradient.addColorStop(1, 'rgba(14,137,101,0)');
    context.fillStyle = gradient;
    context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
  }
  context.globalCompositeOperation = 'source-over';
  const clusters = new Map();
  for (const point of points) {
    const key = `${Math.floor(point.x / 27)}/${Math.floor(point.y / 27)}`;
    const group = clusters.get(key) || { x: 0, y: 0, n: 0, mobIds: new Set(), fixed: 0 };
    group.x += point.x; group.y += point.y; group.n++; group.mobIds.add(point.m.id);
    if (point.kind === 'point') group.fixed++;
    clusters.set(key, group);
  }
  return [...clusters.values()].map(group => ({ x: group.x / group.n, y: group.y / group.n, mobIds: [...group.mobIds], fixed: group.fixed, n: group.n }));
}
