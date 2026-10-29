// Orquestador del panel de administración
import { initAuth } from './auth.js';
import { initProductos } from './productos.js';
import { initBanners } from './banners.js';
import { initAjustes } from './ajustes.js';
import { initPedidos } from './pedidos.js';

document.addEventListener('DOMContentLoaded', () => {
  // Lógica de pestañas
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

  // Cerrar dialogs con el botón Cancelar
  document.querySelectorAll('[data-close-dialog]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('dialog').close();
    });
  });

  // Arrancar Auth (esto ocultará el login si ya hay sesión y llamará a los init)
  initAuth(() => {
    initProductos();
    initBanners();
    initAjustes();
    initPedidos();
  });
});