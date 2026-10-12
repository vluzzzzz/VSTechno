/* ============================================================================
 *  Configuración de Supabase (cliente público)
 *  ----------------------------------------------------------------------------
 *  Estas dos claves son PÚBLICAS y seguras de exponer en el front: la seguridad
 *  real la da Row Level Security (lectura pública, escritura solo logueado).
 *
 *  Pegá acá los valores de tu proyecto:
 *    Supabase Dashboard → Settings → API
 *      - Project URL      →  SUPABASE_URL
 *      - anon public key   →  SUPABASE_ANON_KEY
 *
 *  Si quedan vacíos o con los placeholders, la web sigue funcionando con su
 *  contenido hardcodeado (fallback) y el panel /admin avisa que falta config.
 * ========================================================================== */
window.SUPABASE_URL = 'https://kfwsupwldzrubbmjkfhk.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_kwidISirrustY3gnZc4Dvg__lZg4jg8';

// ¿Está configurado de verdad (no son los placeholders)?
window.SB_CONFIGURED = (function () {
  var u = window.SUPABASE_URL, k = window.SUPABASE_ANON_KEY;
  return /^https?:\/\//.test(u) && u.indexOf('TU-PROYECTO') === -1 &&
         typeof k === 'string' && k.length > 20 && k.indexOf('TU_ANON') === -1;
})();

// Crea el cliente global `sb` solo si está configurado; si no, queda null.
window.sb = (window.SB_CONFIGURED && window.supabase)
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;
