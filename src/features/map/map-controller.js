import { $ } from '../../ui/dom.js';
import { clamp, esc, fnum } from '../../core/utils.js';
import { maps } from '../../data/maps.js';
import { projectAreaLocations } from '../../domain/area-locations.js';
import { drawHeatmap } from './heatmap.js';
import { bindMapInteractions } from './map-interactions.js';

export function createMapController({ state, model, repository, updateWorld }) {
  const viewport = $('mapViewport'), worldElement = $('mapWorld');
  let center = { x: 500, y: 449 }, zoom = 1;
  let signature = '', points = [], hotspots = [], pinsTimer;
  let showHeat = true, showPositions = true;
  let hasFixedPositions = false;

  function updateMarkerHint() {
    $('targetLegend').hidden = !state.mob || !hasFixedPositions || !showPositions || zoom < 2.4;
    $('mapPointHint').textContent = !showPositions ? 'Posições fixas ocultas'
      : !points.length ? 'Sem registros neste mapa'
        : !hasFixedPositions ? 'Territórios aproximados, sem posições fixas'
          : zoom < 2.4 ? 'Aproxime para ver posições fixas'
            : state.mob ? 'Posições fixas do alvo em destaque' : 'Posições fixas visíveis';
  }

  function updatePresentation() {
    const target = model.MOB.get(state.mob);
    $('mapSelectionName').textContent = target ? `Alvo · ${target.name}` : 'Todos os monstros da região';
    $('mapSelectionDot').classList.toggle('is-target', Boolean(target));
    hasFixedPositions = points.some(point => point.kind === 'point' && (!target || point.m.id === target.id));
    $('mapEmpty').hidden = points.length > 0;
    $('zoomArea').disabled = !points.length;
    $('zoomTarget').disabled = !target || !points.some(point => point.m.id === target.id);
    $('heatCanvas').hidden = !showHeat;
    $('mapPins').hidden = !showPositions;
    $('toggleHeat').setAttribute('aria-pressed', String(showHeat));
    $('toggleSpawns').setAttribute('aria-pressed', String(showPositions));
    updateMarkerHint();
  }

  function baseScale() {
    const map = maps[state.world];
    return Math.max(.001, Math.min((viewport.clientWidth - 18) / map.w, (viewport.clientHeight - 18) / map.h));
  }
  function updateTransform() {
    const scale = baseScale() * zoom;
    worldElement.style.transform = `translate(${viewport.clientWidth / 2 - center.x * scale}px,${viewport.clientHeight / 2 - center.y * scale}px) scale(${scale})`;
    worldElement.style.setProperty('--pin-world-size', `${(4.5 / scale).toFixed(3)}px`);
    worldElement.style.setProperty('--pin-world-stroke', `${(.65 / scale).toFixed(3)}px`);
    $('mapZoomLabel').textContent = `${Math.round(zoom * 100)}%`;
    $('zoomIn').disabled = zoom >= 10;
    $('zoomOut').disabled = zoom <= .75;
    updateMarkerHint();
  }
  function paintPins() {
    const layer = $('mapPins');
    if (zoom < 2.4) { layer.innerHTML = ''; return; }
    const cell = 15 / (baseScale() * zoom), occupied = new Set(), selected = [];
    for (const point of points) {
      if (point.kind !== 'point' || state.mob && point.m.id !== state.mob) continue;
      const key = `${Math.round(point.x / cell)}|${Math.round(point.y / cell)}`;
      if (occupied.has(key)) continue;
      occupied.add(key); selected.push(point);
      if (selected.length >= 65) break;
    }
    layer.innerHTML = selected.map(point => `<span class="map-pin ${point.m.id === state.mob ? 'selected' : ''}" style="left:${point.x.toFixed(2)}px;top:${point.y.toFixed(2)}px" title="${esc(point.m.name)}"></span>`).join('');
  }
  function schedulePaintPins() { clearTimeout(pinsTimer); pinsTimer = setTimeout(paintPins, 110); }
  function fitMap() {
    const map = maps[state.world];
    center = { x: map.w / 2, y: map.h / 2 }; zoom = 1;
    updateTransform(); schedulePaintPins();
  }
  function render({ focus = false, targetOnly = true } = {}) {
    $('mapTitle').textContent = state.area || 'Selecione uma área';
    const nextSignature = [state.area, state.world, repository.revision].join('|');
    if (signature !== nextSignature) {
      points = projectAreaLocations(model.zMap.get(state.area) || [], repository, state.world);
      hotspots = drawHeatmap($('heatCanvas'), maps[state.world], points);
      signature = nextSignature;
      $('mapPins').innerHTML = '';
      $('hotspot').classList.remove('visible');
      $('mapStatus').textContent = points.length ? `${fnum(points.length)} amostras de localização · toque numa mancha` : 'Sem coordenadas C1 para esta área. Os mobs continuam listados à direita.';
      $('mapCoverage').textContent = points.length ? `${hotspots.length} concentrações` : 'Apenas catálogo';
    }
    if (focus && points.length) {
      const selected = targetOnly && state.mob ? points.filter(point => point.m.id === state.mob) : [];
      const targets = selected.length ? selected : points;
      const xs = targets.map(point => point.x), ys = targets.map(point => point.y);
      const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
      center = { x: (left + right) / 2, y: (top + bottom) / 2 };
      const scale = baseScale();
      zoom = clamp(Math.min(viewport.clientWidth / (Math.max(80, right - left) * scale * 1.5), viewport.clientHeight / (Math.max(80, bottom - top) * scale * 1.5)), 1, 5);
    } else if (focus) fitMap();
    updateTransform(); paintPins(); updatePresentation();
  }
  function setWorld(world) {
    if (!Object.hasOwn(maps, world)) return;
    updateWorld(world);
    document.querySelectorAll('[data-world]').forEach(button => {
      button.classList.toggle('on', button.dataset.world === world);
      button.setAttribute('aria-pressed', String(button.dataset.world === world));
    });
    $('mapImage').src = maps[world].src;
    worldElement.style.width = maps[world].w + 'px';
    worldElement.style.height = maps[world].h + 'px';
    $('heatCanvas').style.width = maps[world].w + 'px';
    $('heatCanvas').style.height = maps[world].h + 'px';
    signature = ''; fitMap(); render();
  }
  function zoomAt(factor, screenX, screenY) {
    const oldScale = baseScale() * zoom;
    const dx = screenX - viewport.clientWidth / 2, dy = screenY - viewport.clientHeight / 2;
    const anchor = { x: center.x + dx / oldScale, y: center.y + dy / oldScale };
    zoom = clamp(zoom * factor, .75, 10);
    const scale = baseScale() * zoom;
    center = { x: anchor.x - dx / scale, y: anchor.y - dy / scale };
    updateTransform(); schedulePaintPins();
  }
  function screenToWorld(clientX, clientY) {
    const rect = viewport.getBoundingClientRect(), scale = baseScale() * zoom;
    return { x: center.x + (clientX - rect.left - viewport.clientWidth / 2) / scale, y: center.y + (clientY - rect.top - viewport.clientHeight / 2) / scale };
  }
  function hotspotSelect(point) {
    if (!showHeat) return;
    let found = null, distance = Infinity;
    for (const hotspot of hotspots) {
      const candidate = Math.hypot(hotspot.x - point.x, hotspot.y - point.y);
      if (candidate < distance) { distance = candidate; found = hotspot; }
    }
    if (!found || distance > Math.max(30, 35 / (baseScale() * zoom))) return;
    const mobs = found.mobIds.map(id => model.MOB.get(id)).filter(Boolean).sort((a, b) => model.mobScore(b) - model.mobScore(a));
    $('hotspot').classList.add('visible');
    $('hotspot').innerHTML = `<strong>Concentração C1 · ${mobs.length} ${mobs.length === 1 ? 'mob' : 'mobs'}</strong>
      <p class="small">${found.fixed} coordenadas fixas nesta concentração; o restante representa áreas de território.</p>
      <div class="spotmob">${mobs.map(mob => `<button type="button" data-mob="${esc(mob.id)}">${esc(mob.name)} · Lv ${mob.lv}</button>`).join('')}</div>`;
  }
  const unbind = bindMapInteractions({ $, baseScale, zoomAt, fitMap, updateTransform, schedulePaintPins, screenToWorld, hotspotSelect, render,
    toggleHeat() { showHeat = !showHeat; if (!showHeat) $('hotspot').classList.remove('visible'); updatePresentation(); },
    toggleSpawns() { showPositions = !showPositions; updateTransform(); updatePresentation(); },
    getCenter: () => center, setCenter: value => { center = value; },
    getZoom: () => zoom, setZoom: value => { zoom = value; },
    invalidate: () => { signature = ''; }, getWorld: () => state.world,
  });
  return { render, setWorld, initialize: () => setWorld(state.world), destroy() { unbind(); clearTimeout(pinsTimer); } };
}
