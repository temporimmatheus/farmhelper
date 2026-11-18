import { clamp } from '../../core/utils.js';

export function bindMapInteractions({ $, baseScale, zoomAt, fitMap, updateTransform, schedulePaintPins, screenToWorld, hotspotSelect, getCenter, setCenter, getZoom, setZoom, render, invalidate, getWorld }) {
  const cleanup = [], touches = new Map();
  const viewport = $('mapViewport'), image = $('mapImage');
  let drag = null, pinch = null;
  function listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    cleanup.push(() => target.removeEventListener(event, handler, options));
  }
  const centerZoom = factor => zoomAt(factor, viewport.clientWidth / 2, viewport.clientHeight / 2);
  listen($('zoomIn'), 'click', () => centerZoom(1.3));
  listen($('zoomOut'), 'click', () => centerZoom(1 / 1.3));
  listen($('zoomFit'), 'click', fitMap);
  listen($('zoomArea'), 'click', () => render({ focus: true }));
  listen(viewport, 'wheel', event => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    zoomAt(event.deltaY < 0 ? 1.18 : 1 / 1.18, event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: false });
  listen(viewport, 'pointerdown', event => {
    if (event.target.closest('button') || event.pointerType === 'mouse' && event.button !== 0) return;
    try { viewport.setPointerCapture(event.pointerId); } catch { /* Capture may end between events. */ }
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size === 1) {
      drag = { x: event.clientX, y: event.clientY, cx: getCenter().x, cy: getCenter().y, moved: false };
      pinch = null;
      viewport.classList.add('dragging');
    } else {
      const [a, b] = [...touches.values()];
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: getZoom(), anchor: screenToWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
      drag = null;
    }
  });
  listen(viewport, 'pointermove', event => {
    if (!touches.has(event.pointerId)) return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size >= 2 && pinch) {
      const [a, b] = [...touches.values()], rect = viewport.getBoundingClientRect();
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(clamp(pinch.zoom * distance / Math.max(1, pinch.distance), .75, 10));
      const scale = baseScale() * getZoom();
      setCenter({ x: pinch.anchor.x - ((a.x + b.x) / 2 - rect.left - viewport.clientWidth / 2) / scale, y: pinch.anchor.y - ((a.y + b.y) / 2 - rect.top - viewport.clientHeight / 2) / scale });
      updateTransform();
    } else if (drag) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y, scale = baseScale() * getZoom();
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      setCenter({ x: drag.cx - dx / scale, y: drag.cy - dy / scale });
      updateTransform();
    }
  });
  function pointerEnd(event) {
    if (!touches.has(event.pointerId)) return;
    const tap = event.type === 'pointerup' && touches.size === 1 && drag && !drag.moved;
    touches.delete(event.pointerId);
    if (tap) hotspotSelect(screenToWorld(event.clientX, event.clientY));
    if (touches.size === 1) {
      const point = [...touches.values()][0];
      drag = { ...point, cx: getCenter().x, cy: getCenter().y, moved: true };
      pinch = null;
    } else if (!touches.size) {
      drag = null; pinch = null;
      viewport.classList.remove('dragging');
    }
    schedulePaintPins();
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(viewport, event, pointerEnd);
  listen(viewport, 'dblclick', event => {
    if (event.target.closest('button')) return;
    const rect = viewport.getBoundingClientRect();
    zoomAt(1.5, event.clientX - rect.left, event.clientY - rect.top);
  });
  listen(viewport, 'keydown', event => {
    if (event.target.closest('button') || !['+', '=', '-', '0'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === '0') fitMap();
    else centerZoom(event.key === '-' ? 1 / 1.2 : 1.2);
  });
  listen(window, 'resize', () => { updateTransform(); schedulePaintPins(); });
  image.onerror = () => { $('mapStatus').textContent = `O mapa de ${getWorld() === 'elmore' ? 'Elmore' : 'Aden'} não carregou. Confira sua conexão.`; };
  image.onload = () => { invalidate(); render(); };
  return () => { cleanup.forEach(fn => fn()); image.onload = null; image.onerror = null; };
}
