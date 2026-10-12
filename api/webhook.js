const { MercadoPagoConfig, Payment, MerchantOrder } = require('mercadopago');
const { Resend } = require('resend');
const crypto = require('crypto');
const { UUID_RE, marcarPagado, guardarPedidoPagado, leerPedido } = require('./_supabase');

function formatCLP(n) {
  return '$' + Number(n).toLocaleString('es-AR');
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Valida la firma x-signature de Mercado Pago (protege el webhook de abuso).
//   → true  : firma válida
//   → false : firma inválida
//   → null  : no hay MERCADO_PAGO_WEBHOOK_SECRET configurado (no se valida)
function validSignature(req, dataId) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return null;
  const sigHeader = req.headers['x-signature'] || '';
  const reqId = req.headers['x-request-id'] || '';
  const parts = {};
  sigHeader.split(',').forEach(kv => { const [k, v] = kv.split('='); if (k && v) parts[k.trim()] = v.trim(); });
  if (!parts.ts || !parts.v1) return false;
  const id = String(dataId == null ? '' : dataId).toLowerCase();
  const manifest = `id:${id};request-id:${reqId};ts:${parts.ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(parts.v1)); }
  catch { return false; }
}

function buildEmailHtml({ customer, items, total, paymentId, status }) {
  const itemsRows = items
    .map(i => `<tr><td style="padding:6px 0">${Number(i.qty)}x ${escHtml(i.name)}</td><td style="padding:6px 0;text-align:right">${formatCLP(i.price)}</td><td style="padding:6px 0;text-align:right">${formatCLP(i.price * i.qty)}</td></tr>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f5f5f7">
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <h1 style="font-size:22px;margin:0 0 8px">🛒 Nuevo Pedido</h1>
    <p style="color:#6e6e73;margin:0 0 24px">Pagado vía Mercado Pago ${new Date().toLocaleString('es-AR')}</p>

    <div style="background:#f5f5f7;border-radius:12px;padding:16px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-weight:600">${escHtml(customer.name)}</p>
      <p style="margin:0;color:#6e6e73;font-size:13px">${customer.rut ? 'RUT: ' + escHtml(customer.rut) + '<br>' : ''}Email: ${escHtml(customer.email)}<br>Tel: ${escHtml(customer.phone)}</p>
      ${customer.city ? `<p style="margin:4px 0 0;color:#6e6e73;font-size:13px">${escHtml(customer.city)}${customer.address ? ' - ' + escHtml(customer.address) : ''}</p>` : ''}
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead><tr style="border-bottom:1px solid #e5e5e5;font-size:12px;color:#6e6e73;text-transform:uppercase">
        <th style="text-align:left;padding:6px 0">Producto</th>
        <th style="text-align:right;padding:6px 0">Precio</th>
        <th style="text-align:right;padding:6px 0">Subtotal</th>
      </tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div style="border-top:2px solid #000;padding-top:12px;text-align:right;font-size:18px;font-weight:700">
      Total: ${formatCLP(total)}
    </div>

    <div style="margin-top:24px;padding:12px;background:#e8f5e9;border-radius:8px;font-size:13px">
      <strong>Pago ID:</strong> ${paymentId}<br>
      <strong>Estado:</strong> ${status}
    </div>
  </div>
</body>
</html>`;
}

module.exports = async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};

    // Tipo de notificación + id del recurso. MP los manda en body o en query.
    const type = body.type || query.type || query.topic;
    const dataId = body.data?.id || query['data.id'] || query.id;

    console.log('webhook recibido', {
      type, dataId,
      hasSignature: !!(req.headers && req.headers['x-signature']),
      env: { mp: !!process.env.MERCADO_PAGO_ACCESS_TOKEN, resend: !!process.env.RESEND_API_KEY, to: process.env.NOTIFICATION_EMAIL },
    });

    // id inválido (ej. pruebas con id 0) → ignorar.
    if (!dataId || Number(dataId) <= 0) {
      console.log('webhook: sin id válido — ignorado', { type, dataId });
      return res.status(200).end();
    }

    const isPayment = type === 'payment' || type === undefined;
    const isOrder = type === 'merchant_order';
    if (!isPayment && !isOrder) {
      console.log('webhook: tipo no manejado — ignorado', { type });
      return res.status(200).end();
    }

    // Firma de MP: se registra pero NO bloquea (las IPN no la traen). La
    // seguridad la da consultar el recurso por su id contra MP.
    if (validSignature(req, dataId) === false) {
      console.warn('webhook: firma ausente o no válida (se procesa igual)');
    }

    const client = new MercadoPagoConfig({
      accessToken: (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim(),
      options: { timeout: 8000 },
    });

    let extRef = null;
    let paymentStatus = 'unknown';
    let paymentId = String(dataId);

    if (isOrder) {
      // Checkout Pro suele notificar como merchant_order: trae los pagos + external_reference.
      const mo = await new MerchantOrder(client).get({ merchantOrderId: dataId });
      extRef = mo?.external_reference || null;
      const approved = (mo?.payments || []).find(p => p.status === 'approved');
      paymentStatus = approved ? 'approved' : 'pending';
      if (approved) paymentId = String(approved.id);
      console.log('webhook: merchant_order', dataId, 'pagos', (mo?.payments || []).map(p => p.status), 'extRef?', !!extRef);
    } else {
      const info = await new Payment(client).get({ id: dataId });
      extRef = info?.external_reference || null;
      paymentStatus = info?.status || 'unknown';
      paymentId = String(info?.id || dataId);
      console.log('webhook: pago', paymentId, 'status', paymentStatus, 'extRef?', !!extRef, 'len', (extRef || '').length);
    }

    if (paymentStatus !== 'approved') {
      console.log('webhook:', paymentId, 'no aprobado:', paymentStatus, '— no se envía correo');
      return res.status(200).end();
    }

    // external_reference ahora es el id del pedido que create-preference dejó
    // guardado. El formato viejo (el pedido entero en JSON) se sigue aceptando
    // para no perder los pagos que ya estaban en curso.
    let paymentData = null;
    const esId = !!extRef && UUID_RE.test(String(extRef).trim());

    if (extRef && !esId) {
      try { paymentData = JSON.parse(extRef); }
      catch (e) { console.warn('webhook: external_reference no es JSON válido (¿truncado?):', extRef); paymentData = null; }
    }

    // Primero se guarda, después se avisa. Guardar nunca lanza: si la base
    // falla el correo igual sale, que es el respaldo manual del dueño.
    let guardado = 'sin-datos';
    try {
      if (esId) {
        guardado = await marcarPagado(String(extRef).trim(), { paymentId, mpStatus: paymentStatus });
        if (guardado === 'marcado') {
          const fila = await leerPedido(String(extRef).trim());
          if (fila) paymentData = {
            customer: {
              name: fila.cliente_nombre, email: fila.cliente_email, phone: fila.cliente_telefono,
              rut: fila.cliente_rut, city: fila.cliente_ciudad, address: fila.cliente_direccion,
            },
            items: fila.items || [],
            total: fila.total,
          };
        }
      } else if (paymentData) {
        guardado = await guardarPedidoPagado({ ...paymentData, paymentId, mpStatus: paymentStatus });
      }
    } catch (e) {
      guardado = 'error';
      console.error('webhook: no se pudo guardar el pedido:', e.message);
    }
    console.log('webhook: pedido', paymentId, '→', guardado);

    // Reintento de Mercado Pago sobre un pedido ya registrado: no se repite
    // el correo.
    if (guardado === 'repetido') return res.status(200).end();

    if (!paymentData) {
      console.log('webhook: aprobado sin datos del pedido, no se envía correo', { paymentId });
      return res.status(200).end();
    }

    // Mientras falte la clave de Resend el pedido ya quedó guardado igual. El
    // día que se configure, el correo arranca solo.
    if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_EMAIL) {
      console.log('webhook: sin RESEND_API_KEY / NOTIFICATION_EMAIL — el pedido quedó en la tabla orders');
      return res.status(200).end();
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const sent = await resend.emails.send({
      // NOTA Resend: con onboarding@resend.dev solo se entrega al email dueño
      // de la cuenta Resend. Para enviar a otra casilla, verificar un dominio
      // y cambiar el "from" a uno de ese dominio.
      from: 'Pedidos <onboarding@resend.dev>',
      to: process.env.NOTIFICATION_EMAIL,
      subject: `🛒 Nuevo Pedido - $${Number(paymentData.total).toLocaleString('es-AR')}`,
      html: buildEmailHtml({
        customer: paymentData.customer,
        items: paymentData.items,
        total: paymentData.total,
        paymentId,
        status: paymentStatus,
      }),
    });

    if (sent && sent.error) {
      console.error('webhook: Resend NO envió el correo:', JSON.stringify(sent.error));
    } else {
      console.log('email enviado para pago', paymentId, '— resend id:', sent?.data?.id);
    }
    res.status(200).end();
  } catch (err) {
    // Responder 200 igual para que MP no reintente indefinidamente.
    console.error('webhook error:', err);
    res.status(200).end();
  }
};
