// Carrito: estado en localStorage, panel lateral y envío por WhatsApp.
import { escapeHtml, formatPrice, fullName, AVAILABILITY, effectivePrice, hasSale } from './utils.js';

const CART_KEY = 'imperium.carrito.v1';
const CART_QUANTITY_LIMIT = 99;
const KEY_SEP = '::';

let products = [];
let byId = new Map();
let config = {};
// Cada línea del carrito es un producto + una presentación. Clave: "id::tamaño" (tamaño vacío si no tiene)
let cart = {};
let cartSaveFailed = false;
let cartFeedbackTimer;

function cartKey(id, size) {
  return id + KEY_SEP + (size || '');
}

function parseKey(key) {
  const text = String(key);
  const i = text.lastIndexOf(KEY_SEP);
  // Carritos guardados antes de las presentaciones: solo traen el id → presentación principal
  if (i === -1) return { id: text, size: null };
  return { id: text.slice(0, i), size: text.slice(i + KEY_SEP.length) };
}

function presentationOf(product, size) {
  if (!product) return null;
  return size == null ? product.presentations[0] : (product.presentations.find(x => x.size === size) || null);
}

function persistCart() {
  try {
    if (Object.keys(cart).length) localStorage.setItem(CART_KEY, JSON.stringify(cart));
    else localStorage.removeItem(CART_KEY);
    cartSaveFailed = false;
  } catch { cartSaveFailed = true; }
}

// Deja solo líneas válidas (producto y presentación existentes, no agotadas) y migra el formato viejo
function cleanCart(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [key, raw] of Object.entries(value)) {
    const { id, size } = parseKey(key);
    const product = byId.get(id);
    const pres = presentationOf(product, size);
    const quantity = Number(raw);
    if (!pres || pres.availability === 'agotado' || !Number.isInteger(quantity) || quantity < 1) continue;
    const clean = cartKey(product.id, pres.size);
    result[clean] = Math.min((result[clean] || 0) + quantity, CART_QUANTITY_LIMIT);
  }
  return result;
}

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    cart = cleanCart(stored);
    // Si el carrito guardado tenía el formato viejo (solo ids) o líneas inválidas, se reescribe limpio
    if (JSON.stringify(cart) !== JSON.stringify(stored)) persistCart();
  } catch { cart = {}; cartSaveFailed = true; }
}

function cartLines() {
  return Object.entries(cart).map(([key, quantity]) => {
    const { id, size } = parseKey(key);
    const product = byId.get(id);
    const pres = presentationOf(product, size);
    return product && pres ? { key, product, pres, quantity } : null;
  }).filter(Boolean);
}

// Lo que necesita el checkout: [{ id, size, quantity }]
function cartItems() {
  return cartLines().map(({ product, pres, quantity }) => ({ id: product.id, size: pres.size, quantity }));
}

function cartSummary() {
  const lines = cartLines();
  return {
    lines,
    units: lines.reduce((n, line) => n + line.quantity, 0),
    total: lines.reduce((n, line) => n + (effectivePrice(line.pres) > 0 ? effectivePrice(line.pres) * line.quantity : 0), 0),
    unknownPrice: lines.some(line => !(effectivePrice(line.pres) > 0))
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

function lineName(product, pres) {
  return fullName(product) + (pres.size ? ' ' + pres.size + ' ml' : '');
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

  document.getElementById('cart-items').innerHTML = summary.lines.map(({ key, product: p, pres, quantity }) => {
    const name = escapeHtml(lineName(p, pres)), id = escapeHtml(key);
    const unit = effectivePrice(pres);
    const availability = pres.availability === 'confirmar' ? 'Disponibilidad por confirmar' : AVAILABILITY[pres.availability] || '';
    const unitHtml = hasSale(pres.price, pres.sale_price)
      ? '<s class="price-old">' + formatPrice(pres.price) + '</s> ' + formatPrice(pres.sale_price)
      : formatPrice(pres.price);
    return '<article class="cart-item"><div class="cart-item-heading"><div><p class="cart-item-brand">' + escapeHtml(p.brand) + '</p><h3>' + escapeHtml(p.name) + '</h3></div><p class="cart-unit-price">' + unitHtml + '<span>por unidad</span></p></div>' +
      '<p class="cart-item-meta">' + [pres.size ? escapeHtml(pres.size) + ' ml' : '', escapeHtml(availability)].filter(Boolean).join(' · ') + '</p>' +
      '<div class="cart-item-bottom"><div class="cart-quantity" role="group" aria-label="Cantidad de ' + name + '"><button type="button" data-cart-action="decrease" data-cart-id="' + id + '" aria-label="Disminuir cantidad de ' + name + '"' + (quantity <= 1 ? ' disabled' : '') + '>−</button><output aria-label="Cantidad">' + quantity + '</output><button type="button" data-cart-action="increase" data-cart-id="' + id + '" aria-label="Aumentar cantidad de ' + name + '"' + (quantity >= CART_QUANTITY_LIMIT ? ' disabled' : '') + '>+</button></div>' +
      '<button type="button" class="text-button cart-remove" data-cart-action="remove" data-cart-id="' + id + '" aria-label="Quitar ' + name + ' del carrito">Quitar</button><p class="cart-line-total">' + (unit > 0 ? formatPrice(unit * quantity) : 'Por confirmar') + '</p></div></article>';
  }).join('');

  document.getElementById('cart-total-label').textContent = summary.unknownPrice ? 'Subtotal conocido' : 'Total de perfumes';
  document.getElementById('cart-total').textContent = summary.total > 0 ? formatPrice(summary.total) : summary.lines.length ? 'Por confirmar' : '₡0';
  document.getElementById('cart-price-notice').hidden = !summary.unknownPrice;
  document.getElementById('cart-storage-notice').hidden = !cartSaveFailed;

  if (window.syncCartToCheckout) window.syncCartToCheckout(cartItems());
}

// size: tamaño de la presentación; si no se indica, se añade la principal (la primera)
export function addToCart(id, size) {
  const p = byId.get(id);
  const pres = presentationOf(p, size);
  if (!p || !pres) return false;
  if (pres.availability === 'agotado') { cartFeedback('Esta presentación está agotada. Puedes consultar su regreso por WhatsApp.'); return false; }

  const key = cartKey(p.id, pres.size);
  if ((cart[key] || 0) >= CART_QUANTITY_LIMIT) { cartFeedback('Puedes seleccionar hasta ' + CART_QUANTITY_LIMIT + ' unidades de cada perfume.'); return false; }

  cart[key] = (cart[key] || 0) + 1;
  persistCart();
  renderCart();
  cartFeedback(lineName(p, pres) + ' se añadió al carrito.');

  // ANIMACIÓN: Hacer rebotar el icono del carrito
  const cartBtn = document.getElementById('cart-button');
  cartBtn.classList.remove('cart-bump');
  void cartBtn.offsetWidth; // Truco para reiniciar la animación
  cartBtn.classList.add('cart-bump');

  return true;
}

export function clearCart() {
  cart = {};
  persistCart();
}

function setCartQuantity(key, value) {
  if (!Object.prototype.hasOwnProperty.call(cart, key) || !Number.isInteger(value) || value < 0 || value > CART_QUANTITY_LIMIT) return false;
  if (value === 0) delete cart[key]; else cart[key] = value;
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
  byId = new Map(list.map(p => [p.id, p]));
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

  // ANIMACIÓN: Cambiar texto del botón al añadir desde la tarjeta
  // (las tarjetas con varias presentaciones no tienen data-cart-add: abren la ficha para elegir)
  document.getElementById('catalog-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-cart-add]');
    if (button) {
      const success = addToCart(button.dataset.cartAdd);
      if (success) {
        const originalText = button.textContent;
        button.textContent = '¡Añadido!';
        button.classList.add('added');
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('added');
        }, 1500);
      }
    }
  });

  document.getElementById('cart-items').addEventListener('click', event => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;
    const key = button.dataset.cartId, action = button.dataset.cartAction;
    if (!Object.prototype.hasOwnProperty.call(cart, key)) return;
    const quantity = cart[key];
    setCartQuantity(key, action === 'remove' ? 0 : quantity + (action === 'increase' ? 1 : -1));
    const next = [...document.getElementById('cart-items').querySelectorAll('[data-cart-action="' + action + '"]')].find(el => el.dataset.cartId === key);
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