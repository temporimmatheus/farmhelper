import { $ } from '../../ui/dom.js';
import { esc, fnum } from '../../core/utils.js';
import { badge, icon } from '../../ui/components.js';
import { buildComparison } from './comparison-model.js';

const format = (value, decimals = 0) => value === null ? '—' : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export function createCompareView({ state, model }) {
  function render() {
    const { entries, rows, winner } = buildComparison(state, model);
    $('comparePanel').classList.toggle('visible', entries.length > 0);
    $('compareMetrics').hidden = entries.length < 2;
    $('compareSummary').textContent = entries.length < 2
      ? 'Adicione uma segunda área para ver as diferenças lado a lado.'
      : winner === null
        ? 'As duas áreas têm o mesmo índice comparativo na precisão exibida.'
        : `${entries[winner].area.zone} tem o maior índice comparativo nesta seleção.`;
    $('compareGrid').innerHTML = entries.map(({ area, target, xp, combat }, index) => `
      <article class="compare-box ${winner === index ? 'compare-box--leading' : ''}">
        <div class="compare-card-top"><span class="eyebrow">Área ${index + 1}</span><button type="button" class="icon-btn" data-remove-compare="${esc(area.zone)}" aria-label="Remover ${esc(area.zone)} da comparação" title="Remover área">${icon('close')}</button></div>
        <h3>${esc(area.zone)}</h3><p class="compare-area-meta">Níveis ${area.lowLv}–${area.highLv} · ${area.mobs.length} monstros</p>
        <div class="compare-score"><div><span>Índice comparativo</span><strong>${format(area.score, 1)}</strong></div>${winner === index ? badge('Maior índice', { tone: 'gold', symbol: 'check' }) : badge('Área selecionada')}</div>
        <div class="compare-target"><span>Alvo líder estimado</span><strong>${esc(target.name)}</strong><p>Lv ${target.lv} · <b>${fnum(xp)} XP/kill</b>${combat ? ` · ${combat.actions.label} ${combat.actionText}` : ' · Defina o poder da skill'}</p>${badge(target.defQuality === 'exact' ? 'Def. verificada' : 'Def. estimada', { tone: target.defQuality === 'exact' ? 'neutral' : 'warning', symbol: 'shield' })}</div>
        <button type="button" class="quiet-btn" data-area="${esc(area.zone)}">${icon('pin')}Ver no mapa</button>
      </article>`).join('');
    if (entries.length === 1) $('compareGrid').insertAdjacentHTML('beforeend', `<div class="compare-placeholder"><span class="empty-symbol">${icon('compare')}</span><h3>Complete sua comparação</h3><p>Escolha outra área para comparar XP, mana e os alvos líderes.</p><button type="button" class="primary-btn" data-explore="areas">Escolher segunda área ${icon('arrow')}</button></div>`);
    $('compareMetrics').innerHTML = entries.length === 2 ? `<table class="comparison-table"><caption>Indicadores dos alvos líderes e das áreas selecionadas</caption><thead><tr><th scope="col">Indicador</th>${entries.map(({ area }, index) => `<th scope="col"><span class="table-area-label">Área ${index + 1}</span>${esc(area.zone)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${esc(row.label)}<small>${esc(row.note)}</small></th>${row.values.map((value, index) => `<td${row.winner === index ? ' class="cell-highlight"' : ''}><span class="comparison-value">${format(value, row.decimals)}${row.unit && value !== null ? `<small>${row.unit}</small>` : ''}${row.totals ? `<small> / ${row.totals[index]}</small>` : ''}</span>${row.winner === index ? `<span class="comparison-difference">${row.direction === 'higher' ? 'Maior' : 'Menor'} nesta seleção</span>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
  }
  return { render };
}
