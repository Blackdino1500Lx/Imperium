// Checkout: captura datos, llama a la base de datos y abre WhatsApp.
import { createOrder } from './api.js';
import { whatsappUrl, formatPrice, fullName } from './utils.js';

let config = {};
let currentCart = {};
let allProducts = [];

// Configura el formulario de checkout
export function initCheckout(settings, cartData, updateCartCallback, openCartCallback) {
  config = settings;
  allProducts = cartData; // Guardamos los productos para usarlos al armar el mensaje
  
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

    // Guardamos una copia del carrito y total por si la DB falla, no perder los datos para el mensaje
    const backupCart = { ...currentCart };
    let backupTotal = 0;
    let backupLines = [];

    backupLines = Object.keys(backupCart).map((id, index) => {
      const p = allProducts.find(prod => prod.id === id);
      const q = backupCart[id];
      if (p) {
        backupTotal += (p.price * q);
        return `${index + 1}. ${fullName(p)} ${p.size ? '('+p.size+'ml)' : ''} - Cant: ${q} - Subtotal: ${formatPrice(p.price * q)}`;
      }
      return '';
    }).filter(Boolean);

    let orderNumber = '';
    let orderToken = '';

    try {
      // 1. Crear pedido en Supabase
      const result = await createOrder(items, { name, phone });
      orderNumber = result.number;
      orderToken = result.token;
      
      // Si fue exitoso, vaciamos el carrito real
      updateCartCallback({});
      form.reset();
      
    } catch (error) {
      console.error('Error al crear pedido:', error);
      errorMsg.textContent = 'Aviso: ' + error.message + ' Puedes enviar tu pedido por WhatsApp de todos modos.';
      errorMsg.hidden = false;
      // No retornamos, dejamos que continúe para abrir WhatsApp
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pedir por WhatsApp';
      
      // 2. Generar mensaje de WhatsApp
      let message = 'Hola, Imperium. Quisiera hacer este pedido:\n\n';
      
      if (orderNumber) {
        // Ajusta el dominio si es necesario
        const link = `${window.location.origin}/pedido.html?t=${orderToken}`; 
        message = `Hola, Imperium. Acabo de realizar el pedido *${orderNumber}*.\nPuedes ver el resumen aquí: ${link}\n\n`;
      }

      message += `*Nombre:* ${name}\n*Teléfono:* ${phone}\n\n`;
      
      // Usamos el respaldo por si el carrito se vació exitosamente antes de armar el texto
      if (backupLines.length > 0) {
        message += backupLines.join('\n') + '\n\n';
        message += `*Total:* ${formatPrice(backupTotal)}\n\n`;
      }

      message += '¿Me confirman disponibilidad, entrega y forma de pago?';

      const waUrl = `https://wa.me/${String(config.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      
      // 3. Abrir WhatsApp
      window.open(waUrl, '_blank');
      
      // 4. Cerrar el carrito y avisar
      if (orderNumber) {
        openCartCallback(); 
      }
    }
  });
}