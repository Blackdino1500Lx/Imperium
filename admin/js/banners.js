// Gestión de banners
import { supabase } from './auth.js';
import { compressImage } from './productos.js';

// Sube la imagen comprimida
async function uploadImage(base64Str, fileName) {
  const res = await fetch(base64Str);
  const blob = await res.blob();
  const { data, error } = await supabase.storage.from('banners').upload(`${fileName}.webp`, blob, { contentType: 'image/webp', upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('banners').getPublicUrl(`${fileName}.webp`);
  return urlData.publicUrl;
}

async function loadBanners() {
  const tbody = document.querySelector('#banner-table tbody');
  tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  const { data, error } = await supabase.schema('imperium').from('banners').select('*').order('sort_order', { ascending: true });
  
  if (error) { tbody.innerHTML = '<tr><td colspan="5">Error al cargar.</td></tr>'; return; }
  
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="5">No hay banners.</td></tr>'; return; }

  tbody.innerHTML = data.map(b => `
    <tr>
      <td><div style="width:80px;height:40px;background:url('${b.image_url}') center/cover"></div></td>
      <td>${b.title || '-'}</td>
      <td><span class="status-badge ${b.active ? 'active' : 'inactive'}">${b.active ? 'Activo' : 'Inactivo'}</span></td>
      <td>
        <button class="button outline small" data-up="${b.id}" ${b.sort_order === 0 ? 'disabled' : ''}>↑</button>
        <button class="button outline small" data-down="${b.id}">↓</button>
      </td>
      <td class="actions-cell">
        <button class="button outline small" data-edit="${b.id}">Editar</button>
        <button class="button danger small" data-toggle="${b.id}" data-active="${b.active}">${b.active ? 'Desactivar' : 'Activar'}</button>
      </td>
    </tr>
  `).join('');
}

async function setupDialog(id = null) {
  const dialog = document.getElementById('dialog-banner');
  const form = document.getElementById('form-banner');
  form.reset();
  form.elements.id.value = '';
  document.getElementById('banner-image-preview').style.backgroundImage = 'none';
  document.getElementById('banner-image-preview').textContent = 'Sin imagen';
  document.getElementById('banner-mobile-preview').style.backgroundImage = 'none';
  document.getElementById('banner-mobile-preview').textContent = 'Sin imagen';

  if (id) {
    const { data } = await supabase.schema('imperium').from('banners').select('*').eq('id', id).single();
    if (data) {
      form.elements.id.value = data.id;
      form.elements.title.value = data.title || '';
      form.elements.subtitle.value = data.subtitle || '';
      form.elements.cta_text.value = data.cta_text || '';
      form.elements.cta_link.value = data.cta_link || '';
      form.elements.active.checked = data.active;
      if (data.image_url) {
        const prev = document.getElementById('banner-image-preview');
        prev.style.backgroundImage = `url('${data.image_url}')`; prev.textContent = '';
      }
      if (data.image_mobile_url) {
        const prev = document.getElementById('banner-mobile-preview');
        prev.style.backgroundImage = `url('${data.image_mobile_url}')`; prev.textContent = '';
      }
    }
  }
  dialog.showModal();
}

export function initBanners() {
  loadBanners();

  document.getElementById('btn-new-banner').addEventListener('click', () => setupDialog());

  document.querySelector('#banner-table tbody').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const toggleBtn = e.target.closest('[data-toggle]');
    const upBtn = e.target.closest('[data-up]');
    const downBtn = e.target.closest('[data-down]');

    if (editBtn) setupDialog(editBtn.dataset.edit);

    if (toggleBtn) {
      const id = toggleBtn.dataset.toggle;
      const state = toggleBtn.dataset.active === 'true';
      await supabase.schema('imperium').from('banners').update({ active: !state }).eq('id', id);
      loadBanners();
    }

    if (upBtn || downBtn) {
      const btn = upBtn || downBtn;
      const id = btn.dataset.up || btn.dataset.down;
      const direction = upBtn ? -1 : 1;
      
      const { data } = await supabase.schema('imperium').from('banners').select('id, sort_order').order('sort_order', { ascending: true });
      const index = data.findIndex(b => b.id === id);
      if (index + direction < 0 || index + direction >= data.length) return;

      const current = data[index];
      const swap = data[index + direction];

      await supabase.schema('imperium').from('banners').update({ sort_order: swap.sort_order }).eq('id', current.id);
      await supabase.schema('imperium').from('banners').update({ sort_order: current.sort_order }).eq('id', swap.id);
      loadBanners();
    }
  });

  document.getElementById('form-banner').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Guardando...';

    try {
      const id = form.elements.id.value;
      const fileMain = document.getElementById('banner-image-file').files[0];
      const fileMobile = document.getElementById('banner-mobile-file').files[0];
      
      let imageUrl = null;
      let imageMobileUrl = null;

      if (fileMain) {
        const b64 = await compressImage(fileMain, 1200);
        imageUrl = await uploadImage(b64, `banner-${id || Date.now()}`);
      }
      if (fileMobile) {
        const b64 = await compressImage(fileMobile, 800);
        imageMobileUrl = await uploadImage(b64, `banner-mobile-${id || Date.now()}`);
      }

      const payload = {
        title: form.elements.title.value || '',
        subtitle: form.elements.subtitle.value || '',
        cta_text: form.elements.cta_text.value || '',
        cta_link: form.elements.cta_link.value || '',
        active: form.elements.active.checked,
      };

      if (imageUrl) payload.image_url = imageUrl;
      if (imageMobileUrl) payload.image_mobile_url = imageMobileUrl;

      if (id) {
        // Actualizar existente
        await supabase.schema('imperium').from('banners').update(payload).eq('id', id);
      } else {
        // Crear nuevo
        if (!imageUrl) throw new Error('La imagen principal es obligatoria.');
        payload.image_url = imageUrl;
        
        // Buscar el último orden para ponerlo al final (evita el error 400 de integer)
        const { data: maxData } = await supabase.schema('imperium').from('banners').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const nextOrder = maxData && maxData.length > 0 ? maxData[0].sort_order + 1 : 0;
        
        payload.sort_order = nextOrder;
        await supabase.schema('imperium').from('banners').insert([payload]);
      }

      document.getElementById('dialog-banner').close();
      loadBanners();
    } catch (err) {
      alert(err.message || 'Error al guardar.');
    } finally {
      btn.disabled = false; btn.textContent = 'Guardar';
    }
  });
}