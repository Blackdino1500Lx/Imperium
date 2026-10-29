// Ficha de producto: apertura, notas, navegación y enlace de WhatsApp.
import { filters, selectProducts } from './filtros.js';
import { escapeHtml, formatPrice, whatsappUrl, visualHtml, AVAILABILITY } from './utils.js';
import { findProduct, getProducts } from './catalogo.js';
import { addToCart } from './carrito.js';
import { getProductDetails } from './api.js';

let config = {};
let activeId = null;

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

export async function openProduct(id) {
  const p = findProduct(id);
  if (!p) return;
  document.getElementById('modal-cart-status').textContent = '';
  activeId = id;
  
  // Mostramos el modal con los datos básicos que ya tenemos
  refreshModal(p);
  document.getElementById('product-dialog').showModal();
  document.body.style.overflow = 'hidden';

  // Si el producto no tiene las notas cargadas (porque vinieron en carga diferida)
  if (p.top === undefined) {
    // Mostramos un loader en la sección de notas
    const notesSection = document.getElementById('modal-notes');
    notesSection.innerHTML = '<p style="color: var(--muted); font-size: 14px;">Cargando notas olfativas...</p>';
    notesSection.hidden = false;

    // Pedimos las notas a la base de datos
    const details = await getProductDetails(p.id);
    if (details) {
      p.top = details.top;
      p.heart = details.heart;
      p.base = details.base;
    } else {
      p.top = null; p.heart = null; p.base = null; // Evitar bucle infinito de carga
    }
    
    // Si el usuario no ha cerrado el modal ni cambiado a otro producto mientras cargaba, pintamos las notas
    if (activeId === id) {
      renderProductNotes(p);
    }
  }
}

export function closeProduct() {
  document.getElementById('product-dialog').close();
}

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

function renderProductNotes(p) {
  const section = document.getElementById('modal-notes');
  const levels = [['Salida', p.top], ['Corazón', p.heart], ['Fondo', p.base]].filter(([, value]) => value);
  const summary = p.notesSummary || '', notice = p.notesNotice || '';
  
  if (levels.length === 0 && !summary && !notice && p.top === undefined) return; // Aún no se han cargado
  
  section.hidden = !levels.length && !summary && !notice;
  section.innerHTML =
    (levels.length ? '<h3>Notas olfativas</h3><ol class="notes-pyramid">' + levels.map(([label, value]) => '<li class="note-level"><strong>' + label + '</strong><p>' + escapeHtml(value) + '</p></li>').join('') + '</ol>' : '') +
    (summary ? (levels.length ? '<p class="notes-featured"><strong>Notas destacadas:</strong> ' : '<h3>Notas destacadas</h3><p class="notes-featured">') + escapeHtml(summary) + '</p>' : '') +
    (notice ? '<p class="notes-notice">' + escapeHtml(notice) + '</p>' : '');
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
  openProduct(next.id); // Usamos openProduct para que también cargue las notas del siguiente
  document.getElementById('product-dialog').scrollTop = 0;
}