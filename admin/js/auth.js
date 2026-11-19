// Autenticación con Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../js/config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

let isInit = false;
// Id del usuario cuyo panel ya fue inicializado (evita repetir al volver a la pestaña)
let currentUserId = null;

// Verifica si el usuario tiene permisos consultando la tabla admins
async function checkAdminRole(userId) {
  const { data, error } = await supabase.schema('imperium').from('admins').select('user_id').eq('user_id', userId).single();
  if (error || !data) return false;
  return true;
}

// Muestra la pantalla principal
function showAdmin() {
  loginScreen.hidden = true;
  adminScreen.hidden = false;
}

// Muestra el login
function showLogin() {
  loginScreen.hidden = false;
  adminScreen.hidden = true;
  loginForm.reset();
}

// Inicializa los listeners de autenticación
export function initAuth(onLoginSuccess) {
  if (!isInit) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.hidden = true;
      const btn = document.getElementById('login-btn');
      btn.disabled = true;
      btn.textContent = 'Cargando...';

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        loginError.textContent = 'Credenciales incorrectas.';
        loginError.hidden = false;
      } else {
        const isAdmin = await checkAdminRole(data.user.id);
        if (!isAdmin) {
          await supabase.auth.signOut();
          loginError.textContent = 'No tienes permiso de administrador.';
          loginError.hidden = false;
        }
      }

      btn.disabled = false;
      btn.textContent = 'Ingresar';
    });

    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      currentUserId = null;
      showLogin();
    });

    isInit = true;
  }

  // Escuchar estado de sesión
  // Nota: supabase-js dispara este callback al cargar (INITIAL_SESSION / SIGNED_IN),
  // al refrescar el token y cada vez que se vuelve a la pestaña del navegador.
  // Por eso solo se actúa cuando cambia el usuario, no en cada evento.
  supabase.auth.onAuthStateChange((event, session) => {
    // setTimeout evita llamar a supabase con await dentro del callback (puede bloquear)
    setTimeout(async () => {
      if (!session) {
        currentUserId = null;
        showLogin();
        return;
      }

      // Mismo usuario ya inicializado (volver a la pestaña, token refrescado): no hacer nada
      if (session.user.id === currentUserId) return;

      // Se marca antes del await para que eventos simultáneos no entren dos veces
      currentUserId = session.user.id;

      const isAdmin = await checkAdminRole(session.user.id);
      if (isAdmin) {
        showAdmin();
        if (onLoginSuccess) onLoginSuccess();
      } else {
        currentUserId = null;
        await supabase.auth.signOut();
        loginError.textContent = 'No tienes permiso de administrador.';
        loginError.hidden = false;
        showLogin();
      }
    }, 0);
  });
}