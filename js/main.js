// Arranque de la tienda: carga datos desde api.js, pinta textos y activa menú.
import { getProducts, getSettings, getBanners, getCollections } from './api.js';
import { initCatalog, getTotalProducts } from './catalogo.js';
import { initProductModal } from './producto-modal.js';
import { initCart, renderCart, clearCart } from './carrito.js';
import { initQuiz } from './quiz.js';
import { initBanner } from './banner.js';
import { initCheckout } from './checkout.js';
import { escapeHtml, whatsappUrl } from './utils.js';

function renderSettings(config) {
  const titleEl = document.getElementById('hero-title');
  const title = (config.heroTitle || '').trim();
  if (title) titleEl.textContent = title;
  else titleEl.innerHTML = getTotalProducts() + ' fragancias <span>en una sola casa.</span>';

  document.getElementById('hero-description').textContent = config.heroCopy || '';
  document.getElementById('about-story').textContent = config.story || '';
  document.querySelectorAll('[data-whatsapp]').forEach(a => { a.href = whatsappUrl(config.whatsapp); });

  const phone = String(config.whatsapp || '').replace(/\D/g, '');
  document.getElementById('whatsapp-contact').textContent = phone.startsWith('506') && phone.length === 11 ? phone.slice(3, 7) + '-' + phone.slice(7) : '+' + phone;

  const user = String(config.instagram || '').replace(/^@/, '');
  document.getElementById('instagram-contact').innerHTML = user
    ? '<a href="https://www.instagram.com/' + encodeURIComponent(user) + '/" target="_blank" rel="noopener noreferrer">@' + escapeHtml(user) + '</a>'
    : '[Usuario de Instagram]';

  document.getElementById('hours-contact').textContent = config.hours || '[Días y horas de atención]';
}

function initMenu() {
  const button = document.getElementById('menu-button');
  const nav = document.getElementById('header-nav');
  button.addEventListener('click', () => {
    const expanded = nav.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', expanded ? 'Cerrar menú' : 'Abrir menú');
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) {
      nav.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Abrir menú');
    }
  });
}

// Lee ?collection= tanto de ?search como de #hash (soporta los dos formatos)
function getCollectionFromUrl() {
  // 1. Probar primero el query string normal: ?collection=x
  const fromSearch = new URLSearchParams(location.search).get('collection');
  if (fromSearch) return fromSearch;

  // 2. Probar desde el hash: #catalogo?collection=x  ·  #?collection=x
  const hash = location.hash || '';
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return null;

  const hashQuery = hash.slice(qIndex + 1);
  return new URLSearchParams(hashQuery).get('collection');
}

// Aplica la colección de la URL al filtro y refresca el catálogo
function applyCollectionFromUrl() {
  const slug = getCollectionFromUrl();
  if (!slug) return;

  const select = document.getElementById('collection-filter');
  if (!select) return;

  const slugify = s => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const wanted = slugify(slug);
const option = [...select.options].find(o => o.value && (
  o.value === slug ||
  slugify(o.value) === wanted ||
  slugify(o.textContent) === wanted
));

if (!option) {
  console.warn('[collection] Colección no encontrada:', slug,
    'Opciones:', [...select.options].map(o => [o.value, o.textContent]));
  return;
}

select.value = option.value;
  select.dispatchEvent(new Event('change', { bubbles: true }));

  // Desplazar al catálogo para que el usuario vea el resultado
  const target = document.getElementById('catalogo');
  if (target) {
    // Un pequeño delay para que el catálogo termine de re-renderizar
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
}

async function init() {
  const grid = document.getElementById('catalog-grid');
  const errorState = document.getElementById('api-error');

  try {
    const [products, config, banners, collections] = await Promise.all([
      getProducts(),
      getSettings(),
      getBanners(),
      getCollections()
    ]);

    const heroSection = document.getElementById('inicio');
    if (banners && banners.length > 0) {
      heroSection.hidden = true;
    } else {
      heroSection.hidden = false;
    }

    initCatalog(products, Number(config.pageSize) || 10, collections);
    applyCollectionFromUrl();   // ← aplica la colección de la URL

    initProductModal(config);
    initCart(products, config);
    initQuiz(config);
    initBanner(config, banners);
    renderSettings(config);
    initMenu();

    initCheckout(config, products, () => {
      clearCart();
      renderCart();
    }, () => {
      document.getElementById('cart-dialog').close();
    });

    errorState.hidden = true;
    grid.hidden = false;
  } catch (error) {
    console.error(error);
    grid.hidden = true;
    errorState.hidden = false;

    document.getElementById('retry-button').addEventListener('click', () => location.reload());
  }
}

init();

// Si el usuario navega a un hash que cambia la colección DESPUÉS de cargar
// (por ejemplo, clic en otro banner desde la misma página), refrescamos el filtro
window.addEventListener('hashchange', () => {
  applyCollectionFromUrl();
});
// Si el enlace del banner es solo un nombre (sin http, /, # ni ?), se trata como colección
document.addEventListener('click', event => {
  const link = event.target.closest('#banner-track a');
  if (!link) return;

  const raw = (link.getAttribute('href') || '').trim();
  if (!raw || /^(https?:|mailto:|tel:|\/|#|\?)/i.test(raw)) return;

  event.preventDefault();
  const target = '#catalogo?collection=' + encodeURIComponent(raw);
  if (location.hash === target) applyCollectionFromUrl();
  else location.hash = target;
});