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

    // CAMBIO: Forzamos 10 por defecto si no hay valor en la DB (|| 10)
    initCatalog(products, Number(config.pageSize) || 10, collections);
    
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