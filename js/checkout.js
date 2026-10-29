// Checkout: captura datos, llama a la base de datos y abre WhatsApp.
import { createOrder } from './api.js';
import { whatsappUrl, formatPrice, fullName } from './utils.js';

let config = {};
let currentCart = {};

// Configura el formulario de checkout
export function initCheckout(settings, cartData, updateCartCallback, openCartCallback) {
  config = settings;
  
  const form = document.getElementById('checkout-form');
  const errorMsg = document.getElementById('checkout-error');
  const submitBtn = document.getElementById('checkout-submit');

  // Sincronizar el estado del carrito cada vez que se llama
  window.syncCartToCheckout = (newCart) => {
    currentCart = newCart;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Procesando...';

    const name = document.getElementById('checkout-name').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();

    // Preparamos los ítems para la DB
    const items = Object.keys(currentCart).map(id => ({
      id: id,
      quantity: currentCart[id]
    }));

    let orderNumber = '';
    let orderToken = '';

    try {
      // 1. Crear pedido en Supabase
      const result = await createOrder(items, { name, phone });
      orderNumber = result.number;
      orderToken = result.token;
      
      // Limpiamos el carrito si fue exitoso
      updateCartCallback({});
      form.reset();
      
    } catch (error) {
      console.error('Error al crear pedido:', error);
      errorMsg.textContent = error.message || 'Hubo un problema al registrar el pedido, pero puedes enviarlo por WhatsApp.';
      errorMsg.hidden = false;
      // No retornamos, dejamos que continúe para abrir WhatsApp de todos modos
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pedir por WhatsApp';
      
      // 2. Generar mensaje de WhatsApp
      let message = 'Hola, Imperium. Quisiera hacer este pedido:\n\n';
      
      if (orderNumber) {
        const link = `https://imperium.cr/pedido.html?t=${orderToken}`; // Ajustar dominio en producción
        message = `Hola, Imperium. Acabo de realizar el pedido *${orderNumber}*.\nPuedes ver el resumen aquí: ${link}\n\n`;
      }

      message += `*Nombre:* ${name}\n*Teléfono:* ${phone}\n\n`;
      
      let total = 0;
      const lines = [];
      
      // Iteramos sobre el carrito para armar el mensaje visual
      Object.keys(currentCart).forEach((id, index) => {
        const p = cartData.find(prod => prod.id === id); // Necesitamos acceso a los productos
        if(p) {
           const q = currentCart[id];
           total += (p.price * q);
           lines.push(`${index + 1}. ${fullName(p)} ${p.size ? '('+p.size+'ml)' : ''} - Cant: ${q} - Subtotal: ${formatPrice(p.price * q)}`);
        }
      });

      // Si el carrito se vació antes de leerlo (porque la DB fue exitosa), usamos el respaldo
      if (lines.length > 0) {
        message += lines.join('\n') + '\n\n';
        message += `*Total:* ${formatPrice(total)}\n\n`;
      }

      message += '¿Me confirman disponibilidad, entrega y forma de pago?';

      const waUrl = `https://wa.me/${String(config.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      
      // 3. Abrir WhatsApp
      window.open(waUrl, '_blank');
      
      // 4. Cerrar el carrito y avisar
      if (orderNumber) {
        openCartCallback(); // Cierra el panel
      }
    }
  });
}