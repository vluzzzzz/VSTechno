// _supabase — acceso a la base desde las funciones del servidor.
// Usa fetch contra la API REST en vez de @supabase/supabase-js para no sumar
// una dependencia que alargue el arranque en frío de cada función.
const SB_URL = () => String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sbConfigurado() {
  return !!(SB_URL() && SB_KEY());
}

async function sbRest(tabla, { method = 'POST', query = '', body, prefer } = {}) {
  if (!sbConfigurado()) throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY sin configurar');
  const r = await fetch(`${SB_URL()}/rest/v1/${tabla}${query}`, {
    method,
    headers: {
      apikey: SB_KEY(),
      Authorization: `Bearer ${SB_KEY()}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`supabase ${r.status}: ${txt}`);
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return null; }
}

// Guarda el pedido antes de mandar al cliente a Mercado Pago. Queda en
// 'iniciado': no se ve en el panel hasta que el pago se confirma.
async function crearPedidoIniciado({ customer, items, total }) {
  const fila = {
    status: 'iniciado',
    cliente_nombre:    String(customer?.name    || '').slice(0, 200),
    cliente_email:     String(customer?.email   || '').slice(0, 200),
    cliente_telefono:  String(customer?.phone   || '').slice(0, 50),
    cliente_rut:       String(customer?.rut     || '').slice(0, 50),
    cliente_ciudad:    String(customer?.city    || '').slice(0, 120),
    cliente_direccion: String(customer?.address || '').slice(0, 300),
    items: (items || []).map(i => ({
      name: String(i.name || '').slice(0, 200),
      qty: Number(i.qty) || 0,
      price: Number(i.price) || 0,
      img: String(i.img || '').slice(0, 300),
    })),
    total: Number(total) || 0,
  };
  const out = await sbRest('orders', { body: fila, prefer: 'return=representation' });
  return Array.isArray(out) && out[0] ? out[0].id : null;
}

// Pasa el pedido de 'iniciado' a 'nuevo'. El filtro status=eq.iniciado hace
// que los reintentos de Mercado Pago no pisen un pedido ya despachado.
//   → 'marcado'  : recién ahora quedó como pagado
//   → 'repetido' : ya estaba, es un reintento
async function marcarPagado(id, { paymentId, mpStatus }) {
  const q = `?id=eq.${encodeURIComponent(id)}&status=eq.iniciado`;
  const out = await sbRest('orders', {
    method: 'PATCH',
    query: q,
    body: {
      status: 'nuevo',
      payment_id: String(paymentId),
      mp_status: String(mpStatus || ''),
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    prefer: 'return=representation',
  });
  return Array.isArray(out) && out.length ? 'marcado' : 'repetido';
}

// Camino de respaldo: pagos que venían con el formato viejo (el pedido entero
// dentro de external_reference) y todavía no tienen fila en la tabla.
async function guardarPedidoPagado({ customer, items, total, paymentId, mpStatus }) {
  const fila = {
    status: 'nuevo',
    payment_id: String(paymentId),
    mp_status: String(mpStatus || ''),
    cliente_nombre:    String(customer?.name    || ''),
    cliente_email:     String(customer?.email   || ''),
    cliente_telefono:  String(customer?.phone   || ''),
    cliente_rut:       String(customer?.rut     || ''),
    cliente_ciudad:    String(customer?.city    || ''),
    cliente_direccion: String(customer?.address || ''),
    items: (items || []).map(i => ({ name: String(i.name || ''), qty: Number(i.qty) || 0, price: Number(i.price) || 0, img: String(i.img || '') })),
    total: Number(total) || 0,
    paid_at: new Date().toISOString(),
  };
  const out = await sbRest('orders', {
    body: fila,
    prefer: 'return=representation,resolution=ignore-duplicates',
  });
  return Array.isArray(out) && out.length ? 'marcado' : 'repetido';
}

async function leerPedido(id) {
  const out = await sbRest('orders', { method: 'GET', query: `?id=eq.${encodeURIComponent(id)}&select=*` });
  return Array.isArray(out) && out[0] ? out[0] : null;
}

async function sbUpload(path, buffer, contentType) {
  const r = await fetch(`${SB_URL()}/storage/v1/object/site-images/${path}`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY(),
      Authorization: `Bearer ${SB_KEY()}`,
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: buffer,
  });
  if (!r.ok) throw new Error(`storage ${r.status}: ${await r.text()}`);
  return `${SB_URL()}/storage/v1/object/public/site-images/${path}`;
}

module.exports = {
  UUID_RE, sbConfigurado, sbRest, sbUpload, SB_URL,
  crearPedidoIniciado, marcarPagado, guardarPedidoPagado, leerPedido,
};
