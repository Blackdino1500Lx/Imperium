// Carrito: estado en localStorage, panel lateral y envío por WhatsApp.
import { escapeHtml, formatPrice, fullName, AVAILABILITY } from './utils.js';

const CART_KEY = 'imperium.carrito.v1';
const CART_QUANTITY_LIMIT = 99;

let products = [];
let config = {};
let cart = {};
let cartSaveFailed = false;
let cartFeedbackTimer;

function persistCart() {
  try {
    if (Object.keys(cart).length) localStorage.setItem(CART_KEY, JSON.stringify(cart));
    else localStorage.removeItem(CART_KEY);
    cartSaveFailed = false;
  } catch { cartSaveFailed = true; }
}

function cleanCart(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const p of products) {
    const quantity = Object.prototype.hasOwnProperty.call(value, p.id) ? Number(value[p.id]) : 0;
    if (p.availability !== 'agotado' && Number.isInteger(quantity) && quantity > 0) result[p.id] = Math.min(quantity, CART_QUANTITY_LIMIT);
  }
  return result;
}

function loadCart() {
  try { cart = cleanCart(JSON.parse(localStorage.getItem(CART_KEY) || '{}')); }
  catch { cart = {}; cartSaveFailed = true; }
}

function cartLines() {
  return products.filter(p => Object.prototype.hasOwnProperty.call(cart, p.id)).map(p => ({ product: p, quantity: cart[p.id] }));
}

function cartSummary() {
  const lines = cartLines();
  return {
    lines,
    units: lines.reduce((n, line) => n + line.quantity, 0),
    total: lines.reduce((n, line) => n + (Number(line.product.price) > 0 ? Number(line.product.price) * line.quantity : 0), 0),
    unknownPrice: lines.some(line => !(Number(line.product.price) > 0))
  };
}

function cartFeedback(message) {
  const el = document.getElementById('cart-feedback');
  el.textContent = message;
  el.hidden = false;
  document.getElementById('modal-cart-status').textContent = message;
  clearTimeout(cartFeedbackTimer);
  cartFeedbackTimer = setTimeout(() => { el.hidden = true; }, 4200);
}

export function renderCart() {
  const cleaned = cleanCart(cart);
  if (JSON.stringify(cleaned) !== JSON.stringify(cart)) { cart = cleaned; persistCart(); }
  const summary = cartSummary();
  
  document.getElementById('cart-count').textContent = summary.units > 99 ? '99+' : String(summary.units);
  document.getElementById('cart-button').setAttribute('aria-label', 'Ver carrito: ' + summary.units + ' ' + (summary.units === 1 ? 'perfume' : 'perfumes'));
  document.getElementById('cart-description').textContent = summary.units
    ? summary.units + ' ' + (summary.units === 1 ? 'perfume seleccionado' : 'perfumes seleccionados') + '. Confirma tu pedido con Imperium.'
    : 'Reúne aquí los perfumes que quieres pedir.';
  document.getElementById('cart-empty').hidden = summary.lines.length > 0;
  document.getElementById('cart-items').hidden = !summary.lines.length;
  document.getElementById('cart-footer').hidden = !summary.lines.length;
  document.getElementById('cart-clear').hidden = !summary.lines.length;
  
  document.getElementById('cart-items').innerHTML = summary.lines.map(({ product: p, quantity }) => {
    const name = escapeHtml(fullName(p)), id = escapeHtml(p.id);
    const availability = p.availability === 'confirmar' ? 'Disponibilidad por confirmar' : AVAILABILITY[p.availability] || '';
    return '<article class="cart-item"><div class="cart-item-heading"><div><p class="cart-item-brand">' + escapeHtml(p.brand) + '</p><h3>' + escapeHtml(p.name) + '</h3></div><p class="cart-unit-price">' + formatPrice(p.price) + '<span>por unidad</span></p></div>' +
      '<p class="cart-item-meta">' + [p.size ? escapeHtml(p.size) + ' ml' : '', escapeHtml(availability)].filter(Boolean).join(' · ') + '</p>' +
      '<div class="cart-item-bottom"><div class="cart-quantity" role="group" aria-label="Cantidad de ' + name + '"><button type="button" data-cart-action="decrease" data-cart-id="' + id + '" aria-label="Disminuir cantidad de ' + name + '"' + (quantity <= 1 ? ' disabled' : '') + '>−</button><output aria-label="Cantidad">' + quantity + '</output><button type="button" data-cart-action="increase" data-cart-id="' + id + '" aria-label="Aumentar cantidad de ' + name + '"' + (quantity >= CART_QUANTITY_LIMIT ? ' disabled' : '') + '>+</button></div>' +
      '<button type="button" class="text-button cart-remove" data-cart-action="remove" data-cart-id="' + id + '" aria-label="Quitar ' + name + ' del carrito">Quitar</button><p class="cart-line-total">' + (Number(p.price) > 0 ? formatPrice(Number(p.price) * quantity) : 'Por confirmar') + '</p></div></article>';
  }).join('');
  
  document.getElementById('cart-total-label').textContent = summary.unknownPrice ? 'Subtotal conocido' : 'Total de perfumes';
  document.getElementById('cart-total').textContent = summary.total > 0 ? formatPrice(summary.total) : summary.lines.length ? 'Por confirmar' : '₡0';
  document.getElementById('cart-price-notice').hidden = !summary.unknownPrice;
  document.getElementById('cart-storage-notice').hidden = !cartSaveFailed;
  
  if (window.syncCartToCheckout) window.syncCartToCheckout(cart);
}

export function addToCart(id) {
  const p = products.find(p => p.id === id);
  if (!p) return false;
  if (p.availability === 'agotado') { cartFeedback('Este perfume está agotado. Puedes consultar su regreso por WhatsApp.'); return false; }
  if ((cart[id] || 0) >= CART_QUANTITY_LIMIT) { cartFeedback('Puedes seleccionar hasta ' + CART_QUANTITY_LIMIT + ' unidades de cada perfume.'); return false; }
  cart[id] = (cart[id] || 0) + 1;
  persistCart();
  renderCart();
  cartFeedback(fullName(p) + ' se añadió al carrito.');
  return true;
}

// NUEVO: Vaciar carrito sin recargar
export function clearCart() {
  cart = {};
  persistCart();
}

function setCartQuantity(id, value) {
  if (!Object.prototype.hasOwnProperty.call(cart, id) || !Number.isInteger(value) || value < 0 || value > CART_QUANTITY_LIMIT) return false;
  if (value === 0) delete cart[id]; else cart[id] = value;
  persistCart();
  renderCart();
  return true;
}

function openCart() {
  const productDialog = document.getElementById('product-dialog');
  if (productDialog.open) productDialog.close();
  renderCart();
  const cartDialog = document.getElementById('cart-dialog');
  if (!cartDialog.open) cartDialog.showModal();
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-dialog').close();
}

export function initCart(list, settings) {
  products = list;
  config = settings;
  loadCart();
  renderCart();
  
  document.getElementById('cart-button').addEventListener('click', openCart);
  document.getElementById('modal-view-cart').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-continue').addEventListener('click', () => { closeCart(); location.hash = '#catalogo'; });
  document.getElementById('cart-clear').addEventListener('click', () => { 
    clearCart(); 
    renderCart(); 
    cartFeedback('Se vació el carrito.'); 
  });
  
  document.getElementById('catalog-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-cart-add]');
    if (button) addToCart(button.dataset.cartAdd);
  });
  
  document.getElementById('cart-items').addEventListener('click', event => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;
    const id = button.dataset.cartId, action = button.dataset.cartAction;
    if (!Object.prototype.hasOwnProperty.call(cart, id)) return;
    const quantity = cart[id];
    setCartQuantity(id, action === 'remove' ? 0 : quantity + (action === 'increase' ? 1 : -1));
    const next = document.getElementById('cart-items').querySelector('[data-cart-id="' + id + '"][data-cart-action="' + action + '"]');
    if (next && !next.disabled) next.focus({ preventScroll: true });
    else document.getElementById('cart-close').focus({ preventScroll: true });
  });
  
  document.getElementById('cart-dialog').addEventListener('close', () => {
    document.body.style.overflow = document.getElementById('product-dialog').open ? 'hidden' : '';
    document.getElementById('cart-button').focus({ preventScroll: true });
  });
  
  document.getElementById('cart-dialog').addEventListener('click', event => {
    if (event.target === event.currentTarget) {
      const box = event.target.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeCart();
    }
  });
  
  window.addEventListener('storage', event => {
    if (event.key === CART_KEY) {
      try { cart = cleanCart(JSON.parse(event.newValue || '{}')); cartSaveFailed = false; renderCart(); } catch {}
    }
  });
}