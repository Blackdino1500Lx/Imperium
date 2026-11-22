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

// ---------- Presentaciones y promociones ----------

// ¿Hay una promoción válida? (mayor que 0 y menor que el precio normal)
export function hasSale(price, sale) {
  return Number(sale) > 0 && Number(price) > 0 && Number(sale) < Number(price);
}

export function discountPercent(price, sale) {
  return Math.round((1 - Number(sale) / Number(price)) * 100);
}

// Lista normalizada de presentaciones. Si el producto no tiene, usa sus campos de siempre.
export function normalizePresentations(p) {
  const raw = Array.isArray(p.presentations) && p.presentations.length
    ? p.presentations
    : [{ size: p.size, price: p.price, sale_price: p.sale_price, availability: p.availability }];
  return raw.map(x => ({
    size: x.size == null ? '' : String(x.size).trim(),
    price: Number(x.price) || 0,
    sale_price: hasSale(x.price, x.sale_price) ? Number(x.sale_price) : null,
    availability: AVAILABILITY[x.availability] ? x.availability : 'confirmar'
  }));
}

export function getPresentations(p) {
  return Array.isArray(p.presentations) && p.presentations.length ? p.presentations : normalizePresentations(p);
}

// Precio que paga el cliente: la promoción si existe, si no el precio normal.
export function effectivePrice(pres) {
  return pres.sale_price != null ? pres.sale_price : pres.price;
}

export function findPresentation(p, size) {
  const list = getPresentations(p);
  return list.find(x => x.size === size) || list[0];
}

export function cheapestPresentation(p) {
  const list = getPresentations(p);
  const priced = list.filter(x => effectivePrice(x) > 0);
  return (priced.length ? priced : list).reduce((best, x) => effectivePrice(x) < effectivePrice(best) ? x : best);
}

// Disponibilidad del producto según sus presentaciones: basta con que una se pueda pedir.
export function aggregateAvailability(list) {
  for (const state of ['disponible', 'pocas', 'confirmar']) {
    if (list.some(x => x.availability === state)) return state;
  }
  return 'agotado';
}

export function presentationLabel(pres) {
  return pres.size ? pres.size + ' ml' : 'Única';
}

// Precio de una presentación: normal, o precio anterior tachado + promoción.
export function priceHtml(pres) {
  return hasSale(pres.price, pres.sale_price)
    ? '<s class="price-old">' + formatPrice(pres.price) + '</s> <span class="price-now">' + formatPrice(pres.sale_price) + '</span>'
    : formatPrice(pres.price);
}

export function discountBadgeHtml(pres) {
  return hasSale(pres.price, pres.sale_price)
    ? '<span class="discount-badge">-' + discountPercent(pres.price, pres.sale_price) + '%</span>'
    : '';
}

// Mayor descuento entre las presentaciones del producto (0 si no hay promoción).
export function maxDiscount(p) {
  return getPresentations(p).reduce((max, x) => hasSale(x.price, x.sale_price) ? Math.max(max, discountPercent(x.price, x.sale_price)) : max, 0);
}

// Badge de descuento sobre la foto de la tarjeta.
export function promoBadgeHtml(p) {
  const percent = maxDiscount(p);
  return percent > 0 ? '<span class="discount-badge on-picture">-' + percent + '%</span>' : '';
}

// Precio de la tarjeta: con varias presentaciones muestra "Desde" la más barata.
export function cardPriceHtml(p) {
  const prefix = getPresentations(p).length > 1 ? '<span class="price-from">Desde</span> ' : '';
  return prefix + priceHtml(cheapestPresentation(p));
}

// Lo mismo en texto plano (para aria-label).
export function cardPriceText(p) {
  const best = cheapestPresentation(p);
  return (getPresentations(p).length > 1 ? 'desde ' : '') + formatPrice(effectivePrice(best));
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
export function whatsappUrl(phone, product, presentation) {
  const digits = String(phone).replace(/\D/g, '');
  let message = 'Hola, Imperium. Quisiera información sobre sus perfumes.';
  if (product) {
    const pres = presentation || findPresentation(product);
    message = 'Hola, Imperium. ' + (pres.availability === 'agotado' ? 'Quisiera consultar si volverá a estar disponible ' : 'Quisiera pedir ') + fullName(product) + '. Precio: ' + formatPrice(effectivePrice(pres)) + (hasSale(pres.price, pres.sale_price) ? ' (en promoción)' : '') + '.' + (pres.size ? ' Presentación: ' + pres.size + ' ml.' : '') + ' ¿Me pueden confirmar disponibilidad y entrega?';
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
    : bottleSvg(p, large)) + badgeHtml(p) + (large ? '' : promoBadgeHtml(p));
}

// Opciones de un <select> a partir de pares [valor, etiqueta].
export function optionsHtml(values, selected) {
  return values.map(([value, label]) => '<option value="' + escapeHtml(value) + '"' + (value === selected ? ' selected' : '') + '>' + escapeHtml(label) + '</option>').join('');
}