// Arranque de la tienda: carga datos desde api.js, pinta textos y activa menú.
import { getProducts, getSettings } from './api.js';
import { initCatalog, getTotalProducts } from './catalogo.js';
import { initProductModal } from './producto-modal.js';
import { initCart, renderCart } from './carrito.js';
import { initQuiz } from './quiz.js';
import { initBanner } from './banner.js';
import { initCheckout } from './checkout.js';
import { escapeHtml, whatsappUrl } from './utils.js';

// Pinta textos del hero, la historia y los datos de contacto.
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

// Menú móvil: abre, cierra y se cierra al navegar a una sección.
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

// Arranca la tienda leyendo la base de datos.
async function init() {
  const grid = document.getElementById('catalog-grid');
  const errorState = document.getElementById('api-error');
  
  try {
    const [products, config] = await Promise.all([getProducts(), getSettings()]);
    
    initCatalog(products, Number(config.pageSize) || 48);
    initProductModal(config);
    initCart(products, config);
    initQuiz(config);
    initBanner(config);
    renderSettings(config);
    initMenu();

    // Inicializar checkout pasándole los productos y un callback para vaciar el carrito
    initCheckout(config, products, (newCart) => {
      // Al crear el pedido, forzamos el carrito a vaciarse
      localStorage.removeItem('imperium.carrito.v1');
      window.location.reload(); // Recarga simple para actualizar UI
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