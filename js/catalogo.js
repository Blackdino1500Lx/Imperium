// Catálogo: filtros, paginación y tarjetas de producto.
import { filters, selectProducts, priceBounds, collator } from './filtros.js';
import { escapeHtml, formatPrice, fullName, visualHtml, optionsHtml } from './utils.js';

let products = [];
let collectionsList = [];
let pageSize = 48;
let visibleCount = 48;
let searchTimer;

export function initCatalog(list, size, collections) {
  products = list;
  collectionsList = collections || [];
  pageSize = size;
  visibleCount = size;
  
  renderCollections();
  renderBrands();
  renderCatalog();
  bindFilterEvents();
  
  window.addEventListener('hashchange', applyHashFilter);
  setTimeout(applyHashFilter, 100); 
}

export function getProducts() { return products; }
export function findProduct(id) { return products.find(p => p.id === id); }
export function getTotalProducts() { return products.length; }

function renderCollections() {
  const select = document.getElementById('collection-filter');
  if (select) {
    select.innerHTML = '<option value="">Todas las colecciones</option>' + 
      collectionsList.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  }
}

function applyHashFilter() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (!hash) return;

  const categoryMap = { 'hombre': 'Hombre', 'mujer': 'Mujer', 'unisex': 'Unisex' };
  
  if (categoryMap[hash]) {
    filters.category = categoryMap[hash];
    document.getElementById('category-filter').value = categoryMap[hash];
    filters.collection = '';
    document.getElementById('collection-filter').value = '';
    filters.query = '';
    document.getElementById('search').value = '';
    visibleCount = pageSize;
    renderCatalog();
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const col = collectionsList.find(c => c.slug === hash);
  if (col) {
    filters.collection = col.id;
    document.getElementById('collection-filter').value = col.id;
    filters.category = '';
    document.getElementById('category-filter').value = '';
    filters.query = '';
    document.getElementById('search').value = '';
    visibleCount = pageSize;
    renderCatalog();
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
  }
}

function cardHtml(p) {
  return '<article class="product-card" data-card-id="' + p.id + '">' +
    '<button type="button" class="product-open" data-open-id="' + p.id + '" aria-haspopup="dialog" aria-controls="product-dialog" aria-label="' + escapeHtml('Ver ' + fullName(p) + ', ' + formatPrice(p.price)) + '">' +
      '<span class="product-picture" data-visual-id="' + p.id + '">' + visualHtml(p) + '</span>' +
      '<span class="product-body"><span class="product-brand">' + escapeHtml(p.brand) + '</span><span class="product-name">' + escapeHtml(p.name) + '</span><span class="product-price">' + formatPrice(p.price) + '</span></span>' +
    '</button>' +
    '<button type="button" class="button card-cart-add" data-cart-add="' + p.id + '" aria-label="' + escapeHtml('Añadir ' + fullName(p) + ' al carrito') + '"' + (p.availability === 'agotado' ? ' disabled' : '') + '>' + (p.availability === 'agotado' ? 'Agotado' : 'Añadir al carrito') + '</button>' +
  '</article>';
}

function renderBrands() {
  const counts = new Map();
  products.forEach(p => counts.set(p.brand, (counts.get(p.brand) || 0) + 1));
  const brands = [...counts.keys()].sort(collator.compare);
  document.getElementById('brand-filter').innerHTML = '<option value="">Todas las marcas</option>' + optionsHtml(brands.map(b => [b, b]), filters.brand);
}

function renderPriceFilter() {
  const bounds = priceBounds(products);
  const clamp = value => Math.max(bounds.min, Math.min(bounds.max, Number(value)));
  if (filters.priceMin != null) filters.priceMin = clamp(filters.priceMin);
  if (filters.priceMax != null) filters.priceMax = clamp(filters.priceMax);
  if (filters.priceMin != null && filters.priceMax != null && filters.priceMin > filters.priceMax) filters.priceMax = filters.priceMin;
  const low = filters.priceMin ?? bounds.min, high = filters.priceMax ?? bounds.max;
  for (const [key, value] of [['min', low], ['max', high]]) {
    for (const suffix of ['', '-range']) {
      const input = document.getElementById('price-' + key + suffix);
      input.min = String(bounds.min);
      input.max = String(bounds.max);
      input.value = String(value);
      input.disabled = !bounds.available;
      if (suffix) input.setAttribute('aria-valuetext', formatPrice(value));
    }
  }
  const active = filters.priceMin != null || filters.priceMax != null;
  const toggle = document.getElementById('price-toggle');
  toggle.textContent = 'Precio';
  toggle.setAttribute('aria-pressed', String(active));
  toggle.setAttribute('aria-label', active ? 'Filtrar por precio: rango activo' : 'Filtrar por precio');
  document.getElementById('price-range-summary').textContent = bounds.available ? 'Desde ' + formatPrice(low) + ' hasta ' + formatPrice(high) + '.' : 'No hay perfumes con precio definido.';
}

function updatePriceRange(key, value) {
  const bounds = priceBounds(products), number = Number(value);
  if (!bounds.available || !String(value).trim() || !Number.isFinite(number)) { renderPriceFilter(); return; }
  let low = filters.priceMin ?? bounds.min, high = filters.priceMax ?? bounds.max;
  const chosen = Math.max(bounds.min, Math.min(bounds.max, Math.round(number / 500) * 500));
  if (key === 'min') { low = chosen; high = Math.max(high, low); } else { high = chosen; low = Math.min(low, high); }
  filters.priceMin = low === bounds.min ? null : low;
  filters.priceMax = high === bounds.max ? null : high;
  visibleCount = pageSize;
  renderCatalog();
}

export function renderCatalog() {
  renderPriceFilter();
  const selected = selectProducts(products, filters);
  const shown = selected.slice(0, visibleCount);
  document.getElementById('catalog-grid').innerHTML = shown.map(cardHtml).join('');
  document.getElementById('result-count').innerHTML = '<strong>' + selected.length + '</strong> ' + (selected.length === 1 ? 'perfume' : 'perfumes') + ' de ' + products.length;
  document.getElementById('shown-count').textContent = 'Mostrando ' + shown.length + ' de ' + selected.length;
  document.getElementById('empty-state').hidden = selected.length > 0;
  document.getElementById('more-area').hidden = selected.length === 0;
  document.getElementById('load-more').hidden = shown.length >= selected.length;
}

export function clearFilters() {
  Object.assign(filters, { query: '', brand: '', category: '', availability: '', collection: '', sort: 'name-asc', priceMin: null, priceMax: null });
  document.getElementById('search').value = '';
  ['brand-filter', 'category-filter', 'availability-filter', 'collection-filter'].forEach(id => { 
    const el = document.getElementById(id);
    if (el) el.value = ''; 
  });
  document.getElementById('sort-filter').value = 'name-asc';
  visibleCount = pageSize;
  renderCatalog();
  if (window.location.hash) {
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
}

function bindFilterEvents() {
  document.getElementById('price-toggle').addEventListener('click', () => {
    const panel = document.getElementById('price-panel');
    panel.hidden = !panel.hidden;
    document.getElementById('price-toggle').setAttribute('aria-expanded', String(!panel.hidden));
  });
  for (const key of ['min', 'max']) {
    document.getElementById('price-' + key + '-range').addEventListener('input', e => updatePriceRange(key, e.target.value));
    document.getElementById('price-' + key).addEventListener('change', e => updatePriceRange(key, e.target.value));
  }
  document.getElementById('price-clear').addEventListener('click', () => {
    filters.priceMin = null; filters.priceMax = null; visibleCount = pageSize; renderCatalog();
  });
  document.getElementById('search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { filters.query = e.target.value; visibleCount = pageSize; renderCatalog(); }, 120);
  });
  
  const filterMapping = [
    ['brand-filter', 'brand'], 
    ['category-filter', 'category'], 
    ['availability-filter', 'availability'], 
    ['collection-filter', 'collection'],
    ['sort-filter', 'sort']
  ];

  filterMapping.forEach(([id, key]) => {
    document.getElementById(id).addEventListener('change', e => { filters[key] = e.target.value; visibleCount = pageSize; renderCatalog(); });
  });

  document.getElementById('clear-filters').addEventListener('click', clearFilters);
  document.getElementById('empty-clear').addEventListener('click', clearFilters);
  document.getElementById('load-more').addEventListener('click', () => {
    const previous = visibleCount;
    visibleCount += pageSize;
    renderCatalog();
    const buttons = document.getElementById('catalog-grid').querySelectorAll('[data-open-id]');
    if (buttons[previous]) buttons[previous].focus({ preventScroll: true });
  });
  document.getElementById('filter-toggle').addEventListener('click', () => {
    const expanded = document.getElementById('filter-bar').classList.toggle('is-expanded');
    document.getElementById('filter-toggle').setAttribute('aria-expanded', String(expanded));
  });
}