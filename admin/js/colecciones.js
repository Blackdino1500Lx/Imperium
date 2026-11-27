import { supabase } from './auth.js';
import { escapeHtml } from '../../js/utils.js';
import { hasSale, discountPercent, formatCRC } from './productos.js';

let allCollections = [];
let allProducts = [];

// Devuelve el mayor % de descuento del producto (principal o presentaciones)
function productDiscountPercent(p) {
  const percents = [];
  if (hasSale(p.price, p.sale_price)) {
    percents.push(discountPercent(p.price, p.sale_price));
  }
  if (Array.isArray(p.presentations)) {
    for (const x of p.presentations) {
      if (hasSale(x.price, x.sale_price)) {
        percents.push(discountPercent(x.price, x.sale_price));
      }
    }
  }
  return percents.length ? Math.max(...percents) : 0;
}

function productHasDiscount(p) {
  return productDiscountPercent(p) > 0;
}

// Carga las colecciones
async function loadCollections() {
  const tbody = document.querySelector('#collections-table tbody');
  tbody.innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';

  const { data, error } = await supabase.schema('imperium').from('collections').select('*').order('name');
  if (error) { tbody.innerHTML = '<tr><td colspan="3">Error al cargar.</td></tr>'; return; }

  allCollections = data;
  tbody.innerHTML = data.length === 0 ? '<tr><td colspan="3">No hay colecciones.</td></tr>' : data.map(c => `
    <tr>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td><span class="status-badge ${c.active ? 'active' : 'inactive'}">${c.active ? 'Activa' : 'Inactiva'}</span></td>
      <td class="actions-cell">
        <button class="button outline small" data-edit="${c.id}">Editar</button>
        <button class="button danger small" data-toggle="${c.id}" data-active="${c.active}">${c.active ? 'Desactivar' : 'Activar'}</button>
      </td>
    </tr>
  `).join('');
}

// Abre el diálogo para crear/editar
async function openCollectionDialog(id = null) {
  // 1. Cargar todos los productos para la lista de selección
  //    Incluimos price, sale_price y presentations para poder mostrar
  //    los descuentos y filtrar por ellos.
  if (allProducts.length === 0) {
    const { data } = await supabase.schema('imperium').from('products')
      .select('id, brand, name, price, sale_price, presentations')
      .eq('active', true)
      .order('brand');
    allProducts = data || [];
  }

  // 2. Crear el Dialog dinámicamente
  const dialog = document.createElement('dialog');
  dialog.className = 'admin-dialog';
  dialog.style.maxWidth = '800px';

  // Set con los IDs seleccionados (sobrevive a filtros de búsqueda/descuento)
  const selectedIds = new Set();

  if (id) {
    const { data: rels } = await supabase.schema('imperium').from('product_collections')
      .select('product_id').eq('collection_id', id);
    if (rels) rels.forEach(r => selectedIds.add(r.product_id));
  }

  dialog.innerHTML = `
    <form id="form-collection" class="dialog-form">
      <h3>${id ? 'Editar' : 'Nueva'} Colección</h3>
      <input type="hidden" name="id" value="${id || ''}">

      <div class="form-grid" style="grid-template-columns: 1fr;">
        <label>Nombre del Grupo (ej. Día del Padre)
          <input type="text" name="name" required>
        </label>
        <label>Activa
          <input type="checkbox" name="active" checked>
        </label>
      </div>

      <div style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
          <label style="display:block; margin-bottom:5px;">Buscar Producto</label>
          <input type="text" id="col-prod-search" placeholder="Filtrar por marca o nombre..." style="width:100%;">
        </div>
        <div style="min-width: 200px;">
          <label style="display:block; margin-bottom:5px;">Filtrar por descuento</label>
          <select id="col-prod-discount-filter" style="width:100%; padding: 12px; border: 1px solid var(--line); border-radius: 6px;">
            <option value="all">Todos</option>
            <option value="with-discount">Solo con descuento</option>
            <option value="without-discount">Solo sin descuento</option>
          </select>
        </div>
      </div>

      <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--line); padding: 10px; margin-bottom: 20px;">
        <div id="col-prod-list" style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Productos inyectados por JS -->
        </div>
      </div>

      <div class="dialog-actions">
        <button type="button" class="button outline" data-close>Cancelar</button>
        <button type="submit" class="button gold">Guardar Grupo</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);

  // Variables locales para el form
  const form = dialog.querySelector('#form-collection');
  const listContainer = dialog.querySelector('#col-prod-list');
  const searchInput = dialog.querySelector('#col-prod-search');
  const discountSelect = dialog.querySelector('#col-prod-discount-filter');

  // Renderizar productos con checkboxes
  const renderProductList = (filter = '', discountFilter = 'all') => {
    const term = filter.toLowerCase();

    const filtered = allProducts.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (discountFilter === 'with-discount')    return productHasDiscount(p);
      if (discountFilter === 'without-discount') return !productHasDiscount(p);
      return true;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = '<p style="color: var(--muted); font-size: 14px; padding: 10px;">No hay productos que coincidan.</p>';
      return;
    }

    listContainer.innerHTML = filtered.map(p => {
      const pct = productDiscountPercent(p);
      const checked = selectedIds.has(p.id) ? 'checked' : '';

      const priceText = hasSale(p.price, p.sale_price)
        ? `<span class="price-old" style="font-size:12px; color: var(--muted); text-decoration: line-through;">${formatCRC(p.price)}</span>
           <span class="price-now" style="font-size:12px; color: var(--gold-ink); font-weight:600;">${formatCRC(p.sale_price)}</span>`
        : `<span style="font-size:12px; color: var(--muted);">${formatCRC(p.price)}</span>`;

      const badge = pct > 0
        ? `<span class="discount-badge">-${pct}%</span>`
        : '';

      return `
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px 5px; border-bottom: 1px solid #eee;">
          <input type="checkbox" name="products" value="${p.id}" ${checked} style="width: 18px; height: 18px;">
          <span style="flex: 1;">${escapeHtml(p.brand)} - ${escapeHtml(p.name)}</span>
          ${priceText}
          ${badge}
        </label>
      `;
    }).join('');
  };

  // Mantiene sincronizado el Set con los checkboxes visibles
  const syncCheckboxChange = (e) => {
    const cb = e.target.closest('input[name="products"]');
    if (!cb) return;
    if (cb.checked) selectedIds.add(cb.value);
    else selectedIds.delete(cb.value);
  };

  const refreshList = () => renderProductList(searchInput.value, discountSelect.value);

  searchInput.addEventListener('input', refreshList);
  discountSelect.addEventListener('change', refreshList);
  listContainer.addEventListener('change', syncCheckboxChange);

  refreshList();

  // Cargar datos si es edición
  if (id) {
    const col = allCollections.find(c => c.id === id);
    if (col) {
      form.elements.name.value = col.name;
      form.elements.active.checked = col.active;
    }
  }

  dialog.showModal();

  // Cerrar con Cancelar
  dialog.querySelector('[data-close]').addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });

  // Guardar
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Guardando...';

    try {
      const colName = form.elements.name.value.trim();
      const colActive = form.elements.active.checked;
      const slug = colName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      let colId = id;

      // 1. Guardar o actualizar la colección
      if (id) {
        const { error } = await supabase.schema('imperium').from('collections')
          .update({ name: colName, active: colActive }).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.schema('imperium').from('collections')
          .insert([{ name: colName, slug, active: colActive }]).select().single();
        if (error) throw error;
        colId = data.id;
      }

      // 2. Actualizar los productos (borrar anteriores e insertar los del Set)
      await supabase.schema('imperium').from('product_collections')
        .delete().eq('collection_id', colId);

      if (selectedIds.size > 0) {
        const inserts = [...selectedIds].map(pid => ({
          collection_id: colId,
          product_id: pid,
        }));
        const { error: relError } = await supabase.schema('imperium').from('product_collections').insert(inserts);
        if (relError) throw relError;
      }

      dialog.close();
      dialog.remove();
      loadCollections();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la colección.');
    } finally {
      btn.disabled = false; btn.textContent = 'Guardar Grupo';
    }
  });
}

export function initColecciones() {
  loadCollections();

  document.getElementById('btn-new-collection').addEventListener('click', () => openCollectionDialog());

  document.querySelector('#collections-table tbody').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const toggleBtn = e.target.closest('[data-toggle]');

    if (editBtn) openCollectionDialog(editBtn.dataset.edit);

    if (toggleBtn) {
      const id = toggleBtn.dataset.toggle;
      const state = toggleBtn.dataset.active === 'true';
      await supabase.schema('imperium').from('collections').update({ active: !state }).eq('id', id);
      loadCollections();
    }
  });
}