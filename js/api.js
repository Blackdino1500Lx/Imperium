// Capa de acceso a datos: todas las consultas a Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mapea los campos de la base de datos a los nombres que usa el frontend.
function mapProduct(p) {
  return {
    ...p,
    photo: p.image_url,
    photoSource: p.photo_source,
    notesSummary: p.notes_summary,
    collections: p.product_collections ? p.product_collections.map(c => c.collection_id) : []
  };
}

// Carga inicial: trae solo los datos necesarios para la tarjeta (sin notas olfativas)
export async function getProducts() {
  const { data, error } = await supabase.schema('imperium')
    .from('products')
    .select('id, brand, name, price, size, category, availability, image_url, photo_source, notes_summary, product_collections(collection_id)')
    .eq('active', true);
    
  if (error) {
    console.error('Error getProducts:', error);
    throw new Error('No se pudo cargar el catálogo.');
  }
  return data.map(mapProduct);
}

// Bajo demanda: trae las notas olfativas solo cuando se abre la ficha
export async function getProductDetails(id) {
  const { data, error } = await supabase.schema('imperium')
    .from('products')
    .select('top, heart, base')
    .eq('id', id)
    .single();
    
  if (error) return null;
  return data;
}

export async function getSettings() {
  const { data, error } = await supabase.schema('imperium').from('site_settings').select('*');
  if (error) throw new Error('No se pudo cargar la configuración.');
  return data.reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {});
}

export async function getCollections() {
  const { data, error } = await supabase.schema('imperium').from('collections').select('*').eq('active', true).order('name');
  if (error) throw new Error('No se pudieron cargar las colecciones.');
  return data;
}

export async function getBanners() {
  const { data, error } = await supabase.schema('imperium').from('banners').select('*').eq('active', true).order('sort_order', { ascending: true });
  if (error) throw new Error('No se pudieron cargar los banners.');
  return data;
}

export async function createOrder(items, cliente) {
  const { data, error } = await supabase.schema('imperium').rpc('create_order', { items, cliente });
  if (error) {
    console.error('Error exacto de Supabase:', error);
    throw new Error(error.message || 'No se pudo crear el pedido en la base de datos.');
  }
  return data;
}

export async function getOrderByToken(token) {
  const { data, error } = await supabase.schema('imperium').rpc('get_order_by_token', { token });
  if (error) {
    console.error('Error exacto de Supabase:', error);
    throw new Error('Token inválido o pedido no encontrado.');
  }
  return data;
}