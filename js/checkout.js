// Checkout: captura datos, llama a la base de datos y abre WhatsApp.
import { createOrder } from './api.js';
import { formatPrice, fullName, effectivePrice } from './utils.js';

let config = {};
let currentCart = []; // [{ id, size, quantity }]
let allProducts = [];

export function initCheckout(settings, cartData, updateCartCallback, openCartCallback) {
  config = settings;
  allProducts = cartData;
  
  const form = document.getElementById('checkout-form');
  const errorMsg = document.getElementById('checkout-error');
  const submitBtn = document.getElementById('checkout-submit');

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
    const items = currentCart.map(({ id, size, quantity }) => ({ id, size, quantity }));
    
    // Abrimos la ventana de WhatsApp de inmediato para que el navegador no la bloquee
    const waWindow = window.open('', '_blank');

    // Respaldamos la info para el mensaje (con el precio que paga el cliente: promoción si existe)
    const backupCart = [...currentCart];
    let backupTotal = 0;
    let backupLines = backupCart.map((item, index) => {
      const p = allProducts.find(prod => prod.id === item.id);
      const pres = p && (p.presentations.find(x => x.size === item.size) || p.presentations[0]);
      if (!p || !pres) return '';
      const unit = effectivePrice(pres);
      const promo = pres.sale_price != null ? ' [Promo]' : '';
      backupTotal += unit * item.quantity;
      return `${index + 1}. ${fullName(p)} ${pres.size ? '(' + pres.size + 'ml)' : ''}${promo} - Cant: ${item.quantity} - Subtotal: ${formatPrice(unit * item.quantity)}`;
    }).filter(Boolean);

    let orderNumber = '';
    let orderToken = '';

    try {
      const result = await createOrder(items, { name, phone });
      orderNumber = result.number;
      orderToken = result.token;
      
      updateCartCallback(); // Limpia el carrito SIN recargar
      form.reset();
      
    } catch (error) {
      console.error('Error al crear pedido:', error);
      errorMsg.textContent = 'Aviso: ' + error.message + ' Puedes enviar tu pedido por WhatsApp de todos modos.';
      errorMsg.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pedir por WhatsApp';
      
      let message = 'Hola, Imperium. Quisiera hacer este pedido:\n\n';
      
      if (orderNumber) {
        const link = `${window.location.origin}/pedido.html?t=${orderToken}`; 
        message = `Hola, Imperium. Acabo de realizar el pedido *${orderNumber}*.\nPuedes ver el resumen aquí: ${link}\n\n`;
      }

      message += `*Nombre:* ${name}\n*Teléfono:* ${phone}\n\n`;
      
      if (backupLines.length > 0) {
        message += backupLines.join('\n') + '\n\n';
        message += `*Total:* ${formatPrice(backupTotal)}\n\n`;
      }

      message += '¿Me confirman disponibilidad, entrega y forma de pago?';

      const waUrl = `https://wa.me/${String(config.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      
      // Redirigimos la pestaña en blanco que abrimos al principio
      if (waWindow) {
        waWindow.location.href = waUrl;
      } else {
        // Si el navegador la bloqueó, forzamos la navegación aquí
        window.location.href = waUrl;
      }
      
      if (orderNumber) {
        openCartCallback(); 
      }
    }
  });
}