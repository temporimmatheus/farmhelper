export const byName = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function matchesQuery(value, query) {
  const terms = byName(query).split(' ').filter(Boolean);
  const words = byName(value).split(' ').filter(Boolean);
  return terms.length > 0 && terms.every(term => words.some(word => word.includes(term)));
}
export const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fnum = x => Math.round(x).toLocaleString('pt-BR');
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
