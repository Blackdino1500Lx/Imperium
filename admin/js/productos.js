// Gestión de productos
import { supabase } from './auth.js';

const PAGE_SIZE = 25;
let currentPage = 0;
let totalProducts = 0;
let searchQuery = '';
let activeFilter = 'true';

// Textos de disponibilidad (coinciden con el select del formulario)
const AVAILABILITY = {
  disponible: 'Disponible',
  pocas: 'Pocas unidades',
  agotado: 'Agotado',
  confirmar: 'Por confirmar',
};
// Productos de la página actual, para abrir el detalle sin otra consulta
const productsById = new Map();

// Evita registrar los listeners más de una vez si initProductos se llama de nuevo
let initialized = false;
// Evita dobles envíos del formulario mientras hay un guardado en curso
let saving = false;

// Comprime la imagen a 700px WebP en base64
export async function compressImage(file, maxSize = 700) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxSize) { height *= maxSize / width; width = maxSize; }
        else if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// Sube el archivo comprimido al bucket productos
async function uploadImage(base64Str, fileName) {
  const res = await fetch(base64Str);
  const blob = await res.blob();
  const { error } = await supabase.storage.from('productos').upload(`${fileName}.webp`, blob, { contentType: 'image/webp', upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('productos').getPublicUrl(`${fileName}.webp`);
  return urlData.publicUrl;
}

// Carga la tabla de productos
async function loadProducts() {
  const tbody = document.querySelector('#prod-table tbody');
  tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';

  let query = supabase.schema('imperium').from('products').select('*', { count: 'exact' });

  if (activeFilter !== 'all') query = query.eq('active', activeFilter === 'true');
  if (searchQuery) query = query.or(`brand.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`);

  const from = currentPage * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await query.range(from, to).order('brand', { ascending: true });

  if (error) { tbody.innerHTML = '<tr><td colspan="7">Error al cargar productos.</td></tr>'; return; }

  totalProducts = count || 0;
  renderTable(data);
  renderPagination();
}

function availabilityBadge(value) {
  const key = AVAILABILITY[value] ? value : 'confirmar';
  return `<span class="status-badge avail-${key}">${AVAILABILITY[key]}</span>`;
}

function renderTable(data) {
  const tbody = document.querySelector('#prod-table tbody');
  productsById.clear();
  data.forEach(p => productsById.set(String(p.id), p));
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="7">No hay productos.</td></tr>'; return; }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td><img src="${p.image_url || '../assets/img/logo.svg'}" alt=""></td>
      <td>${p.brand}</td>
      <td>${p.name}</td>
      <td>₡${Number(p.price).toLocaleString('de-DE')}</td>
      <td>${availabilityBadge(p.availability)}</td>
      <td><span class="status-badge ${p.active ? 'active' : 'inactive'}">${p.active ? 'Activo' : 'Inactivo'}</span></td>
      <td>
        <div class="actions-cell">
          <button class="button outline small" data-details="${p.id}">Detalles</button>
          <button class="button outline small" data-edit="${p.id}">Editar</button>
          <button class="button danger small" data-toggle="${p.id}" data-active="${p.active}">${p.active ? 'Desactivar' : 'Activar'}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderPagination() {
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE);
  const container = document.getElementById('prod-pagination');
  let html = '';
  for (let i = 0; i < totalPages; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i + 1}</button>`;
  }
  container.innerHTML = html;
}

// Carga las marcas en el datalist
async function loadBrands(selectedBrand = '') {
  const { data } = await supabase.schema('imperium').from('products').select('brand');
  const uniqueBrands = [...new Set((data || []).map(p => p.brand))].sort();

  const datalist = document.getElementById('brand-options');
  datalist.innerHTML = uniqueBrands.map(b => `<option value="${b}"></option>`).join('');

  if (selectedBrand) {
    document.getElementById('prod-brand').value = selectedBrand;
  } else {
    document.getElementById('prod-brand').value = '';
  }
}

// Muestra el detalle (solo lectura) de un producto de la tabla
function showDetails(id) {
  const p = productsById.get(String(id));
  if (!p) return;
  const dialog = document.getElementById('dialog-details');
  const set = (field, value) => {
    dialog.querySelector(`[data-field="${field}"]`).textContent = value || '—';
  };

  set('brand', p.brand);
  set('name', p.name);
  set('price', `₡${Number(p.price).toLocaleString('de-DE')}`);
  set('size', p.size);
  set('category', p.category);
  set('availability', AVAILABILITY[p.availability] || AVAILABILITY.confirmar);
  set('status', p.active ? 'Activo' : 'Inactivo');
  set('top', p.top);
  set('heart', p.heart);
  set('base', p.base);
  set('usage', p.usage_override || 'Se calcula automáticamente a partir de las notas');

  document.getElementById('details-image').src = p.image_url || '../assets/img/logo.svg';
  document.getElementById('details-edit').dataset.id = p.id;
  dialog.showModal();
}

// Configura el dialog de creación/edición
async function setupDialog(id = null) {
  const dialog = document.getElementById('dialog-product');
  const form = document.getElementById('form-product');
  form.reset();
  form.elements.id.value = '';
  form.dataset.isNew = 'false';
  document.getElementById('prod-image-preview').style.backgroundImage = 'none';
  document.getElementById('prod-image-preview').textContent = 'Sin imagen';

  if (id) {
    document.getElementById('dlg-prod-title').textContent = 'Editar Producto';
    const { data } = await supabase.schema('imperium').from('products').select('*').eq('id', id).single();
    if (data) {
      await loadBrands(data.brand);

      form.elements.id.value = data.id;
      form.elements.name.value = data.name;
      form.elements.price.value = data.price;
      form.elements.size.value = data.size || '';
      form.elements.category.value = data.category || '';
      form.elements.availability.value = data.availability || 'confirmar';
      form.elements.top.value = data.top || '';
      form.elements.heart.value = data.heart || '';
      form.elements.base.value = data.base || '';
      form.elements.usage_override.value = data.usage_override || '';
      if (data.image_url) {
        const prev = document.getElementById('prod-image-preview');
        prev.style.backgroundImage = `url('${data.image_url}')`;
        prev.textContent = '';
      }
    }
  } else {
    document.getElementById('dlg-prod-title').textContent = 'Nuevo Producto';
    await loadBrands();
    // El id se genera UNA sola vez al abrir el diálogo, así que aunque el
    // guardado se ejecute varias veces, todas usan el mismo id (no duplica)
    form.elements.id.value = `imp-${crypto.randomUUID()}`;
    form.dataset.isNew = 'true';
  }
  dialog.showModal();
}

export function initProductos() {
  // Si ya se inicializó, solo refresca la tabla (no duplica listeners)
  if (initialized) { loadProducts(); return; }
  initialized = true;

  loadProducts();

  // Buscador
  let timer;
  document.getElementById('prod-search').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { searchQuery = e.target.value; currentPage = 0; loadProducts(); }, 300);
  });

  document.getElementById('prod-active-filter').addEventListener('change', (e) => {
    activeFilter = e.target.value; currentPage = 0; loadProducts();
  });

  document.getElementById('prod-pagination').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') { currentPage = Number(e.target.dataset.page); loadProducts(); }
  });

  document.getElementById('btn-new-product').addEventListener('click', () => setupDialog());

  // Delegación en la tabla
  document.querySelector('#prod-table tbody').addEventListener('click', async (e) => {
    const detailsBtn = e.target.closest('[data-details]');
    const editBtn = e.target.closest('[data-edit]');
    const toggleBtn = e.target.closest('[data-toggle]');

    if (detailsBtn) showDetails(detailsBtn.dataset.details);
    if (editBtn) setupDialog(editBtn.dataset.edit);

    if (toggleBtn) {
      const id = toggleBtn.dataset.toggle;
      const currentState = toggleBtn.dataset.active === 'true';
      const { error } = await supabase.schema('imperium').from('products').update({ active: !currentState }).eq('id', id);
      if (error) { console.error(error); alert('Error al cambiar el estado del producto.'); }
      loadProducts();
    }
  });

  // Botón "Editar" dentro del detalle
  document.getElementById('details-edit').addEventListener('click', (e) => {
    document.getElementById('dialog-details').close();
    setupDialog(e.currentTarget.dataset.id);
  });

  // Guardar producto
  document.getElementById('form-product').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving) return; // ya hay un guardado en curso

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    // La marca se toma directo del input
    const brandValue = form.elements.brand.value.trim();
    if (!brandValue) {
      alert('Por favor, escribe o selecciona una marca.');
      return;
    }

    saving = true;
    btn.disabled = true; btn.textContent = 'Guardando...';

    try {
      const id = form.elements.id.value;
      const isNew = form.dataset.isNew === 'true';
      const fileInput = document.getElementById('prod-image-file');
      let imageUrl = null;

      if (fileInput.files.length > 0) {
        const base64 = await compressImage(fileInput.files[0]);
        imageUrl = await uploadImage(base64, id);
      }

      const payload = {
        brand: brandValue,
        name: form.elements.name.value,
        price: Number(form.elements.price.value),
        size: form.elements.size.value,
        category: form.elements.category.value,
        availability: form.elements.availability.value,
        top: form.elements.top.value,
        heart: form.elements.heart.value,
        base: form.elements.base.value,
        usage_override: form.elements.usage_override.value.trim() || null,
      };
      if (imageUrl) payload.image_url = imageUrl;

      if (isNew) {
        // upsert con id fijo: si la petición se repite, no crea otra fila
        payload.id = id;
        payload.active = true;
        const { error } = await supabase.schema('imperium').from('products')
          .upsert([payload], { onConflict: 'id' });
        if (error) throw error;
      } else {
        const { error } = await supabase.schema('imperium').from('products')
          .update(payload).eq('id', id);
        if (error) throw error;
      }

      document.getElementById('dialog-product').close();
      loadProducts();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el producto.');
    } finally {
      saving = false;
      btn.disabled = false; btn.textContent = 'Guardar';
    }
  });
}