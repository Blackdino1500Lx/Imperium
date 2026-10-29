// Gestión de los ajustes del sitio
import { supabase } from './auth.js';

export async function initAjustes() {
  const form = document.getElementById('settings-form');

  // Cargar ajustes
  const { data, error } = await supabase.schema('imperium').from('site_settings').select('*');
  if (!error && data) {
    data.forEach(item => {
      const input = form.elements[item.key];
      if (input) input.value = item.value;
    });
  }

  // Guardar ajustes
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-settings');
    btn.disabled = true; btn.textContent = 'Guardando...';

    const formData = new FormData(form);
    const updates = [];

    for (let [key, value] of formData.entries()) {
      updates.push({ key, value: String(value).trim() });
    }

    // Upsert a la base de datos
    const { error: upsertError } = await supabase.schema('imperium').from('site_settings').upsert(updates, { onConflict: 'key' });

    btn.disabled = false; btn.textContent = 'Guardar Ajustes';

    if (upsertError) {
      alert('Error al guardar ajustes.');
    } else {
      alert('Ajustes guardados correctamente.');
    }
  });
}