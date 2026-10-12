# Replicar el Admin de Catálogo (Supabase) en otra web

Guía **autocontenida** para clonar el panel de administración del **catálogo** en
cualquier sitio estático (HTML + JS) deployado en Vercel. Permite:

- Login (Supabase Auth) en un `/admin` aparte.
- **Agregar / editar / eliminar productos**.
- Editar **nombre, precio, descripción, categoría, imagen principal, características, galería de imágenes** y **stock**.
- Cambios **en vivo** en la web pública (sin re-deploy).
- **Sin variantes de color** (esta versión no las incluye).

> Principio clave: si Supabase no está configurado o falla, la web usa tu contenido
> hardcodeado como **fallback** y no se rompe.

La `anon key` es **pública** y segura de exponer en el navegador: la escritura está
protegida por Row Level Security (solo usuarios logueados pueden modificar).

---

## Paso 1 — Crear el proyecto Supabase
1. https://supabase.com → **New project** (plan free).
2. Esperá ~2 min a que cree.

## Paso 2 — Esquema (SQL)
Supabase → **SQL Editor → New query** → pegá y **Run**:

```sql
-- Catálogo de productos
create table if not exists catalog_products (
  id          uuid primary key default gen_random_uuid(),
  feature_key text unique not null,   -- identificador único (slug), ej: 'airpods-pro-2'
  tag         text,                   -- etiqueta opcional ("Audio", "Nuevo", ...)
  name        text not null,
  price       text not null,          -- precio mostrado, ej: "$26.000"
  raw_price   int  not null default 0,-- precio numérico (para carrito/checkout), ej: 26000
  descr       text,
  image_url   text,                   -- imagen principal
  img_scale   numeric default 0.85,   -- escala visual de la imagen en la card (opcional)
  category    text,                   -- ej: 'audio' | 'watch' | 'accesorios'
  sort_order  int default 0,
  is_visible  boolean default true,   -- true = con stock; false = "SIN STOCK" (se muestra en gris)
  updated_at  timestamptz not null default now()
);

-- Características (bullets) de cada producto
create table if not exists catalog_features (
  id          uuid primary key default gen_random_uuid(),
  feature_key text not null references catalog_products(feature_key) on delete cascade,
  text        text not null,
  sort_order  int default 0
);

-- Galería de imágenes de cada producto
create table if not exists catalog_images (
  id          uuid primary key default gen_random_uuid(),
  feature_key text not null references catalog_products(feature_key) on delete cascade,
  image_url   text not null,
  sort_order  int default 0
);

-- Índices únicos → evitan duplicados (re-correr seguro)
create unique index if not exists uq_features on catalog_features (feature_key, text);
create unique index if not exists uq_images   on catalog_images   (feature_key, image_url);

-- ── Row Level Security: lectura pública, escritura solo logueado ──
alter table catalog_products enable row level security;
alter table catalog_features enable row level security;
alter table catalog_images   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['catalog_products','catalog_features','catalog_images'] loop
    execute format('drop policy if exists "public_read" on %I;', t);
    execute format('drop policy if exists "auth_write" on %I;', t);
    execute format('create policy "public_read" on %I for select using (true);', t);
    execute format('create policy "auth_write" on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ── Storage: bucket público para imágenes que sube el cliente ──
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

do $$
begin
  execute 'drop policy if exists "site_images_read" on storage.objects';
  execute 'drop policy if exists "site_images_write" on storage.objects';
  execute $p$create policy "site_images_read" on storage.objects
            for select using (bucket_id = 'site-images')$p$;
  execute $p$create policy "site_images_write" on storage.objects
            for all to authenticated
            using (bucket_id = 'site-images') with check (bucket_id = 'site-images')$p$;
end $$;
```

## Paso 3 — Crear el usuario del cliente
1. **Authentication → Users → Add user** → email + contraseña (se la das al cliente).
2. **Authentication → Providers → Email** → desactivá *"Allow new users to sign up"*
   (solo entran los usuarios que vos creás).

## Paso 4 — Credenciales
**Settings → API** → copiá **Project URL** y **anon public key**.

---

## Paso 5 — `js/supabase-config.js`
Creá este archivo y pegá tus credenciales:

```js
// La anon key es PÚBLICA y segura (RLS protege la escritura).
// Con esto vacío, la web pública sigue usando el contenido hardcodeado (fallback).
export const SUPABASE_URL = '';        // ej: 'https://xxxx.supabase.co'
export const SUPABASE_ANON_KEY = '';   // ej: 'eyJhbGciOi...' o 'sb_publishable_...'

export function isConfigured() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.indexOf('http') === 0);
}

let _client = null;
export async function getClient() {
  if (!isConfigured()) return null;
  if (_client) return _client;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  return _client;
}
```

## Paso 6 — `js/catalog-data.js` (lectura pública)
Devuelve el catálogo en un shape simple, con dedupe defensivo. Devuelve `null` ante
cualquier problema (para caer al fallback).

```js
import { getClient } from './supabase-config.js';

// { products:[...], features:{feature_key:[...]}, images:{feature_key:[...]} } | null
export async function loadCatalog() {
  try {
    const sb = await getClient();
    if (!sb) return null;

    const [prodRes, featRes, imgRes] = await Promise.all([
      sb.from('catalog_products').select('*').order('sort_order', { ascending: true }),
      sb.from('catalog_features').select('*').order('sort_order', { ascending: true }),
      sb.from('catalog_images').select('*').order('sort_order', { ascending: true })
    ]);
    if (!prodRes.data || !prodRes.data.length) return null;

    const products = prodRes.data.map(function (p) {
      return {
        tag: p.tag, name: p.name, price: p.price, rawPrice: p.raw_price,
        desc: p.descr, image: p.image_url, featureKey: p.feature_key,
        imgScale: Number(p.img_scale) || 0.85, category: p.category,
        inStock: p.is_visible !== false
      };
    });

    const features = {}, _fs = {};
    (featRes.data || []).forEach(function (f) {
      var k = f.feature_key + '|' + f.text; if (_fs[k]) return; _fs[k] = 1;
      (features[f.feature_key] = features[f.feature_key] || []).push(f.text);
    });
    const images = {}, _is = {};
    (imgRes.data || []).forEach(function (im) {
      var k = im.feature_key + '|' + im.image_url; if (_is[k]) return; _is[k] = 1;
      (images[im.feature_key] = images[im.feature_key] || []).push(im.image_url);
    });

    return { products: products, features: features, images: images };
  } catch (e) { return null; }
}
```

## Paso 7 — Conectar la web pública (con fallback)
Adaptá esto a la estructura de TU sitio. La idea: tené tu render hardcodeado como
fallback, y si Supabase responde, reemplazás los datos y re-renderizás.

```js
import { isConfigured } from './supabase-config.js';
import { loadCatalog } from './catalog-data.js';

// 1) Tus datos hardcodeados de siempre (fallback):
let PRODUCTS = [ /* { name, price, rawPrice, desc, image, featureKey, imgScale, category, inStock } */ ];
let FEATURES = { /* feature_key: [textos] */ };
let IMAGES   = { /* feature_key: [urls] */ };

function renderCatalog() {
  const grid = document.getElementById('miGridDeProductos');
  if (!grid) return;
  grid.innerHTML = '';
  PRODUCTS.forEach(function (p) {
    const oos = p.inStock === false;
    const card = document.createElement('div');
    card.className = 'product-card' + (oos ? ' out-of-stock' : '');
    card.innerHTML =
      '<div class="card-img-wrap"><img src="' + (p.image || '') + '" alt="">' +
      (oos ? '<div class="oos-tag">SIN STOCK</div>' : '') + '</div>' +
      '<div class="card-info"><p class="card-name">' + p.name + '</p>' +
      '<p class="card-price">' + p.price + '</p>' +
      (oos ? '<button disabled>Sin stock</button>' : '<button>Ver más</button>') + '</div>';
    if (!oos) card.addEventListener('click', function () { /* abrir tu modal con p / FEATURES[p.featureKey] / IMAGES[p.featureKey] */ });
    grid.appendChild(card);
  });
}

renderCatalog();  // pinta el fallback al instante

// 2) Hidratar desde Supabase (si está configurado). No bloquea el arranque.
if (isConfigured()) {
  loadCatalog().then(function (cat) {
    if (!cat || !cat.products.length) return;
    PRODUCTS = cat.products; FEATURES = cat.features; IMAGES = cat.images;
    renderCatalog();
  }).catch(function () {});
}
```

CSS sugerido para el estado "sin stock" (opcional):

```css
.product-card.out-of-stock { cursor: default; }
.product-card.out-of-stock .card-img-wrap { filter: grayscale(1); position: relative; }
.product-card .oos-tag {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(-18deg);
  background: rgba(20,20,22,.84); color: #fff; font-weight: 800; letter-spacing: .14em;
  font-size: 17px; text-transform: uppercase; padding: 8px 26px; border-radius: 7px;
  border: 2px solid rgba(255,255,255,.9); white-space: nowrap; pointer-events: none;
}
```

---

## Paso 8 — `admin.html`
Página standalone (no carga el JS de la web). Pegala en la raíz del proyecto.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Admin · Catálogo</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --bg:#f5f5f7; --card:#fff; --line:rgba(0,0,0,.09); --line2:#c7c7cc; --txt:#1d1d1f; --mut:#6e6e73; --ink:#111; --ok:#1da34f; --danger:#d70015; --shadow:0 4px 20px rgba(0,0,0,.06); }
    * { box-sizing:border-box; }
    body { margin:0; font-family:'DM Sans',system-ui,sans-serif; background:var(--bg); color:var(--txt); font-size:14px; -webkit-font-smoothing:antialiased; }
    .hidden { display:none !important; }
    .mut { color:var(--mut); }
    button { font-family:inherit; cursor:pointer; border:none; border-radius:980px; padding:10px 18px; font-size:13px; font-weight:600; transition:all .18s ease; }
    .btn { background:var(--ink); color:#fff; } .btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(0,0,0,.18); }
    .btn-ghost { background:#fff; color:var(--txt); border:1.5px solid var(--line2); } .btn-ghost:hover { border-color:var(--ink); }
    .btn-danger { background:#fff; color:var(--danger); border:1.5px solid rgba(215,0,21,.35); } .btn-danger:hover { background:var(--danger); color:#fff; }
    .btn-sm { padding:7px 13px; font-size:12px; }
    input, select, textarea { width:100%; background:#fff; color:var(--txt); border:1.5px solid var(--line2); border-radius:12px; padding:11px 13px; font-size:14px; font-family:inherit; }
    input:focus, select:focus, textarea:focus { outline:none; border-color:var(--ink); box-shadow:0 0 0 3px rgba(0,0,0,.06); }
    input[type=file] { border:1.5px dashed var(--line2); background:#fafafa; cursor:pointer; padding:7px; font-size:12px; color:var(--mut); }
    input[type=file]::file-selector-button, input[type=file]::-webkit-file-upload-button { background:var(--ink); color:#fff; border:none; border-radius:980px; padding:8px 15px; margin-right:11px; font-weight:600; font-size:12px; cursor:pointer; font-family:inherit; }
    label { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--mut); margin:0 0 6px; font-weight:700; }
    .field { margin-bottom:14px; } .row { display:flex; gap:12px; flex-wrap:wrap; } .row > * { flex:1; min-width:0; }
    #login { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
    #login .card { background:var(--card); border-radius:24px; padding:38px 34px; width:100%; max-width:380px; box-shadow:0 12px 40px rgba(0,0,0,.1); }
    #login .brand { font-family:'Bebas Neue',sans-serif; font-size:34px; }
    .topbar { position:sticky; top:0; z-index:20; display:flex; align-items:center; justify-content:space-between; padding:16px 24px; background:rgba(245,245,247,.82); backdrop-filter:blur(14px); border-bottom:1px solid var(--line); }
    .topbar .brand { font-family:'Bebas Neue',sans-serif; font-size:24px; }
    .wrap { max-width:1000px; margin:0 auto; padding:18px 20px 90px; }
    .head { text-align:center; margin:22px 0 8px; }
    .head .title { font-family:'Bebas Neue',sans-serif; font-size:52px; line-height:.95; color:var(--ink); }
    .panel { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:20px; margin-bottom:16px; box-shadow:var(--shadow); }
    .card-item { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:20px; margin-bottom:16px; box-shadow:var(--shadow); }
    .card-item.flash { animation:flash 1.4s ease; } @keyframes flash { 0% { box-shadow:0 0 0 3px rgba(29,163,79,.5); } 100% { box-shadow:var(--shadow); } }
    .card-item .panel { background:#f4f4f6; border-color:#e2e2e6; box-shadow:none; }
    .item-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
    .item-title { font-size:17px; font-weight:700; }
    .pill-mut { font-size:11px; color:var(--mut); background:var(--bg); border:1px solid var(--line); padding:3px 9px; border-radius:980px; }
    .thumb { width:60px; height:60px; border-radius:12px; object-fit:contain; background:var(--bg); border:1px solid var(--line); flex:0 0 auto; }
    .upload-row { display:flex; align-items:center; gap:10px; } .upload-row input[type=text] { flex:1; }
    .collapse-h { cursor:pointer; user-select:none; color:var(--ink); font-size:13px; font-weight:700; padding:10px 0 2px; }
    .sublist-row { display:flex; gap:8px; align-items:center; margin-bottom:9px; } .sublist-row > input { flex:1; }
    .actions-row { display:flex; gap:10px; flex-wrap:wrap; margin-top:16px; align-items:center; }
    .new-form { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-top:12px; } .new-form .field { margin:0; flex:1; min-width:200px; }
    .seg { display:inline-flex; width:100%; background:#ececee; border:1.5px solid #d2d2d7; border-radius:13px; padding:3px; gap:3px; }
    .seg-btn { flex:1; background:transparent; color:#555; border:none; border-radius:10px; padding:10px 8px; font-weight:600; font-size:13px; }
    .seg-btn.active { background:var(--ink); color:#fff; box-shadow:0 1px 5px rgba(0,0,0,.22); }
    .switch { position:relative; display:inline-block; width:52px; height:30px; }
    .switch input { opacity:0; width:0; height:0; }
    .switch-track { position:absolute; inset:0; background:#c7c7cc; border-radius:980px; cursor:pointer; transition:.2s; }
    .switch-track::before { content:''; position:absolute; height:24px; width:24px; left:3px; top:3px; background:#fff; border-radius:50%; transition:.2s; box-shadow:0 1px 3px rgba(0,0,0,.3); }
    .switch input:checked + .switch-track { background:var(--ok); }
    .switch input:checked + .switch-track::before { transform:translateX(22px); }
    .spinner { color:var(--mut); padding:28px; text-align:center; }
    .toast { position:fixed; bottom:26px; left:50%; transform:translateX(-50%) translateY(8px); display:flex; align-items:center; gap:9px; background:var(--ok); color:#fff; font-weight:700; padding:13px 22px 13px 16px; border-radius:980px; z-index:200; box-shadow:0 12px 36px rgba(29,163,79,.4); opacity:0; transition:opacity .25s, transform .25s; }
    .toast.show { opacity:1; transform:translateX(-50%) translateY(0); } .toast.err { background:var(--danger); }
    .toast .check { width:24px; height:24px; border-radius:50%; background:rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
    .toast .check svg { width:15px; height:15px; }
  </style>
</head>
<body>
  <div id="notConfigured" class="hidden" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:30px;text-align:center">
    <div style="max-width:520px"><h1 style="font-family:'Bebas Neue',sans-serif;font-size:40px">Falta configurar Supabase</h1>
    <p class="mut">Pegá SUPABASE_URL y SUPABASE_ANON_KEY en <code>js/supabase-config.js</code> y recargá.</p></div>
  </div>

  <div id="login" class="hidden">
    <form class="card" id="loginForm">
      <div class="brand">Admin</div>
      <p class="mut" style="margin:6px 0 22px">Panel de catálogo</p>
      <div class="field"><label>Email</label><input type="email" id="email" autocomplete="username" required></div>
      <div class="field"><label>Contraseña</label><input type="password" id="password" autocomplete="current-password" required></div>
      <button class="btn" type="submit" style="width:100%;border-radius:14px" id="loginBtn">Entrar</button>
      <p id="loginErr" style="color:var(--danger);margin:12px 0 0;font-size:13px"></p>
    </form>
  </div>

  <div id="app" class="hidden">
    <div class="topbar"><span class="brand">Admin · Catálogo</span><button class="btn-ghost btn-sm" id="logoutBtn">Cerrar sesión</button></div>
    <div class="wrap"><div id="view-catalog"></div></div>
  </div>

  <script type="module" src="./js/admin.js"></script>
</body>
</html>
```

## Paso 9 — `js/admin.js` (catálogo, sin colores)

```js
import { getClient, isConfigured } from './supabase-config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const show = s => $(s).classList.remove('hidden');
const hide = s => $(s).classList.add('hidden');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const priceToNum = s => parseInt(String(s || '').replace(/\D/g, ''), 10) || 0;

let sb = null;

// ── EDITÁ estas categorías según tu tienda ──
const CATS = [{ v: 'audio', l: 'Audífonos' }, { v: 'watch', l: 'Relojes' }, { v: 'accesorios', l: 'Accesorios' }];

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
function toast(msg, err) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : '');
  t.innerHTML = '<span class="check">' + (err ? '!' : CHECK) + '</span><span>' + esc(msg) + '</span>';
  document.body.appendChild(t); requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 280); }, 2300);
}
const ok = m => toast(m || 'Guardado', false);
const fail = m => toast(m || 'Error al guardar', true);
const uniqueBy = (a, f) => { const s = new Set(), o = []; a.forEach(x => { const k = f(x); if (!s.has(k)) { s.add(k); o.push(x); } }); return o; };

function segHtml(cls, opts, cur) { return '<div class="seg ' + cls + '">' + opts.map(o => '<button type="button" class="seg-btn' + (o.v === cur ? ' active' : '') + '" data-v="' + o.v + '">' + o.l + '</button>').join('') + '</div>'; }
function wireSeg(seg) { $$('.seg-btn', seg).forEach(b => b.onclick = () => { $$('.seg-btn', seg).forEach(x => x.classList.remove('active')); b.classList.add('active'); }); }
const segVal = seg => { const a = $('.seg-btn.active', seg); return a ? a.dataset.v : ''; };
const segSet = (seg, v) => $$('.seg-btn', seg).forEach(b => b.classList.toggle('active', b.dataset.v === v));

async function uploadImage(file, folder) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = folder + '/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
  const { error } = await sb.storage.from('site-images').upload(path, file, { upsert: true, cacheControl: '3600' });
  if (error) throw error;
  return sb.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}
function wireUpload(fileInput, urlInput, preview, folder) {
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0]; if (!f) return; fileInput.disabled = true;
    try { const url = await uploadImage(f, folder); urlInput.value = url; if (preview) preview.src = url; ok('Imagen subida'); }
    catch (e) { fail('Error subiendo imagen'); } fileInput.disabled = false;
  });
}

// ── Auth ──
init();
async function init() {
  if (!isConfigured()) { show('#notConfigured'); return; }
  sb = await getClient();
  const { data: { session } } = await sb.auth.getSession();
  session ? showApp() : showLogin();
  sb.auth.onAuthStateChange((_e, s) => { s ? showApp() : showLogin(); });
}
function showLogin() {
  hide('#app'); show('#login');
  $('#loginForm').onsubmit = async e => {
    e.preventDefault(); $('#loginErr').textContent = ''; $('#loginBtn').disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value });
    $('#loginBtn').disabled = false;
    if (error) $('#loginErr').textContent = 'No se pudo entrar: ' + error.message;
  };
}
let _started = false;
async function showApp() {
  hide('#login'); show('#app');
  $('#logoutBtn').onclick = () => sb.auth.signOut();
  if (_started) return; _started = true;
  renderCatalog();
}

// ── Catálogo ──
async function renderCatalog() {
  const view = $('#view-catalog');
  view.innerHTML = '<div class="spinner">Cargando…</div>';
  const { data } = await sb.from('catalog_products').select('*').order('sort_order');
  const prods = data || [];
  view.innerHTML = '<div class="head"><h2 class="title">Catálogo</h2></div>';
  const top = document.createElement('div'); top.className = 'panel';
  top.innerHTML = '<div class="item-title" style="margin-bottom:4px">Nuevo producto</div><p class="mut" style="margin:0">Se agrega al final, y arriba acá para editarlo enseguida.</p>'
    + '<div class="new-form"><div class="field"><label>Nombre</label><input id="np-name" placeholder="Ej: Producto X"></div><button class="btn" id="np-btn">Crear producto</button></div>';
  view.appendChild(top);
  const list = document.createElement('div'); list.id = 'catList'; view.appendChild(list);
  prods.forEach(p => list.appendChild(productCard(p)));
  $('#np-btn', view).onclick = () => createProduct(prods.length, list, $('#np-name', view));
}

async function createProduct(order, listEl, nameInput) {
  const name = (nameInput.value || '').trim(); if (!name) { nameInput.focus(); return; }
  const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fk = base + '-' + Math.random().toString(36).slice(2, 5);
  const { data, error } = await sb.from('catalog_products').insert({ feature_key: fk, name, price: '$0', raw_price: 0, category: CATS[0].v, tag: CATS[0].l, sort_order: order }).select().single();
  if (error) { fail('Error al crear'); return; }
  nameInput.value = '';
  const card = productCard(data);
  listEl.insertBefore(card, listEl.firstChild);
  card.classList.add('flash'); card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  ok('Producto creado');
}

function productCard(p) {
  const box = document.createElement('div'); box.className = 'card-item';
  box.innerHTML =
    '<div class="item-head"><span class="item-title c-title">' + esc(p.name) + '</span><span class="pill-mut">' + esc(p.feature_key) + '</span></div>'
    + '<div class="field"><label>Nombre</label><input class="c-name" value="' + esc(p.name) + '"></div>'
    + '<div class="row"><div class="field"><label>Precio</label><input class="c-price" value="' + esc(p.price) + '" placeholder="$26.000"></div>'
    + '<div class="field"><label>Categoría</label>' + segHtml('c-cat', CATS, p.category) + '</div></div>'
    + '<div class="field"><label>Descripción</label><textarea class="c-desc" rows="2">' + esc(p.descr || '') + '</textarea></div>'
    + '<div class="field"><label>Imagen principal</label><div class="upload-row"><img class="thumb c-prev" src="' + esc(p.image_url || '') + '"><input type="text" class="c-img" value="' + esc(p.image_url || '') + '" placeholder="URL"><input type="file" accept="image/*" class="c-file" style="max-width:150px"></div></div>'
    + '<div class="row"><div class="field"><label>Escala imagen</label><input type="number" step="0.05" class="c-scale" value="' + (p.img_scale || 0.85) + '"></div>'
    + '<div class="field"><label>Stock disponible</label><label class="switch"><input type="checkbox" class="c-vis"' + (p.is_visible !== false ? ' checked' : '') + '><span class="switch-track"></span></label><div class="mut" style="font-size:11px;margin-top:5px">Si lo apagás, se muestra en gris con "SIN STOCK".</div></div></div>'
    + '<div class="collapse-h c-more">▸ Características e imágenes</div><div class="c-sub hidden"></div>'
    + '<div class="actions-row"><button class="btn c-save">Guardar producto</button><button class="btn-ghost btn-sm c-undo">Deshacer cambios</button><button class="btn-danger btn-sm c-del" style="margin-left:auto">Eliminar</button></div>';

  let snap = { name: p.name, price: p.price, descr: p.descr || '', image_url: p.image_url || '', img_scale: p.img_scale || 0.85, category: p.category, is_visible: p.is_visible };
  const fill = v => {
    $('.c-name', box).value = v.name; $('.c-price', box).value = v.price; $('.c-desc', box).value = v.descr;
    $('.c-img', box).value = v.image_url; $('.c-prev', box).src = v.image_url; $('.c-scale', box).value = v.img_scale;
    segSet($('.c-cat', box), v.category); $('.c-vis', box).checked = !!v.is_visible;
  };
  wireUpload($('.c-file', box), $('.c-img', box), $('.c-prev', box), 'catalog');
  wireSeg($('.c-cat', box));
  $('.c-more', box).onclick = () => {
    const sub = $('.c-sub', box);
    if (!sub.classList.contains('hidden')) { sub.classList.add('hidden'); return; }
    sub.classList.remove('hidden');
    if (!sub.dataset.loaded) { loadSubEditors(sub, p.feature_key); sub.dataset.loaded = '1'; }
  };
  $('.c-undo', box).onclick = () => { fill(snap); ok('Cambios deshechos'); };
  $('.c-save', box).onclick = async () => {
    const price = $('.c-price', box).value; const category = segVal($('.c-cat', box));
    const upd = { feature_key: p.feature_key, name: $('.c-name', box).value, price, raw_price: priceToNum(price),
      category, tag: (CATS.find(c => c.v === category) || {}).l || '', descr: $('.c-desc', box).value,
      image_url: $('.c-img', box).value, img_scale: parseFloat($('.c-scale', box).value) || 0.85, is_visible: $('.c-vis', box).checked };
    const { error } = await sb.from('catalog_products').upsert(upd, { onConflict: 'feature_key' });
    if (error) { fail(); return; }
    snap = { name: upd.name, price: upd.price, descr: upd.descr, image_url: upd.image_url, img_scale: upd.img_scale, category: upd.category, is_visible: upd.is_visible };
    $('.c-title', box).textContent = upd.name; ok('Producto guardado');
  };
  $('.c-del', box).onclick = async () => {
    if (!confirm('¿Eliminar "' + p.name + '"?')) return;
    const { error } = await sb.from('catalog_products').delete().eq('feature_key', p.feature_key);
    if (error) { fail('Error al eliminar'); return; } box.remove(); ok('Producto eliminado');
  };
  return box;
}

async function loadSubEditors(sub, fk) {
  sub.innerHTML = '<div class="spinner">Cargando…</div>';
  const [feat, imgs] = await Promise.all([
    sb.from('catalog_features').select('*').eq('feature_key', fk).order('sort_order'),
    sb.from('catalog_images').select('*').eq('feature_key', fk).order('sort_order')
  ]);
  const featData = uniqueBy(feat.data || [], r => r.text);
  const imgData = uniqueBy(imgs.data || [], r => r.image_url);
  sub.innerHTML = '';

  const fp = document.createElement('div'); fp.className = 'panel';
  fp.innerHTML = '<label>Características</label><div class="feat-list"></div><button class="btn-ghost btn-sm feat-add">+ Agregar característica</button>';
  const addFeat = v => { const r = document.createElement('div'); r.className = 'sublist-row'; r.innerHTML = '<input class="feat-v" value="' + esc(v || '') + '"><button class="btn-danger btn-sm">✕</button>'; r.querySelector('button').onclick = () => r.remove(); $('.feat-list', fp).appendChild(r); };
  featData.forEach(f => addFeat(f.text)); $('.feat-add', fp).onclick = () => addFeat(''); sub.appendChild(fp);

  const ip = document.createElement('div'); ip.className = 'panel';
  ip.innerHTML = '<label>Galería de imágenes</label><div class="img-list"></div><div class="upload-row" style="margin-top:8px"><input type="file" accept="image/*" class="img-file" style="max-width:180px"><span class="mut" style="font-size:12px">subir y agregar</span></div>';
  const addImg = url => { const r = document.createElement('div'); r.className = 'sublist-row'; r.innerHTML = '<img class="thumb" src="' + esc(url || '') + '"><input class="img-v" value="' + esc(url || '') + '"><button class="btn-danger btn-sm">✕</button>'; r.querySelector('button').onclick = () => r.remove(); $('.img-list', ip).appendChild(r); };
  imgData.forEach(i => addImg(i.image_url));
  $('.img-file', ip).addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; e.target.disabled = true; try { addImg(await uploadImage(f, 'catalog')); ok('Imagen agregada'); } catch (_) { fail('Error'); } e.target.disabled = false; e.target.value = ''; });
  sub.appendChild(ip);

  const save = document.createElement('button'); save.className = 'btn'; save.textContent = 'Guardar características e imágenes';
  save.onclick = async () => {
    save.disabled = true;
    const featRows = uniqueBy($$('.feat-v', fp).map(i => i.value).filter(v => v.trim()), v => v).map((text, i) => ({ feature_key: fk, text, sort_order: i }));
    const imgRows = uniqueBy($$('.img-v', ip).map(i => i.value).filter(v => v.trim()), v => v).map((image_url, i) => ({ feature_key: fk, image_url, sort_order: i }));
    await sb.from('catalog_features').delete().eq('feature_key', fk);
    await sb.from('catalog_images').delete().eq('feature_key', fk);
    const e1 = featRows.length ? (await sb.from('catalog_features').insert(featRows)).error : null;
    const e2 = imgRows.length ? (await sb.from('catalog_images').insert(imgRows)).error : null;
    save.disabled = false; (e1 || e2) ? fail() : ok('Guardado');
  };
  sub.appendChild(save);
}
```

## Paso 10 — Vercel
En `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/admin", "destination": "/admin.html" }
  ],
  "headers": [
    { "source": "/(.*)\\.js", "headers": [{ "key": "Cache-Control", "value": "no-cache, must-revalidate" }] },
    { "source": "/admin.html", "headers": [{ "key": "Cache-Control", "value": "no-cache, must-revalidate" }] }
  ]
}
```

Después **Redeploy**. El cliente entra a `tudominio.com/admin`, se loguea y edita.

---

## Estructura de archivos a crear
```
/admin.html
/js/supabase-config.js
/js/catalog-data.js
/js/admin.js
/vercel.json   (agregar el rewrite + headers)
```

## Checklist de prueba
1. `/admin` sin login → solo se ve el formulario (RLS bloquea escritura sin sesión).
2. Login con el usuario creado → aparece el catálogo.
3. "Crear producto" → aparece arriba con flash; editás nombre/precio/categoría/imagen → Guardar → toast verde.
4. Recargás la web pública → el producto aparece (sin re-deploy).
5. Apagás "Stock disponible" → en la web sale en gris con "SIN STOCK".

## Notas
- **Imágenes:** se suben al bucket `site-images` (público). El botón "Seleccionar archivo" sube y completa la URL solo.
- **Precio:** escribís el texto (ej. `$26.000`); el número (`raw_price`) se calcula solo para el carrito.
- **Sin colores:** esta versión no incluye variantes de color (a diferencia del proyecto original).
- **Seguridad:** la `anon key` es pública; la escritura está protegida por RLS + login. No expongas la `service_role`.
