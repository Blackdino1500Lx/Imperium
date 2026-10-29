// Módulo de pedidos del admin
import { supabase } from './auth.js';
import { formatPrice, escapeHtml } from '../../js/utils.js';

let allOrders = [];

async function loadOrders() {
  const tbody = document.querySelector('#tab-pedidos tbody') || document.getElementById('pedidos-list');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  const { data, error } = await supabase.schema('imperium').from('orders').select('*').order('created_at', { ascending: false });
  
  if (error) {
    console.error(error);
    return;
  }
  
  allOrders = data;
  renderOrdersTable(allOrders);
}

function renderOrdersTable(orders) {
  // En este paso reemplazamos el contenido de la pestaña
  const container = document.getElementById('tab-pedidos');
  container.innerHTML = `
    <div class="panel-header">
      <h2>Pedidos</h2>
      <button class="button gold" id="btn-refresh-orders">Actualizar</button>
    </div>
    <div class="table-wrap">
      <table id="orders-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${orders.length === 0 ? '<tr><td colspan="6">No hay pedidos aún.</td></tr>' : orders.map(o => `
            <tr>
              <td><strong>${o.number}</strong></td>
              <td>${new Date(o.created_at).toLocaleDateString('es-CR')}</td>
              <td>${escapeHtml(o.customer_name)}<br><small>${escapeHtml(o.customer_phone)}</small></td>
              <td>${formatPrice(o.total)}</td>
              <td><span class="status-badge status-${o.status}">${o.status}</span></td>
              <td class="actions-cell">
                <button class="button outline small" data-detail="${o.id}">Ver detalle</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-refresh-orders').addEventListener('click', loadOrders);
  
  document.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => openOrderDetail(btn.dataset.detail));
  });
}

async function openOrderDetail(id) {
  const order = allOrders.find(o => o.id === id);
  if (!order) return;

  // Buscar items y eventos
  const [itemsReq, eventsReq] = await Promise.all([
    supabase.schema('imperium').from('order_items').select('*').eq('order_id', id),
    supabase.schema('imperium').from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: true })
  ]);

  const items = itemsReq.data || [];
  const events = eventsReq.data || [];

  // Crear dialog al vuelo
  const dialog = document.createElement('dialog');
  dialog.className = 'admin-dialog';
  dialog.innerHTML = `
    <div class="dialog-form">
      <h3>Pedido ${order.number}</h3>
      <p style="margin-bottom: 20px;"><strong>Cliente:</strong> ${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_phone)})</p>
      
      <div style="margin-bottom: 20px; max-height: 200px; overflow-y: auto;">
        <table style="width: 100%; font-size: 14px;">
          <tbody>
            ${items.map(i => `
              <tr>
                <td>${escapeHtml(i.brand)} ${escapeHtml(i.name)}</td>
                <td>${i.quantity}x</td>
                <td style="text-align: right;">${formatPrice(i.unit_price * i.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="text-align: right; font-weight: bold; margin-top: 10px;">Total: ${formatPrice(order.total)}</div>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display:block; margin-bottom: 5px;">Cambiar Estado</label>
        <select id="new-status" style="width: 100%; padding: 10px; margin-bottom: 10px;">
          <option value="pedido" ${order.status === 'pedido' ? 'selected' : ''}>Pedido</option>
          <option value="comprado" ${order.status === 'comprado' ? 'selected' : ''}>Comprado (Pago confirmado)</option>
          <option value="enviando" ${order.status === 'enviando' ? 'selected' : ''}>Enviando</option>
          <option value="entregado" ${order.status === 'entregado' ? 'selected' : ''}>Entregado</option>
          <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
        </select>
        <input type="text" id="status-note" placeholder="Nota opcional (ej. Guía de envío)" style="width: 100%; padding: 10px;">
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button class="button outline small" id="btn-copy-link">Copiar enlace de seguimiento</button>
        <button class="button outline small" id="btn-wa-client">Enviar por WhatsApp</button>
      </div>

      <div class="dialog-actions">
        <button class="button outline" onclick="this.closest('dialog').close()">Cerrar</button>
        <button class="button gold" id="btn-save-status">Guardar Cambios</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  dialog.showModal();

  // Eventos
  dialog.querySelector('#btn-copy-link').addEventListener('click', () => {
    const url = `${window.location.origin}/pedido.html?t=${order.public_token}`;
    navigator.clipboard.writeText(url);
    alert('Enlace copiado al portapapeles');
  });

  dialog.querySelector('#btn-wa-client').addEventListener('click', () => {
    const url = `${window.location.origin}/pedido.html?t=${order.public_token}`;
    const text = `Hola ${order.customer_name}, tu pedido ${order.number} en Imperium está en estado: *${order.status}*. Puedes ver el detalle aquí: ${url}`;
    window.open(`https://wa.me/${order.customer_phone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`, '_blank');
  });

  dialog.querySelector('#btn-save-status').addEventListener('click', async () => {
    const newStatus = dialog.querySelector('#new-status').value;
    const note = dialog.querySelector('#status-note').value;
    
    if (newStatus === order.status && !note) {
      dialog.close();
      return;
    }

    const btn = dialog.querySelector('#btn-save-status');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      // Actualizar order
      await supabase.schema('imperium').from('orders').update({ status: newStatus }).eq('id', id);
      // Insertar evento
      await supabase.schema('imperium').from('order_events').insert([{
        order_id: id,
        status: newStatus,
        note: note || `Estado cambiado a ${newStatus}`
      }]);
      
      dialog.close();
      loadOrders();
    } catch (err) {
      alert('Error al guardar estado.');
    }
  });
}

export function initPedidos() {
  loadOrders();
}