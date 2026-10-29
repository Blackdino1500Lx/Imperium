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

// Obtiene los productos activos y sus colecciones.
export async function getProducts() {
  const { data, error } = await supabase.schema('imperium').from('products').select('*, product_collections(collection_id)').eq('active', true);
  if (error) {
    console.error('Error getProducts:', error);
    throw new Error('No se pudo cargar el catálogo. Intenta de nuevo.');
  }
  return data.map(mapProduct);
}

// Obtiene los ajustes del sitio en formato de objeto clave-valor.
export async function getSettings() {
  const { data, error } = await supabase.schema('imperium').from('site_settings').select('*');
  if (error) {
    console.error('Error getSettings:', error);
    throw new Error('No se pudo cargar la configuración.');
  }
  return data.reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {});
}

// Obtiene las colecciones activas.
export async function getCollections() {
  const { data, error } = await supabase.schema('imperium').from('collections').select('*').eq('active', true).order('name');
  if (error) throw new Error('No se pudieron cargar las colecciones.');
  return data;
}

// Obtiene los banners activos ordenados.
export async function getBanners() {
  const { data, error } = await supabase.schema('imperium').from('banners').select('*').eq('active', true).order('sort_order', { ascending: true });
  if (error) throw new Error('No se pudieron cargar los banners.');
  return data;
}

// Crea un pedido usando una función RPC segura (precios calculados en el servidor).
export async function createOrder(items, cliente) {
  const { data, error } = await supabase.rpc('create_order', { items, cliente });
  if (error) throw new Error('No se pudo crear el pedido.');
  return data;
}

// Obtiene un pedido público usando su token seguro.
export async function getOrderByToken(token) {
  const { data, error } = await supabase.rpc('get_order_by_token', { token });
  if (error) throw new Error('Token inválido o pedido no encontrado.');
  return data;
}