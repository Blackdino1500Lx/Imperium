// Ficha de producto: apertura, notas, navegación y enlace de WhatsApp.
import { filters, selectProducts } from './filtros.js';
import { escapeHtml, formatPrice, whatsappUrl, visualHtml, AVAILABILITY } from './utils.js';
import { findProduct, getProducts } from './catalogo.js';
import { addToCart } from './carrito.js';

let config = {};
let activeId = null;

// Inicializa la ficha: cierre, navegación, añadir al carrito y delegación.
export function initProductModal(settings) {
  config = settings;
  document.getElementById('modal-close').addEventListener('click', closeProduct);
  document.getElementById('modal-add-cart').addEventListener('click', () => { if (activeId) addToCart(activeId); });
  document.getElementById('product-prev').addEventListener('click', () => navigateProduct(-1));
  document.getElementById('product-next').addEventListener('click', () => navigateProduct(1));
  document.getElementById('product-dialog').addEventListener('click', event => {
    if (event.target === event.currentTarget) closeProduct();
  });
  document.getElementById('product-dialog').addEventListener('close', () => {
    document.body.style.overflow = document.getElementById('cart-dialog').open ? 'hidden' : '';
    activeId = null;
  });
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open-id]');
    if (opener) openProduct(opener.dataset.openId);
  });
  document.addEventListener('error', event => {
    const image = event.target;
    if (image.tagName === 'IMG' && image.dataset.productImage) {
      const p = findProduct(image.dataset.productImage);
      if (p && image.parentElement) image.parentElement.innerHTML = visualHtml({ ...p, photo: '' });
    }
  }, true);
}

// Abre el dialog de un producto y lo rellena.
export function openProduct(id) {
  const p = findProduct(id);
  if (!p) return;
  document.getElementById('modal-cart-status').textContent = '';
  activeId = id;
  refreshModal(p);
  document.getElementById('product-dialog').showModal();
  document.body.style.overflow = 'hidden';
}

// Cierra la ficha de producto.
export function closeProduct() {
  document.getElementById('product-dialog').close();
}

// Vuelve a pintar la ficha y sus notas con los datos del producto.
export function refreshModal(p) {
  document.getElementById('modal-visual').innerHTML = visualHtml(p, true);
  document.getElementById('modal-brand').textContent = p.brand;
  document.getElementById('modal-title').textContent = p.name;
  document.getElementById('modal-price').textContent = formatPrice(p.price);
  const reference = document.getElementById('photo-reference');
  reference.hidden = !p.photoSource;
  reference.textContent = p.photoSource ? 'Imagen de referencia. El tamaño o empaque puede variar.' : '';
  const facts = [['Tamaño', p.size ? p.size + ' ml' : ''], ['Categoría', p.category], ['Disponibilidad', AVAILABILITY[p.availability]]];
  document.getElementById('modal-facts').innerHTML = facts.filter(([, v]) => v).map(([label, value]) => '<div class="fact-row"><dt>' + label + '</dt><dd>' + escapeHtml(value) + '</dd></div>').join('');
  renderProductNotes(p);
  renderProductNavigation(p);
  const link = document.getElementById('modal-whatsapp');
  link.href = whatsappUrl(config.whatsapp, p);
  link.textContent = p.availability === 'agotado' ? 'Consultar por WhatsApp' : 'Pedir por WhatsApp';
  const addButton = document.getElementById('modal-add-cart');
  addButton.disabled = p.availability === 'agotado';
  addButton.textContent = p.availability === 'agotado' ? 'Agotado' : 'Añadir al carrito';
}

// Notas olfativas: se muestran sin inventar niveles si faltan datos.
function renderProductNotes(p) {
  const section = document.getElementById('modal-notes');
  const levels = [['Salida', p.top], ['Corazón', p.heart], ['Fondo', p.base]].filter(([, value]) => value);
  const summary = p.notesSummary || '', notice = p.notesNotice || '';
  section.hidden = !levels.length && !summary && !notice;
  section.innerHTML =
    (levels.length ? '<h3>Notas olfativas</h3><ol class="notes-pyramid">' + levels.map(([label, value]) => '<li class="note-level"><strong>' + label + '</strong><p>' + escapeHtml(value) + '</p></li>').join('') + '</ol>' : '') +
    (summary ? (levels.length ? '<p class="notes-featured"><strong>Notas destacadas:</strong> ' : '<h3>Notas destacadas</h3><p class="notes-featured">') + escapeHtml(summary) + '</p>' : '') +
    (notice ? '<p class="notes-notice">' + escapeHtml(notice) + '</p>' : '');
}

// Posición del producto dentro de la lista filtrada y estado de las flechas.
function renderProductNavigation(p) {
  const selected = selectProducts(getProducts(), filters);
  const index = selected.findIndex(item => item.id === p.id);
  document.getElementById('product-prev').disabled = index <= 0;
  document.getElementById('product-next').disabled = index < 0 || index >= selected.length - 1;
  document.getElementById('product-position').textContent = index >= 0 ? (index + 1) + ' de ' + selected.length : '';
}

// Mueve la ficha al producto anterior o siguiente de la lista filtrada.
function navigateProduct(direction) {
  if (!activeId) return;
  const selected = selectProducts(getProducts(), filters);
  const index = selected.findIndex(p => p.id === activeId);
  const next = selected[index + direction];
  if (index < 0 || !next) return;
  activeId = next.id;
  refreshModal(next);
  document.getElementById('product-dialog').scrollTop = 0;
}