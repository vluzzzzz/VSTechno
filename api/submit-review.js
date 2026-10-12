const crypto = require('crypto');
const { sbRest, sbUpload, sbConfigurado } = require('./_supabase');

const VENTANA_HORAS = 10;
const MAX_PRODUCTOS = 5;
const SALT = () => process.env.REVIEW_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'vstechno';

function ipDe(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket?.remoteAddress || '0.0.0.0';
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip + '|' + SALT()).digest('hex');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  if (!sbConfigurado()) return res.status(500).json({ error: 'Servidor sin configurar' });

  try {
    const b = req.body || {};
    const product = String(b.product || '').trim().slice(0, 80);
    const name = String(b.name || '').trim().slice(0, 80);
    const text = String(b.text || '').trim().slice(0, 600);
    const stars = Math.max(1, Math.min(5, parseInt(b.stars, 10) || 0));
    const imagen = typeof b.image === 'string' ? b.image : '';

    if (!product) return res.status(400).json({ error: 'Falta el producto' });
    if (name.length < 2) return res.status(400).json({ error: 'Poné tu nombre' });
    if (text.length < 3) return res.status(400).json({ error: 'Escribí un comentario' });
    if (!b.stars) return res.status(400).json({ error: 'Elegí una calificación' });

    const ipHash = hashIp(ipDe(req));
    const desde = new Date(Date.now() - VENTANA_HORAS * 3600 * 1000).toISOString();

    const previas = await sbRest('reviews', {
      method: 'GET',
      query: `?ip_hash=eq.${ipHash}&created_at=gt.${encodeURIComponent(desde)}&select=product_slug`,
    }) || [];

    if (previas.some(r => r.product_slug === product)) {
      return res.status(429).json({ error: 'Ya dejaste una reseña de este producto. Gracias.' });
    }
    const distintos = new Set(previas.map(r => r.product_slug));
    if (distintos.size >= MAX_PRODUCTOS) {
      return res.status(429).json({ error: 'Alcanzaste el límite de reseñas por ahora. Probá más tarde.' });
    }

    let images = [];
    if (imagen) {
      const m = imagen.match(/^data:(image\/\w+);base64,(.+)$/);
      if (m) {
        const buf = Buffer.from(m[2], 'base64');
        if (buf.length > 3 * 1024 * 1024) return res.status(400).json({ error: 'La imagen es muy pesada' });
        const ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
        const path = `reviews/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
        const url = await sbUpload(path, buf, m[1]);
        images = [url];
      }
    }

    await sbRest('reviews', {
      prefer: 'return=minimal',
      body: {
        product_slug: product, name, stars, text,
        verified: false, status: 'pendiente', images,
        fecha: new Date().toISOString().slice(0, 10),
        ip_hash: ipHash, position: 0,
      },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit-review error:', err.message);
    return res.status(500).json({ error: 'No se pudo enviar la reseña' });
  }
};
