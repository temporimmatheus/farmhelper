import { project, pointInside } from './projection.js';

/** Fixed spawn coordinates and sparse samples inside territory polygons. */
export function projectAreaLocations(mobs, repository, world) {
  const points = [];
  for (const mob of mobs) {
    const data = repository.get(mob.id);
    for (const point of data.points) {
      const projected = project(point.x, point.y, world);
      if (projected) points.push({ ...projected, m: mob, kind: 'point', weight: 1 });
    }
    for (const area of data.areas) {
      const vertices = area.vertices.map(point => project(point.x, point.y, world)).filter(Boolean);
      if (vertices.length < 3) continue;
      const xs = vertices.map(p => p.x), ys = vertices.map(p => p.y);
      const left = Math.min(...xs), top = Math.min(...ys);
      const width = Math.max(1, Math.max(...xs) - left), height = Math.max(1, Math.max(...ys) - top);
      const target = Math.min(14, Math.max(3, Math.round(width * height / 2600)));
      const columns = Math.max(2, Math.round(Math.sqrt(target * width / height)));
      const rows = Math.max(2, Math.round(target / columns));
      let drawn = 0;
      for (let row = 1; row <= rows; row++) {
        for (let column = 1; column <= columns; column++) {
          const x = left + column * width / (columns + 1), y = top + row * height / (rows + 1);
          if (pointInside(x, y, vertices)) { points.push({ x, y, m: mob, kind: 'area', weight: .75 }); drawn++; }
        }
      }
      if (!drawn) {
        const center = vertices.reduce((sum, point) => ({ x: sum.x + point.x / vertices.length, y: sum.y + point.y / vertices.length }), { x: 0, y: 0 });
        points.push({ ...center, m: mob, kind: 'area', weight: .75 });
      }
    }
  }
  return points;
}
