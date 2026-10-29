import { initAuth } from './auth.js';
import { initProductos } from './productos.js';
import { initBanners } from './banners.js';
import { initAjustes } from './ajustes.js';
import { initPedidos } from './pedidos.js';
import { initColecciones } from './colecciones.js'; // <-- NUEVO

document.addEventListener('DOMContentLoaded', () => {
  const navButtons = document.querySelectorAll('.admin-nav button');
  const tabs = document.querySelectorAll('.tab-panel');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  document.querySelectorAll('[data-close-dialog]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('dialog').close();
    });
  });

  initAuth(() => {
    initProductos();
    initBanners();
    initAjustes();
    initPedidos();
    initColecciones(); // <-- NUEVO
  });
});