import { esc } from '../core/utils.js';

const ICONS = {
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  compare: '<path d="M8 3v18M16 3v18M4 7l4-4 4 4m0 10 4 4 4-4"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-9 11 9 5 9-5M3 18l9 5 9-5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/>',
};

export function icon(name) {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.pin}</svg>`;
}

export function badge(label, { tone = 'neutral', title = '', symbol } = {}) {
  const safeTone = ['neutral', 'positive', 'gold', 'warning', 'mana'].includes(tone) ? tone : 'neutral';
  return `<span class="badge badge--${safeTone}"${title ? ` title="${esc(title)}"` : ''}>${symbol ? icon(symbol) : ''}${esc(label)}</span>`;
}

export function metric(label, value, { unit = '', tone = '', description = '' } = {}) {
  const safeTone = ['positive', 'gold', 'mana'].includes(tone) ? ` metric--${tone}` : '';
  return `<div class="metric${safeTone}"><span class="metric-label">${esc(label)}</span><strong class="metric-value">${esc(value)}${unit ? `<small>${esc(unit)}</small>` : ''}</strong>${description ? `<span class="metric-description">${esc(description)}</span>` : ''}</div>`;
}

export function inlineStat(label, value, { tone = '' } = {}) {
  const safeTone = ['positive', 'gold', 'mana'].includes(tone) ? ` inline-stat--${tone}` : '';
  return `<span class="inline-stat${safeTone}"><span>${esc(label)}</span><b>${esc(value)}</b></span>`;
}

export function emptyMessage(title, message) {
  return `<div class="no-data"><span class="empty-symbol">${icon('pin')}</span><strong>${esc(title)}</strong><p>${esc(message)}</p></div>`;
}
