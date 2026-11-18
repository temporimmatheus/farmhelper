import { maps, ADEN_LANDMARKS, ELMORE_LANDMARKS, ADEN_AFFINE, ELMORE_AFFINE } from '../data/maps.js';

export function calibrate(x, y, landmarks, coefficients) {
  const affineX = coefficients[0][0] + coefficients[0][1] * x + coefficients[0][2] * y;
  const affineY = coefficients[1][0] + coefficients[1][1] * x + coefficients[1][2] * y;
  let sum = 0, residualX = 0, residualY = 0;
  for (const [lx, ly, mx, my] of landmarks) {
    const distance = Math.hypot((x - lx) / 20000, (y - ly) / 20000);
    if (distance < .00001) return { x: mx, y: my };
    const weight = 1 / (distance * distance + .18);
    residualX += (mx - (coefficients[0][0] + coefficients[0][1] * lx + coefficients[0][2] * ly)) * weight;
    residualY += (my - (coefficients[1][0] + coefficients[1][1] * lx + coefficients[1][2] * ly)) * weight;
    sum += weight;
  }
  return { x: affineX + residualX / sum, y: affineY + residualY / sum };
}

export function project(x, y, world = 'aden') {
  if (!Number.isFinite(+x) || !Number.isFinite(+y) || !Object.hasOwn(maps, world)) return null;
  const elmore = world === 'elmore';
  if (elmore && y >= -35000 || !elmore && y < -42000) return null;
  const map = maps[world];
  const point = calibrate(+x, +y, elmore ? ELMORE_LANDMARKS : ADEN_LANDMARKS, elmore ? ELMORE_AFFINE : ADEN_AFFINE);
  const result = { x: point.x * map.w / 1000, y: point.y * map.h / (elmore ? 750 : 899) };
  return result.x >= -30 && result.y >= -30 && result.x < map.w + 30 && result.y < map.h + 30 ? result : null;
}

export function pointInside(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / ((b.y - a.y) || 1e-6) + a.x) inside = !inside;
  }
  return inside;
}
