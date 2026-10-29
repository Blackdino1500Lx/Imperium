// Filtros del catálogo: búsqueda sin tildes, criterios y orden.
import { normalize, fullName } from './utils.js';

export const filters = { query: '', brand: '', category: '', availability: '', collection: '', sort: 'name-asc', priceMin: null, priceMax: null };
export const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

const ALIASES = {
  'Yves Saint Laurent': ' YSL YVESSAINTLAURENT YVESSAINT',
  'Giorgio Armani': ' Armani',
  'Rabanne': ' Paco Rabanne',
  'Dolce & Gabbana': ' Dolce Gabana Dolce Gabbana DG',
  'Rasasi': ' Rasassi',
  'Bvlgari': ' Bvlgary',
  'Armaf': ' Armar',
  'Montblanc': ' Mont Blanc'
};

export function searchText(p) {
  // Solo busca en las notas si ya fueron cargadas en memoria (evita undefined)
  const notes = p.top ? [p.top, p.heart, p.base].filter(Boolean).join(' ') : '';
  const text = fullName(p) + ' ' + notes + ' ' + (p.notesSummary || '');
  return normalize(text + (ALIASES[p.brand] || ''));
}

export function selectProducts(items, state) {
  const words = normalize(state.query).split(' ').filter(Boolean);
  const selected = items.filter(p =>
    ((state.priceMin == null && state.priceMax == null) || (Number(p.price) > 0 && (state.priceMin == null || p.price >= state.priceMin) && (state.priceMax == null || p.price <= state.priceMax)))
    && words.every(w => searchText(p).includes(w))
    && (!state.brand || p.brand === state.brand)
    && (!state.category || (state.category === 'sin' ? !p.category : p.category === state.category))
    && (!state.availability || p.availability === state.availability)
    && (!state.collection || (p.collections && p.collections.includes(state.collection)))
  );
  return selected.sort((a, b) => {
    if (state.sort.startsWith('price')) {
      if (!(a.price > 0)) return b.price > 0 ? 1 : collator.compare(fullName(a), fullName(b));
      if (!(b.price > 0)) return -1;
      return (state.sort === 'price-asc' ? a.price - b.price : b.price - a.price) || collator.compare(fullName(a), fullName(b));
    }
    return (state.sort === 'name-desc' ? -1 : 1) * collator.compare(fullName(a), fullName(b)) || a.id.localeCompare(b.id);
  });
}

export function priceBounds(items) {
  let min = Infinity, max = -Infinity;
  for (const p of items) {
    const price = Number(p.price);
    if (Number.isFinite(price) && price > 0) { min = Math.min(min, price); max = Math.max(max, price); }
  }
  return min === Infinity ? { min: 0, max: 0, available: false } : { min, max, available: true };
}