// Lógica de la página de seguimiento de pedido
import { getOrderByToken } from './api.js';
import { formatPrice, escapeHtml } from './utils.js';

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('t');
const loadingEl = document.getElementById('loading');
const errorBox = document.getElementById('error-box');
const orderBox = document.getElementById('order-box');
const timelineContainer = document.getElementById('timeline-container');

const STATUS_STEPS = ['pedido', 'comprado', 'enviando', 'entregado'];

async function loadOrder() {
  if (!token) {
    showError();
    return;
  }

  try {
    const order = await getOrderByToken(token);
    renderOrder(order);
  } catch (error) {
    console.error(error);
    showError();
  }
}

function showError() {
  loadingEl.hidden = true;
  errorBox.hidden = false;
}

function renderOrder(order) {
  loadingEl.hidden = true;
  orderBox.hidden = false;

  document.getElementById('order-number').textContent = order.number;
  document.getElementById('order-total').textContent = formatPrice(order.total);
  
  const date = new Date(order.created_at).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  document.getElementById('order-date').textContent = `Realizado el ${date}`;

  // Badge de estado
  const badge = document.getElementById('order-status');
  badge.textContent = order.status;
  badge.className = `order-status-badge status-${order.status}`;

  // Línea de tiempo
  if (order.status === 'cancelado') {
    timelineContainer.innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <strong>Este pedido ha sido cancelado.</strong> Si tienes dudas, contáctanos por WhatsApp.
      </div>
    `;
  } else {
    const currentIndex = STATUS_STEPS.indexOf(order.status);
    document.querySelectorAll('.timeline-step').forEach((el, index) => {
      el.classList.remove('done', 'current');
      if (index < currentIndex) el.classList.add('done');
      if (index === currentIndex) el.classList.add('current');
    });
  }

  // Ítems
  const tbody = document.getElementById('order-items');
  tbody.innerHTML = order.items.map(item => `
    <tr>
      <td>${escapeHtml(item.brand)} ${escapeHtml(item.name)} <br><small style="color:var(--muted)">${item.size ? item.size + ' ml' : ''}</small></td>
      <td>${item.quantity}</td>
      <td style="text-align: right;">${formatPrice(item.unit_price * item.quantity)}</td>
    </tr>
  `).join('');

  // Eventos
  const eventsList = document.getElementById('order-events');
  eventsList.innerHTML = order.events.map(ev => {
    const d = new Date(ev.created_at).toLocaleDateString('es-CR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `<li style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed var(--line);">
      <strong>${d}</strong> - ${escapeHtml(ev.note || `Estado cambiado a ${ev.status}`)}
    </li>`;
  }).join('');

  // Actualizar cada 30 segundos
  setTimeout(loadOrder, 30000);
}

loadOrder();