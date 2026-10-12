'use strict';
(() => {
  const sb = window.sb;
  if (!sb) return;

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  sb.from('app_flags').select('locked,mensaje').eq('id', 1).single()
    .then(({ data, error }) => {
      if (error || !data || !data.locked) return;
      const msg = (data.mensaje || '').trim() || 'Sitio en mantenimiento. Volvemos pronto.';
      const o = document.createElement('div');
      o.id = 'mt-cover';
      o.setAttribute('role', 'alert');
      o.innerHTML = '<div class="mt-box"><div class="mt-logo">ESENCIAL TECH</div>' +
        '<p class="mt-msg">' + esc(msg) + '</p></div>';
      (document.body || document.documentElement).appendChild(o);
      document.documentElement.style.overflow = 'hidden';
      if (document.body) document.body.style.overflow = 'hidden';
    })
    .catch(() => {});
})();
