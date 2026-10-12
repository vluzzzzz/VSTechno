const { MercadoPagoConfig, Preference } = require('mercadopago');
const { crearPedidoIniciado } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, customer } = req.body;

    if (!items?.length) return res.status(400).json({ error: 'Carrito vacío' });
    if (!customer?.name || !customer?.email || !customer?.phone) {
      return res.status(400).json({ error: 'Datos del cliente incompletos' });
    }

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    const client = new MercadoPagoConfig({
      accessToken: (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim(),
      options: { timeout: 10000 },
    });

    const preference = new Preference(client);

    // El pedido se guarda ANTES de ir a Mercado Pago y a MP solo viaja su id.
    // Antes se mandaba el pedido entero dentro de external_reference: pasaba
    // los 400 caracteres y si MP lo recortaba el pedido se perdía entero.
    // Si la base falla no se corta la venta: se sigue sin referencia.
    let orderId = null;
    try {
      orderId = await crearPedidoIniciado({ customer, items, total });
    } catch (e) {
      console.error('create-preference: no se pudo guardar el pedido:', e.message);
    }

    // Origen del sitio: usa FRONTEND_URL si está bien; si no, lo deriva del host
    // del request (así notification_url / back_urls funcionan aunque falte la env).
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const origin = (process.env.FRONTEND_URL && /^https?:\/\//.test(process.env.FRONTEND_URL))
      ? process.env.FRONTEND_URL.replace(/\/$/, '')
      : `${proto}://${req.headers.host}`;

    const body = {
      items: items.map(i => ({
        title: i.name,
        quantity: Number(i.qty),
        unit_price: Number(i.price),
        currency_id: 'CLP',
      })),
      payer: {
        name: customer.name,
        email: customer.email,
        phone: { number: customer.phone },
      },
      back_urls: {
        success: `${origin}/success`,
        failure: `${origin}/cancel`,
        pending: `${origin}/cancel`,
      },
      notification_url: `${origin}/api/webhook`,
      ...(orderId ? { external_reference: orderId } : {}),
      auto_return: 'approved',
      purpose: 'wallet_purchase',
    };

    console.log('create-preference', {
      notification_url: body.notification_url,
      back_success: body.back_urls.success,
      orderId,
      frontendUrlEnv: process.env.FRONTEND_URL || null,
    });

    const result = await preference.create({ body });
    res.json({ init_point: result.init_point, id: result.id, _debug_notification_url: body.notification_url });
  } catch (err) {
    console.error('create-preference error:', err);
    res.status(500).json({ error: 'Error al crear preferencia' });
  }
};
