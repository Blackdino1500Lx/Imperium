import { supabase } from './auth.js';
import { escapeHtml } from '../../js/utils.js';

let allCollections = [];
let allProducts = [];

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
  if (allProducts.length === 0) {
    const { data } = await supabase.schema('imperium').from('products').select('id, brand, name').eq('active', true).order('brand');
    allProducts = data || [];
  }

  // 2. Crear el Dialog dinámicamente
  const dialog = document.createElement('dialog');
  dialog.className = 'admin-dialog';
  dialog.style.maxWidth = '800px';
  
  let currentProducts = [];
  
  if (id) {
    const { data: rels } = await supabase.schema('imperium').from('product_collections').select('product_id').eq('collection_id', id);
    if (rels) currentProducts = rels.map(r => r.product_id);
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

      <div style="margin-bottom: 15px;">
        <label style="display:block; margin-bottom:5px;">Buscar Producto</label>
        <input type="text" id="col-prod-search" placeholder="Filtrar por marca o nombre...">
      </div>

      <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--line); padding: 10px; margin-bottom: 20px;">
        <div id="col-prod-list" style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Productos inyectados por JS -->
        </div>
      </div>

      <div class="dialog-actions">
        <button type="button" class="button outline" onclick="this.closest('dialog').close()">Cancelar</button>
        <button type="submit" class="button gold">Guardar Grupo</button>
      </div>
    </form>
  `;
  
  document.body.appendChild(dialog);

  // Variables locales para el form
  const form = dialog.querySelector('#form-collection');
  const listContainer = dialog.querySelector('#col-prod-list');
  const searchInput = dialog.querySelector('#col-prod-search');

  // Renderizar productos con checkboxes
  const renderProductList = (filter = '') => {
    const term = filter.toLowerCase();
    const filtered = allProducts.filter(p => 
      p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term)
    );

    listContainer.innerHTML = filtered.map(p => `
      <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 5px; border-bottom: 1px solid #eee;">
        <input type="checkbox" name="products" value="${p.id}" ${currentProducts.includes(p.id) ? 'checked' : ''} style="width: 18px; height: 18px;">
        <span>${escapeHtml(p.brand)} - ${escapeHtml(p.name)}</span>
      </label>
    `).join('');
  };

  searchInput.addEventListener('input', (e) => renderProductList(e.target.value));
  renderProductList();

  // Cargar datos si es edición
  if (id) {
    const col = allCollections.find(c => c.id === id);
    if (col) {
      form.elements.name.value = col.name;
      form.elements.active.checked = col.active;
    }
  }

  dialog.showModal();

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
        await supabase.schema('imperium').from('collections').update({ name: colName, active: colActive }).eq('id', id);
      } else {
        const { data, error } = await supabase.schema('imperium').from('collections').insert([{ name: colName, slug, active: colActive }]).select().single();
        if (error) throw error;
        colId = data.id;
      }

      // 2. Actualizar los productos (Borrar los anteriores y guardar los nuevos)
      await supabase.schema('imperium').from('product_collections').delete().eq('collection_id', colId);
      
      const checkedBoxes = [...form.querySelectorAll('input[name="products"]:checked')];
      if (checkedBoxes.length > 0) {
        const inserts = checkedBoxes.map(cb => ({ collection_id: colId, product_id: cb.value }));
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