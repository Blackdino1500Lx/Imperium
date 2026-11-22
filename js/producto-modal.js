// Ficha de producto: apertura, notas, perfil de uso, navegación y WhatsApp.
import { filters, selectProducts } from './filtros.js';
import { escapeHtml, whatsappUrl, visualHtml, AVAILABILITY, findPresentation, effectivePrice, priceHtml, discountBadgeHtml, presentationLabel, hasSale } from './utils.js';
import { findProduct, getProducts } from './catalogo.js';
import { addToCart } from './carrito.js';
import { getProductDetails } from './api.js';
import { analyzeProduct, buildCharacterLine, buildUsagePhrase } from './usage.js';

const DEFAULT_USAGE_NOTICE = 'Uso sugerido a partir de las notas publicadas; elige la ocasión según tus preferencias y el clima.';

let config = {};
let activeId = null;
let activeSize = null; // presentación elegida en la ficha

export function initProductModal(settings) {
  config = settings;
  document.getElementById('modal-close').addEventListener('click', closeProduct);
  document.getElementById('modal-add-cart').addEventListener('click', () => { if (activeId) addToCart(activeId, activeSize); });
  document.getElementById('product-prev').addEventListener('click', () => navigateProduct(-1));
  document.getElementById('product-next').addEventListener('click', () => navigateProduct(1));
  document.getElementById('product-dialog').addEventListener('click', event => {
    if (event.target === event.currentTarget) closeProduct();
  });
  document.getElementById('product-dialog').addEventListener('close', () => {
    document.body.style.overflow = document.getElementById('cart-dialog').open ? 'hidden' : '';
    activeId = null;
    activeSize = null;
  });
  document.addEventListener('click', event => {
    // data-choose-id: botón "Elegir presentación" de las tarjetas con varias presentaciones
    const opener = event.target.closest('[data-open-id], [data-choose-id]');
    if (opener) openProduct(opener.dataset.openId || opener.dataset.chooseId);
  });
  const picker = document.getElementById('modal-presentations');
  if (picker) picker.addEventListener('click', event => {
    const option = event.target.closest('[data-size]');
    if (!option || !activeId) return;
    const p = findProduct(activeId);
    if (!p) return;
    activeSize = option.dataset.size;
    document.getElementById('modal-cart-status').textContent = '';
    renderSelection(p);
    const selected = picker.querySelector('[data-size="' + CSS.escape(activeSize) + '"]');
    if (selected) selected.focus({ preventScroll: true });
  });
  document.addEventListener('error', event => {
    const image = event.target;
    if (image.tagName === 'IMG' && image.dataset.productImage) {
      const p = findProduct(image.dataset.productImage);
      if (p && image.parentElement) image.parentElement.innerHTML = visualHtml({ ...p, photo: '' }, !!image.closest('#modal-visual'));
    }
  }, true);
}

export async function openProduct(id) {
  const p = findProduct(id);
  if (!p) return;
  document.getElementById('modal-cart-status').textContent = '';
  activeId = id;
  activeSize = defaultSize(p);

  refreshModal(p);
  document.getElementById('product-dialog').showModal();
  document.body.style.overflow = 'hidden';

  if (p.top === undefined) {
    const notesSection = document.getElementById('modal-notes');
    notesSection.innerHTML = '<p style="color: var(--muted); font-size: 14px;">Cargando notas olfativas...</p>';
    notesSection.hidden = false;

    const details = await getProductDetails(p.id);
    if (details) {
      p.top = details.top;
      p.heart = details.heart;
      p.base = details.base;
      if (details.usageOverride !== undefined) p.usageOverride = details.usageOverride;
      if (details.usage_override !== undefined) p.usageOverride = details.usage_override;
      if (details.perfumeDescription) p.perfumeDescription = details.perfumeDescription;
      if (details.usageSuggestion)    p.usageSuggestion    = details.usageSuggestion;
      if (details.usageNotice)        p.usageNotice        = details.usageNotice;
    } else {
      p.top = null; p.heart = null; p.base = null;
    }

    if (activeId === id) {
      renderProductNotes(p);
      renderProductGuide(p);
    }
  }
}

export function closeProduct() {
  document.getElementById('product-dialog').close();
}

// Presentación con la que se abre la ficha: la primera que se pueda pedir
function defaultSize(p) {
  const list = p.presentations;
  return (list.find(x => x.availability !== 'agotado') || list[0]).size;
}

export function refreshModal(p) {
  document.getElementById('modal-visual').innerHTML = visualHtml(p, true);
  document.getElementById('modal-brand').textContent = p.brand;
  document.getElementById('modal-title').textContent = p.name;
  const reference = document.getElementById('photo-reference');
  reference.hidden = !p.photoSource;
  reference.textContent = p.photoSource ? 'Imagen de referencia. El tamaño o empaque puede variar.' : '';

  renderSelection(p);
  renderProductNotes(p);
  renderProductGuide(p);
  renderProductNavigation(p);
}

// Parte de la ficha que cambia al elegir otra presentación: precio, datos, WhatsApp y botón del carrito
function renderSelection(p) {
  const pres = findPresentation(p, activeSize);
  const multi = p.presentations.length > 1;

  document.getElementById('modal-price').innerHTML = priceHtml(pres) + (hasSale(pres.price, pres.sale_price) ? ' ' + discountBadgeHtml(pres) : '');
  renderPresentationPicker(p, pres);

  const facts = [['Tamaño', !multi && pres.size ? pres.size + ' ml' : ''], ['Categoría', p.category], ['Disponibilidad', AVAILABILITY[pres.availability]]];
  document.getElementById('modal-facts').innerHTML = facts.filter(([, v]) => v).map(([label, value]) => '<div class="fact-row"><dt>' + label + '</dt><dd>' + escapeHtml(value) + '</dd></div>').join('');

  const link = document.getElementById('modal-whatsapp');
  link.href = whatsappUrl(config.whatsapp, p, pres);
  link.textContent = pres.availability === 'agotado' ? 'Consultar por WhatsApp' : 'Pedir por WhatsApp';
  const addButton = document.getElementById('modal-add-cart');
  addButton.disabled = pres.availability === 'agotado';
  addButton.textContent = pres.availability === 'agotado' ? 'Agotado' : 'Añadir al carrito';
}

// Botones de presentación (solo si el producto tiene más de una)
function renderPresentationPicker(p, current) {
  const box = document.getElementById('modal-presentations');
  if (!box) return;
  if (p.presentations.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = '<p class="presentation-label">Presentación</p><div class="presentation-options" role="group" aria-label="Presentación">' +
    p.presentations.map(x => {
      const selected = x.size === current.size;
      const price = hasSale(x.price, x.sale_price)
        ? '<s class="price-old">' + formatPriceShort(x.price) + '</s> ' + formatPriceShort(x.sale_price)
        : formatPriceShort(effectivePrice(x));
      return '<button type="button" class="presentation-option' + (selected ? ' is-selected' : '') + (x.availability === 'agotado' ? ' is-soldout' : '') + '" data-size="' + escapeHtml(x.size) + '" aria-pressed="' + selected + '">' +
        '<span class="presentation-size">' + escapeHtml(presentationLabel(x)) + '</span>' +
        '<span class="presentation-price">' + (x.availability === 'agotado' ? 'Agotado' : price) + '</span></button>';
    }).join('') + '</div>';
}

function formatPriceShort(value) {
  return Number(value) > 0 ? '₡' + Number(value).toLocaleString('de-DE', { maximumFractionDigits: 0 }) : 'Por confirmar';
}

function renderProductNotes(p) {
  const section = document.getElementById('modal-notes');
  const levels = [['Salida', p.top], ['Corazón', p.heart], ['Fondo', p.base]].filter(([, value]) => value);
  const summary = p.notesSummary || '', notice = p.notesNotice || '';

  if (levels.length === 0 && !summary && !notice && p.top === undefined) return;

  section.hidden = !levels.length && !summary && !notice;
  section.innerHTML =
    (levels.length ? '<h3>Notas olfativas</h3><ol class="notes-pyramid">' + levels.map(([label, value]) => '<li class="note-level"><strong>' + label + '</strong><p>' + escapeHtml(value) + '</p></li>').join('') + '</ol>' : '') +
    (summary ? (levels.length ? '<p class="notes-featured"><strong>Notas destacadas:</strong> ' : '<h3>Notas destacadas</h3><p class="notes-featured">') + escapeHtml(summary) + '</p>' : '') +
    (notice ? '<p class="notes-notice">' + escapeHtml(notice) + '</p>' : '');
}

function renderProductGuide(p) {
  const section = document.getElementById('modal-guide');
  if (!section) return;

  // Override manual > calculado
  const manual = p.usageOverride || p.usage_override || p.usageSuggestion || '';

  const analysis = analyzeProduct(p);
  const character = buildCharacterLine(analysis);
  const usage = manual || buildUsagePhrase(analysis);

  const notice = p.usageNotice !== undefined
    ? p.usageNotice
    : (usage || character ? DEFAULT_USAGE_NOTICE : '');

  if (!character && !usage && !notice && p.top === undefined) {
    section.hidden = true;
    return;
  }
  if (!character && !usage && !notice) {
    section.hidden = true;
    section.innerHTML = '';
    return;
  }

  section.hidden = false;
  section.innerHTML =
    '<h3>Perfil y uso</h3>' +
    (character ? `<p class="perfume-character"><strong>Carácter:</strong> ${escapeHtml(character)}.</p>` : '') +
    (usage ? `<dl class="product-facts"><div class="fact-row"><dt>Uso sugerido</dt><dd>${escapeHtml(usage)}</dd></div></dl>` : '') +
    (notice ? `<p class="notes-notice">${escapeHtml(notice)}</p>` : '');

  if (analysis) {
    section.dataset.families = analysis.families.join(',');
    section.dataset.momento  = analysis.momento || '';
    section.dataset.clima    = analysis.clima || '';
    section.dataset.formalidad = analysis.formalidad || '';
    //section.dataset.ocasion  = analysis.ocasion.join(',');
  }
}

function renderProductNavigation(p) {
  const selected = selectProducts(getProducts(), filters);
  const index = selected.findIndex(item => item.id === p.id);
  document.getElementById('product-prev').disabled = index <= 0;
  document.getElementById('product-next').disabled = index < 0 || index >= selected.length - 1;
  document.getElementById('product-position').textContent = index >= 0 ? (index + 1) + ' de ' + selected.length : '';
}

function navigateProduct(direction) {
  if (!activeId) return;
  const selected = selectProducts(getProducts(), filters);
  const index = selected.findIndex(p => p.id === activeId);
  const next = selected[index + direction];
  if (index < 0 || !next) return;
  openProduct(next.id);
  document.getElementById('product-dialog').scrollTop = 0;
}