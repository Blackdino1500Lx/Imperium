// Utilidades compartidas: normalización, escape, precios, marca e imágenes.

// Etiquetas legibles de las disponibilidades del producto.
export const AVAILABILITY = { disponible: 'Disponible', pocas: 'Pocas unidades', agotado: 'Agotado', confirmar: 'Por confirmar' };

// Quita tildes y mayúsculas para comparar búsquedas.
export function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Escapa caracteres peligrosos antes de usar innerHTML.
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Formatea un precio en colones; avisa si falta confirmarlo.
export function formatPrice(price) {
  return Number(price) > 0 ? '₡' + Number(price).toLocaleString('de-DE', { maximumFractionDigits: 0 }) : 'Precio por confirmar';
}

// Redondea hacia arriba al siguiente múltiplo de 500 (para el panel admin).
export function roundPrice(price) {
  return Number(price) > 0 ? Math.ceil(Number(price) / 500) * 500 : 0;
}

// Nombre completo visible del producto.
export function fullName(p) {
  return p.brand + ' ' + p.name;
}

// Enlace de WhatsApp, opcionalmente con el mensaje de un producto.
export function whatsappUrl(phone, product) {
  const digits = String(phone).replace(/\D/g, '');
  let message = 'Hola, Imperium. Quisiera información sobre sus perfumes.';
  if (product) {
    message = 'Hola, Imperium. ' + (product.availability === 'agotado' ? 'Quisiera consultar si volverá a estar disponible ' : 'Quisiera pedir ') + fullName(product) + '. Precio: ' + formatPrice(product.price) + '.' + (product.size ? ' Presentación: ' + product.size + ' ml.' : '') + ' ¿Me pueden confirmar disponibilidad y entrega?';
  }
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(message);
}

// Ilustración de respaldo: tres frascos dibujados según el id.
export function bottleSvg(product, large = false) {
  const shape = [...product.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3;
  const drawings = [
    '<path d="M64 26h52v30H64zM58 56h64v11H58zM46 68h88c9 0 15 7 15 16v133c0 10-6 17-15 17H46c-9 0-15-7-15-17V84c0-9 6-16 15-16Z"/><path d="M41 88h98v126H41zM62 125h56v52H62zM71 191h38M72 36h36"/>',
    '<path d="M66 25h48v35H66zM61 60h58v12H61zM45 78h90l15 32v111c0 9-6 15-15 15H45c-9 0-15-6-15-15V110Z"/><path d="M42 110h96v104H42zM62 135h56v43H62zM72 193h36M76 35h28"/>',
    '<path d="M69 24h42v35H69zM64 59h52v13H64zM54 77h72c18 0 32 17 32 37v91c0 19-14 32-32 32H54c-18 0-32-13-32-32v-91c0-20 14-37 32-37Z"/><path d="M35 114c0-14 10-25 23-25h64c13 0 23 11 23 25v88c0 13-10 23-23 23H58c-13 0-23-10-23-23ZM62 134h56v46H62zM74 198h32M78 35h24"/>'
  ];
  return '<svg class="bottle-art" viewBox="0 0 180 260" fill="none" stroke="currentColor" stroke-width="' + (large ? '1.1' : '1.3') + '" role="img" aria-label="Ilustración de un frasco de perfume">' + drawings[shape] + '</svg><span class="placeholder-brand" aria-hidden="true">' + escapeHtml(product.brand) + '</span>';
}

// Badge de disponibilidad visible en la tarjeta.
export function badgeHtml(p) {
  return p.availability === 'pocas' ? '<span class="availability-badge">Pocas unidades</span>' : p.availability === 'agotado' ? '<span class="availability-badge sold-out">Agotado</span>' : '';
}

// Imagen o ilustración de respaldo para tarjeta y ficha.
export function visualHtml(p, large = false) {
  return (p.photo
    ? '<img class="product-image" data-product-image="' + p.id + '" src="' + escapeHtml(p.photo) + '" alt="' + escapeHtml(fullName(p)) + '" loading="' + (large ? 'eager' : 'lazy') + '" decoding="async" width="700" height="805">'
    : bottleSvg(p, large)) + badgeHtml(p);
}

// Opciones de un <select> a partir de pares [valor, etiqueta].
export function optionsHtml(values, selected) {
  return values.map(([value, label]) => '<option value="' + escapeHtml(value) + '"' + (value === selected ? ' selected' : '') + '>' + escapeHtml(label) + '</option>').join('');
}