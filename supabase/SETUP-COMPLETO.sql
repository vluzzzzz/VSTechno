-- ============================================================================
--  SETUP COMPLETO · VS Techno — pegar TODO en Supabase -> SQL Editor -> Run
--  Orden: funcion admin -> base -> modulos -> catalogo -> reviews -> politicas admin
--  Admin habilitado: adpp23777@gmail.com
-- ============================================================================

-- ###########################################################################
-- ##  BOOTSTRAP: funcion es_admin() (debe existir ANTES de las politicas que
-- ##  la usan en orders/reviews). Se vuelve a declarar al final en acceso-admin.
-- ###########################################################################

create or replace function public.es_admin()
returns boolean language sql stable as $$
  select lower(auth.jwt() ->> 'email') in (
    'adpp23777@gmail.com'
  );
$$;


-- ###########################################################################
-- ##  schema.sql
-- ###########################################################################

-- ============================================================================
--  Tienda — Esquema Supabase (Catálogo)
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
--  Reemplaza la config por Excel (Google Sheet CSV) por una base en Supabase.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  category      text not null default 'audifonos'
                  check (category in ('audifonos','relojes','accesorios')),
  description   text default '',
  image         text default '',
  image_scale   numeric default 0.85,
  in_stock      boolean default true,
  features      text[] default '{}',
  gallery       text[] default '{}',
  colors        jsonb  default '[]'::jsonb,
  position      int    default 0,
  -- presentación en el HERO (carrusel principal). Si is_hero = false se ignora.
  is_hero       boolean default false,
  hero_name     text,
  hero_bg_label text,
  hero_image    text,
  hero_scale    numeric,
  hero_offset_x int,
  hero_offset_y int,
  hero_order    int,
  -- presentación en el carrusel DESTACADOS. Si is_featured = false se ignora.
  is_featured   boolean default false,
  featured_tag  text,
  featured_name text,
  featured_image text,
  featured_order int,
  created_at    timestamptz default now()
);

create table if not exists public.price_tiers (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  qty         int  not null,            -- cantidad (1..10) — precio al por mayor
  price       int  not null,
  active      boolean not null default true,  -- si el tramo está habilitado
  unique (product_id, qty)
);
-- por si la tabla ya existía sin la columna:
alter table public.price_tiers add column if not exists active boolean not null default true;

create index if not exists price_tiers_product_idx on public.price_tiers(product_id);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security
--    Lectura pública (anon) para que el sitio cargue el catálogo.
--    Escritura solo para usuarios autenticados (el panel /admin).
-- ---------------------------------------------------------------------------

alter table public.products    enable row level security;
alter table public.price_tiers enable row level security;

-- products
drop policy if exists "products public read"  on public.products;
create policy "products public read"  on public.products
  for select using (true);

drop policy if exists "products auth write"   on public.products;
create policy "products auth write"   on public.products
  for all to authenticated using (true) with check (true);

-- price_tiers
drop policy if exists "tiers public read"     on public.price_tiers;
create policy "tiers public read"     on public.price_tiers
  for select using (true);

drop policy if exists "tiers auth write"      on public.price_tiers;
create policy "tiers auth write"      on public.price_tiers
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 3. Storage — bucket público para imágenes subidas desde el admin
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

drop policy if exists "site-images public read"  on storage.objects;
create policy "site-images public read"  on storage.objects
  for select using (bucket_id = 'site-images');

drop policy if exists "site-images auth write"   on storage.objects;
create policy "site-images auth write"   on storage.objects
  for insert to authenticated with check (bucket_id = 'site-images');

drop policy if exists "site-images auth update"  on storage.objects;
create policy "site-images auth update"  on storage.objects
  for update to authenticated using (bucket_id = 'site-images');

drop policy if exists "site-images auth delete"  on storage.objects;
create policy "site-images auth delete"  on storage.objects
  for delete to authenticated using (bucket_id = 'site-images');

-- ---------------------------------------------------------------------------
-- 4. Seed — los 11 productos actuales (idempotente)
-- ---------------------------------------------------------------------------

insert into public.products
  (slug, name, category, description, image, image_scale, position,
   features, is_hero, hero_name, hero_bg_label, hero_image, hero_scale,
   hero_offset_x, hero_offset_y, hero_order,
   is_featured, featured_tag, featured_name, featured_image, featured_order)
values
  ('apple-watch-ultra-3','Apple Watch Ultra 3','relojes',
   'El Apple Watch más resistente. Titanio de grado aeroespacial, pantalla Always-On de 49mm y hasta 60 horas de batería.',
   'images/apple-watch-ultra-3.webp',0.75,1,
   array['Caja de titanio aeroespacial','Pantalla Always-On 49mm','Hasta 60 horas de batería','GPS de doble frecuencia'],
   false,null,null,null,null,null,null,null,
   true,'Mejor Calificado','Ultra 3','images/apple-watch-ultra-3.webp',5),

  ('apple-watch-serie-10','Apple Watch Serie 10','relojes',
   'El Apple Watch más delgado hasta la fecha. Pantalla OLED más grande, detección de apnea del sueño y carga rápida.',
   'images/serie-10.webp',0.75,2,
   array['Pantalla OLED más grande','Detección de apnea del sueño','Carga rápida','Diseño más delgado'],
   false,null,null,null,null,null,null,null,
   true,'The new Apple','Series 10','images/serie10desta.webp',4),

  ('apple-watch-black-ultra-2','Apple Watch Black Ultra 2','relojes',
   'Edición Black del Ultra 2. Acabado en negro carbón, titanio negro y cristal de zafiro. Máxima resistencia y estilo.',
   'images/black-ultra-2.webp',0.75,3,
   array['Acabado negro carbón','Titanio negro premium','Cristal de zafiro','Hasta 60 horas de batería'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null),

  ('airpods-4','AirPods 4ta Generación','audifonos',
   'Diseño completamente rediseñado, audio adaptable y cancelación activa de ruido. La mejor experiencia sin cables.',
   'images/airpods-4gen.webp',0.75,4,
   array['Audio adaptativo','Cancelación activa de ruido','Diseño rediseñado','Hasta 30 horas con estuche'],
   true,'AirPods 4','AIRPODS 4','images/airpods4.webp',0.8,0,0,2,
   true,'Mas Rentable','AirPods 4','images/airpods-4ta-generacion-v2.webp',3),

  ('airpods-pro-2','AirPods Pro 2','audifonos',
   'Cancelación activa de ruido de siguiente nivel, audio espacial personalizado y hasta 30 horas de batería con el estuche.',
   'images/airpods-pro-2.webp',0.75,5,
   array['Cancelación activa de ruido','Audio espacial personalizado','Hasta 30 horas de batería','Resistencia al agua IPX4'],
   true,'AirPods Pro 2','AIRPODS PRO 2','images/airpods.webp',1,0,0,1,
   true,'Nuevo','AirPods Pro 2','images/airpods2unidad.webp',2),

  ('airpods-3','AirPods 3ra Generación','audifonos',
   'Audio espacial, audio adaptativo y resistencia al agua IPX4. Diseño rediseñado y cómodo para uso diario.',
   'images/airpods-3gen.webp',0.75,6,
   array['Audio espacial','Resistencia al agua IPX4','Carga MagSafe','Hasta 30 horas con estuche'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null),

  ('bateria-magsafe','Batería MagSafe','accesorios',
   'Batería externa magnética para iPhone. Se adhiere perfectamente y carga de forma inalámbrica sin cables. Compacta y ligera.',
   'images/bateria-magsafe.webp',0.75,7,
   array['Carga magnética MagSafe','Compacta y liviana','Compatible iPhone 12 en adelante','Sin cables'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null),

  ('airpods-max','Max Magnéticos','accesorios',
   'Accesorios magnéticos premium compatibles con MagSafe. Fijación perfecta y carga inalámbrica optimizada.',
   'images/max-negros.webp',0.75,8,
   array['Compatibles con MagSafe','Fijación magnética perfecta','Carga inalámbrica optimizada','Múltiples colores'],
   true,'AirPods Max','AIRPODS MAX','images/airpodsmax.webp',1.4,50,-20,3,
   true,'Más vendido','AirPods Max','images/airpodsmax.webp',1),

  ('cargador-lightning','Cargador Completo Lightning','accesorios',
   'Cargador completo con cable Lightning y adaptador de corriente. Compatible con iPhone, iPad y AirPods.',
   'images/cargador-lightning.webp',0.75,9,
   array['Cable Lightning incluido','Adaptador de corriente','Compatible iPhone/iPad/AirPods','Carga rápida'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null),

  ('cargador-tipo-c','Cargador Completo Tipo C','accesorios',
   'Cargador completo con cable USB-C. Compatible con iPhone 15 en adelante, iPad Pro y MacBook. Carga rápida.',
   'images/cargador-tipo-c.webp',0.75,10,
   array['Cable USB-C incluido','Compatible iPhone 15+','iPad Pro y MacBook','Carga rápida 20W'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null),

  ('cargador-samsung-45w','Cargador Samsung 45W','accesorios',
   'Cargador ultra rápido Samsung 45W. Compatible con toda la línea Galaxy. Carga completa en menos de una hora.',
   'images/cargador-samsung-45w.webp',0.75,11,
   array['Carga ultra rápida 45W','Compatible línea Galaxy','Cable USB-C incluido','Carga completa en ~1 hora'],
   false,null,null,null,null,null,null,null,
   false,null,null,null,null)
on conflict (slug) do nothing;

-- Tramos de precio por cantidad (1 / 3 / 5 / 10 unidades)
insert into public.price_tiers (product_id, qty, price)
select p.id, t.qty, t.price
from public.products p
join (values
  ('apple-watch-ultra-3',1,29990),('apple-watch-ultra-3',3,27990),('apple-watch-ultra-3',5,25990),('apple-watch-ultra-3',10,23990),
  ('apple-watch-serie-10',1,29990),('apple-watch-serie-10',3,27990),('apple-watch-serie-10',5,25990),('apple-watch-serie-10',10,23990),
  ('apple-watch-black-ultra-2',1,29990),('apple-watch-black-ultra-2',3,27990),('apple-watch-black-ultra-2',5,25990),('apple-watch-black-ultra-2',10,23990),
  ('airpods-4',1,15000),('airpods-4',3,13500),('airpods-4',5,12500),('airpods-4',10,11500),
  ('airpods-pro-2',1,14000),('airpods-pro-2',3,12500),('airpods-pro-2',5,11500),('airpods-pro-2',10,10500),
  ('airpods-3',1,14000),('airpods-3',3,12500),('airpods-3',5,11500),('airpods-3',10,10500),
  ('bateria-magsafe',1,13000),('bateria-magsafe',3,11500),('bateria-magsafe',5,10500),('bateria-magsafe',10,9500),
  ('airpods-max',1,26990),('airpods-max',3,24990),('airpods-max',5,22990),('airpods-max',10,20990),
  ('cargador-lightning',1,5000),('cargador-lightning',3,4500),('cargador-lightning',5,4000),('cargador-lightning',10,3500),
  ('cargador-tipo-c',1,5000),('cargador-tipo-c',3,4500),('cargador-tipo-c',5,4000),('cargador-tipo-c',10,3500),
  ('cargador-samsung-45w',1,6000),('cargador-samsung-45w',3,5500),('cargador-samsung-45w',5,5000),('cargador-samsung-45w',10,4500)
) as t(slug, qty, price) on t.slug = p.slug
on conflict (product_id, qty) do nothing;

-- Imágenes secundarias (galería del detalle) — solo si están vacías.
update public.products p set gallery = g.imgs
from (values
  ('apple-watch-ultra-3',       array['images/apple-watch-ultra-3-v2.webp','images/apple-watch-ultra-3-v3.webp']),
  ('apple-watch-serie-10',      array['images/apple-watch-serie-10-v2.webp','images/apple-watch-serie-10-v3.webp']),
  ('apple-watch-black-ultra-2', array['images/apple-watch-black-ultra-2-v2.webp','images/apple-watch-black-ultra-2-v3.webp']),
  ('airpods-4',                 array['images/airpods-4ta-generacion-v2.webp','images/airpods-4ta-generacion-v3.webp']),
  ('airpods-pro-2',             array['images/airpods-pro-2-v2.webp','images/airpods-pro-2-v3.webp']),
  ('airpods-3',                 array['images/airpods-3ra-generacion-v2.webp','images/airpods-3ra-generacion-v3.webp']),
  ('airpods-max',               array['images/max-magneticos-v2.webp','images/max-magneticos-v3.webp']),
  ('bateria-magsafe',           array['images/bateria-magsafe-v2.webp']),
  ('cargador-lightning',        array['images/cargador-lightning-completo-v2.webp']),
  ('cargador-tipo-c',           array['images/cargador-tipo-c-completo-v2.webp']),
  ('cargador-samsung-45w',      array['images/cargador-samsung-45w-v2.webp'])
) as g(slug, imgs)
where p.slug = g.slug and (p.gallery is null or p.gallery = '{}');

-- ============================================================================
--  Después de ejecutar esto:
--   1. Authentication → Users → Add user  (crear el usuario admin email/clave)
--   2. (Opcional) Authentication → Providers → Email: desactivar "Confirm email"
--      para que el usuario admin pueda entrar sin verificar correo.
--   3. Settings → API: copiar Project URL y anon public key a js/supabase-config.js
-- ============================================================================


-- ###########################################################################
-- ##  add-commerce-fields.sql
-- ###########################################################################

-- ============================================================================
--  Campos de venta: precio anterior y stock real
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Es seguro correrlo varias veces.
--
--  compare_at_price : precio ANTES del descuento (en pesos, sin puntos).
--                     El chip "-23%" y el precio tachado SOLO aparecen si este
--                     valor es mayor que el precio actual. Vacío = sin chip.
--
--  stock_qty        : unidades reales disponibles.
--                     El aviso "Quedan N unidades" SOLO aparece si es <= 5.
--                     Vacío = no se muestra nada.
--
--  Los dos quedan vacíos (null) en los productos que ya existen, así que la web
--  se ve igual que hoy hasta que los cargues desde /admin.
-- ============================================================================

alter table public.products add column if not exists compare_at_price int;
alter table public.products add column if not exists stock_qty        int;

-- Guardas: nada de precios o stock negativos.
alter table public.products drop constraint if exists products_compare_at_price_chk;
alter table public.products add  constraint products_compare_at_price_chk
  check (compare_at_price is null or compare_at_price > 0);

alter table public.products drop constraint if exists products_stock_qty_chk;
alter table public.products add  constraint products_stock_qty_chk
  check (stock_qty is null or stock_qty >= 0);


-- ###########################################################################
-- ##  add-orders.sql
-- ###########################################################################

-- ============================================================================
--  Tabla de pedidos
--  ----------------------------------------------------------------------------
--  Hoy las compras no se guardan en ninguna parte: el webhook manda un correo
--  y nada más. Con esta tabla cada pago confirmado queda registrado y se
--  administra desde la pestaña "Pedidos" del panel.
--
--  PASO 1 · Corré primero supabase/acceso-admin.sql con tu correo en la lista.
--           Esta tabla usa la función public.es_admin() que se crea ahí.
--  PASO 2 · Pegá todo esto en Supabase → SQL Editor → Run.
--  PASO 3 · En Vercel → Settings → Environment Variables agregá:
--             SUPABASE_URL              (Supabase → Settings → API)
--             SUPABASE_SERVICE_ROLE_KEY (la clave sb_secret_..., es SECRETA)
--
--  OJO con la clave de servicio: se salta todas las reglas de seguridad. Va
--  solo en Vercel. Nunca en el repositorio ni en un archivo de la carpeta js/.
-- ============================================================================

create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  status       text not null default 'iniciado'
                 check (status in ('iniciado','nuevo','preparando','enviado')),
  payment_id   text unique,
  mp_status    text,

  cliente_nombre    text not null default '',
  cliente_email     text not null default '',
  cliente_telefono  text not null default '',
  cliente_rut       text default '',
  cliente_ciudad    text default '',
  cliente_direccion text default '',

  items        jsonb not null default '[]',
  total        int   not null default 0,
  nota         text  default '',

  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  updated_at   timestamptz not null default now(),

  -- La prioridad de la lista la calcula la base, no el navegador.
  orden smallint generated always as (
    case status when 'nuevo' then 0 when 'preparando' then 1 else 2 end
  ) stored
);

create index if not exists orders_orden_fecha on public.orders (orden asc, created_at desc);

alter table public.orders enable row level security;

-- Acá hay nombres, teléfonos, direcciones y RUT de clientes: a diferencia del
-- catálogo, NADIE del público puede leer esto. Solo los correos de es_admin().
drop policy if exists "orders admin read"  on public.orders;
create policy "orders admin read" on public.orders
  for select to authenticated using ( public.es_admin() );

drop policy if exists "orders admin write" on public.orders;
create policy "orders admin write" on public.orders
  for update to authenticated using ( public.es_admin() ) with check ( public.es_admin() );

drop policy if exists "orders admin delete" on public.orders;
create policy "orders admin delete" on public.orders
  for delete to authenticated using ( public.es_admin() );

-- Sin política de insert para nadie: el único que inserta es el servidor, con
-- la clave de servicio, que no pasa por estas reglas.


-- ###########################################################################
-- ##  add-site-config.sql
-- ###########################################################################

-- ============================================================================
--  Configuración del sitio — banners, categorías, filas de la portada y reseñas
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Es seguro correrlo varias veces.
--
--  Una sola tabla de clave y valor. El valor es JSON, así que cada sección
--  nueva del panel no necesita otro SQL: alcanza con una clave más.
--
--  Claves que usa la web hoy:
--    banners     [ {desktop, mobile, alt, link} ]
--    categorias  [ {arriba, titulo, desde, cat, img, banner} ]
--    filas       { ofertas:[slug], mas:[slug] }
--    reviews     [ {name, stars, product, text, date, verified} ]
--
--  Mientras una clave no exista, la web usa lo que está escrito en los
--  archivos js/, así que nada se rompe antes de guardar la primera vez.
-- ============================================================================

create table if not exists public.site_config (
  key        text primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- ── Categorías libres ───────────────────────────────────────────────────────
-- products.category traía un candado que solo aceptaba 'audifonos', 'relojes'
-- y 'accesorios'. Ahora las categorías se arman desde /admin, así que ese
-- candado pelea con lo que se elija: al guardar un producto en 'smartwatch' o
-- 'cargadores' la base lo rechazaba. Se saca y la categoría queda libre.
alter table public.products drop constraint if exists products_category_check;

-- Deja constancia de cuándo se tocó cada cosa, sin tener que acordarse.
create or replace function public.site_config_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists site_config_touch on public.site_config;
create trigger site_config_touch
  before update on public.site_config
  for each row execute function public.site_config_touch();

-- ── Permisos ────────────────────────────────────────────────────────────────
alter table public.site_config enable row level security;

-- Cualquiera puede leer: es lo que la tienda muestra en público.
drop policy if exists "site_config public read" on public.site_config;
create policy "site_config public read" on public.site_config
  for select to anon, authenticated using ( true );

-- Escribir, solo con sesión iniciada. Si ya corriste lock-writes-to-admin.sql
-- y querés el mismo candado acá, cambiá esta política por la de abajo.
drop policy if exists "site_config auth write" on public.site_config;
create policy "site_config auth write" on public.site_config
  for all to authenticated using ( true ) with check ( true );

-- ── Candado por email (opcional) ────────────────────────────────────────────
-- Descomentá las cinco líneas y poné tu email para que ni siquiera otro
-- usuario registrado pueda escribir. Es el mismo criterio del archivo
-- lock-writes-to-admin.sql.
--
-- drop policy if exists "site_config auth write" on public.site_config;
-- create policy "site_config admin write" on public.site_config
--   for all to authenticated
--   using      ( (auth.jwt() ->> 'email') = 'TU-EMAIL-ADMIN@ejemplo.com' )
--   with check ( (auth.jwt() ->> 'email') = 'TU-EMAIL-ADMIN@ejemplo.com' );


-- ###########################################################################
-- ##  add-reviews.sql
-- ###########################################################################

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  product_slug text not null,
  name         text not null default '',
  stars        int  not null default 5 check (stars between 1 and 5),
  text         text not null default '',
  color        text default '',
  verified     boolean not null default false,
  images       jsonb not null default '[]',
  fecha        date not null default current_date,
  position     int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists reviews_slug on public.reviews (product_slug, position);

alter table public.reviews enable row level security;

drop policy if exists "reviews lee todos" on public.reviews;
create policy "reviews lee todos" on public.reviews
  for select to anon, authenticated using ( true );

drop policy if exists "reviews admin write" on public.reviews;
create policy "reviews admin write" on public.reviews
  for all to authenticated using ( public.es_admin() ) with check ( public.es_admin() );


-- ###########################################################################
-- ##  add-review-moderacion.sql
-- ###########################################################################

alter table public.reviews add column if not exists status  text not null default 'aprobada';
alter table public.reviews add column if not exists ip_hash text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_status_chk') then
    alter table public.reviews add constraint reviews_status_chk check (status in ('pendiente','aprobada'));
  end if;
end $$;

create index if not exists reviews_status on public.reviews (status, product_slug);
create index if not exists reviews_ip on public.reviews (ip_hash, created_at);

drop policy if exists "reviews lee todos" on public.reviews;
drop policy if exists "reviews lee aprobadas" on public.reviews;
create policy "reviews lee aprobadas" on public.reviews
  for select to anon, authenticated
  using ( status = 'aprobada' or public.es_admin() );


-- ###########################################################################
-- ##  faltantes.sql
-- ###########################################################################

-- ============================================================================
--  Productos que faltan en la base
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Se puede correr varias veces.
--
--  La base tenía 8 productos y la web espera 12. Los 4 que faltaban existían
--  solo en los archivos, así que aparecían un instante y desaparecían cuando
--  Supabase contestaba con su lista.
-- ============================================================================

insert into public.products
  (slug, name, category, description, image, image_scale, in_stock, features, colors, position)
values
  ('apple-watch-ultra-3', 'Apple Watch Ultra 3', 'smartwatch',
   'El Apple Watch más resistente. Titanio de grado aeroespacial, pantalla Always-On de 49mm y hasta 60 horas de batería.',
   'images/ultra3black.webp', 0.75, true,
   array['Caja de titanio aeroespacial','Pantalla Always-On 49mm','Hasta 60 horas de batería','GPS de doble frecuencia'],
   '[{"name":"Negro","hex":"#1A1A1A","img":"images/ultra3black.webp","swatch":"images/miniultra3correablack.webp"},
     {"name":"Negro total","hex":"#000000","img":"images/ultra3blackcorreablack.webp","swatch":"images/miniblackultra3.webp"},
     {"name":"Gris","hex":"#8E8E93","img":"images/ultra3gris.webp","swatch":"images/minigrisultra3.webp"},
     {"name":"Naranja","hex":"#F26513","img":"images/ultra3orange.webp","swatch":"images/miniorangeultra3.webp"}]'::jsonb,
   1),

  ('airpods-3', 'AirPods Pro 3', 'audifonos',
   'Cancelación activa de ruido, audio espacial y resistencia al agua. La generación más avanzada, cómoda para todo el día.',
   'images/airpods-3gen.webp', 0.75, true,
   array['Cancelación activa de ruido','Audio espacial personalizado','Resistencia al agua','Hasta 30 horas con estuche'],
   '[]'::jsonb, 4),

  ('buds4-pro', 'Galaxy Buds4 Pro', 'audifonos',
   'Audífonos inalámbricos Samsung con cancelación de ruido y audio de alta resolución. Compatibles con toda la línea Galaxy.',
   'images/buds4-pro.webp', 0.75, true,
   array['Cancelación de ruido activa','Audio de alta resolución','Compatible con Galaxy','Estuche con carga inalámbrica'],
   '[]'::jsonb, 7),

  ('buds2-pro', 'Galaxy Buds2 Pro', 'audifonos',
   'Audífonos inalámbricos Samsung, compactos y livianos, con cancelación de ruido y sonido envolvente.',
   'images/buds2-pro.webp', 0.75, true,
   array['Cancelación de ruido activa','Diseño compacto y liviano','Sonido envolvente','Resistencia al agua IPX7'],
   '[]'::jsonb, 8)

on conflict (slug) do update set
  name        = excluded.name,
  category    = excluded.category,
  description = excluded.description,
  image       = excluded.image,
  features    = excluded.features,
  colors      = excluded.colors;

-- ── Precios ─────────────────────────────────────────────────────────────────
-- Los tramos se borran y se rehacen, así correr esto dos veces no duplica.
delete from public.price_tiers
where product_id in (select id from public.products
                     where slug in ('apple-watch-ultra-3','airpods-3','buds4-pro','buds2-pro'));

insert into public.price_tiers (product_id, qty, price, active)
select p.id, t.qty, t.price, true
from public.products p
join (values
  ('apple-watch-ultra-3', 1, 27500), ('apple-watch-ultra-3', 3, 27500),
  ('apple-watch-ultra-3', 5, 27500), ('apple-watch-ultra-3',10, 27500),
  ('airpods-3',  1, 25000), ('airpods-3',  3, 15500),
  ('airpods-3',  5, 15000), ('airpods-3', 10, 14500),
  ('buds4-pro',  1, 16000), ('buds4-pro',  3, 16000),
  ('buds4-pro',  5, 16000), ('buds4-pro', 10, 16000),
  ('buds2-pro',  1, 14000), ('buds2-pro',  3, 14000),
  ('buds2-pro',  5, 14000), ('buds2-pro', 10, 14000)
) as t(slug, qty, price) on t.slug = p.slug;

-- ── Revisar cómo quedó ──────────────────────────────────────────────────────
select p.slug, p.name, p.category,
       jsonb_array_length(coalesce(p.colors,'[]'::jsonb)) as colores,
       count(t.id) as tramos
from public.products p
left join public.price_tiers t on t.product_id = p.id
group by p.id, p.slug, p.name, p.category, p.colors, p.position
order by p.position;


-- ###########################################################################
-- ##  iphone18.sql
-- ###########################################################################

insert into public.products
  (slug, name, category, description, image, image_scale, in_stock, features, colors, position)
values
  ('iphone-18-pro-max-256', 'iPhone 18 Pro Max 256 GB', 'celulares',
   'iPhone 18 Pro Max de 256 GB. Pantalla Super Retina XDR, sistema de cámaras Pro y el chip más potente de Apple.',
   'images/iphone18.webp', 0.75, true,
   array['256 GB de almacenamiento','Pantalla Super Retina XDR','Sistema de cámaras Pro','Chip de última generación'],
   '[]'::jsonb, 99)
on conflict (slug) do update set
  name        = excluded.name,
  category    = excluded.category,
  description = excluded.description,
  image       = excluded.image,
  features    = excluded.features,
  colors      = excluded.colors;

update public.products set gallery = array['images/iphone18dos.webp']
where slug = 'iphone-18-pro-max-256';

delete from public.price_tiers
where product_id in (select id from public.products where slug = 'iphone-18-pro-max-256');

insert into public.price_tiers (product_id, qty, price, active)
select p.id, t.qty, t.price, true
from public.products p
join (values ('iphone-18-pro-max-256', 1, 1150000)) as t(slug, qty, price)
  on t.slug = p.slug;

select pr.slug, pr.name, pr.category, pr.image, pr.gallery,
       (select count(*) from public.price_tiers pt where pt.product_id = pr.id) as tramos
from public.products pr where pr.slug = 'iphone-18-pro-max-256';


-- ###########################################################################
-- ##  telefonos.sql
-- ###########################################################################

-- ============================================================================
--  Teléfonos — iPhone 15, iPhone 16 y Galaxy S26 Plus
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Se puede correr varias veces.
--
--  Van sin precio mayorista: un solo tramo, el de una unidad. La ficha
--  muestra ese precio y nada de tabla por cantidad.
--
--  Las fotos van al final de este archivo: una principal y dos de galería
--  para cada teléfono.
-- ============================================================================

insert into public.products
  (slug, name, category, description, image, image_scale, in_stock, features, colors, position)
values
  ('iphone-15-128', 'iPhone 15 128 GB', 'celulares',
   'iPhone 15 de 128 GB. Pantalla Super Retina XDR, Dynamic Island, cámara de 48 MP y puerto USB-C.',
   'images/iphone15uno.webp', 0.75, true,
   array['128 GB de almacenamiento','Pantalla Super Retina XDR','Cámara principal de 48 MP','Puerto USB-C'],
   '[]'::jsonb, 20),

  ('iphone-16-128', 'iPhone 16 128 GB', 'celulares',
   'iPhone 16 de 128 GB. Chip A18, botón de Control de Cámara, cámara de 48 MP y batería de mayor duración.',
   'images/iphone16uno.webp', 0.75, true,
   array['128 GB de almacenamiento','Chip A18','Botón de Control de Cámara','Cámara principal de 48 MP'],
   '[]'::jsonb, 21),

  ('s26-plus-256', 'Galaxy S26 Plus 256 GB', 'celulares',
   'Samsung Galaxy S26 Plus de 256 GB. Pantalla Dynamic AMOLED, cámara de alta resolución y carga rápida.',
   'images/samsumg26uno.webp', 0.75, true,
   array['256 GB de almacenamiento','Pantalla Dynamic AMOLED','Cámara de alta resolución','Carga rápida'],
   '[]'::jsonb, 22)

on conflict (slug) do update set
  name        = excluded.name,
  category    = excluded.category,
  description = excluded.description,
  features    = excluded.features;

delete from public.price_tiers
where product_id in (select id from public.products
                     where slug in ('iphone-15-128','iphone-16-128','s26-plus-256'));

insert into public.price_tiers (product_id, qty, price, active)
select p.id, t.qty, t.price, true
from public.products p
join (values
  ('iphone-15-128', 1, 480000),
  ('iphone-16-128', 1, 580000),
  ('s26-plus-256',  1, 580000)
) as t(slug, qty, price) on t.slug = p.slug;

select p.slug, p.name, p.category, count(t.id) as tramos, min(t.price) as precio
from public.products p
left join public.price_tiers t on t.product_id = p.id
where p.slug in ('iphone-15-128','iphone-16-128','s26-plus-256')
group by p.id, p.slug, p.name, p.category;

-- ── Fotos del iPhone 15 ─────────────────────────────────────────────────────
-- La primera es la principal; las otras dos van a la galería de la ficha, la
-- que se recorre con la flecha.
update public.products set
  image   = 'images/iphone15uno.webp',
  gallery = array['images/iphone15dos.webp','images/iphone15tres.webp']
where slug = 'iphone-15-128';

-- ── Fotos del iPhone 16 ─────────────────────────────────────────────────────
update public.products set
  image   = 'images/iphone16uno.webp',
  gallery = array['images/iphone16dos.webp','images/iphone16tres.webp']
where slug = 'iphone-16-128';

-- ── Fotos del Galaxy S26 Plus ───────────────────────────────────────────────
update public.products set
  image   = 'images/samsumg26uno.webp',
  gallery = array['images/samsumg26dos.webp','images/samsumg26tres.webp']
where slug = 's26-plus-256';


-- ###########################################################################
-- ##  ultra3-colores.sql
-- ###########################################################################

-- ============================================================================
--  Apple Watch Ultra 3 — categoría, imagen principal y colores
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run.
--
--  Por qué hace falta: la web pinta primero con lo que está escrito en los
--  archivos, y después Supabase la repinta con lo suyo. El Ultra 3 estaba en
--  la base con la imagen vieja, la categoría vieja y sin colores, así que los
--  colores aparecían un instante y se borraban.
--
--  Lo mismo se puede hacer desde /admin → Catálogo, en la sección
--  "Características e imágenes". Esto es solo la vía rápida.
-- ============================================================================

update public.products set
  category = 'smartwatch',
  image    = 'images/ultra3black.webp',
  colors   = '[
    {"name":"Negro",       "hex":"#1A1A1A", "img":"images/ultra3black.webp",            "swatch":"images/miniultra3correablack.webp"},
    {"name":"Negro total", "hex":"#000000", "img":"images/ultra3blackcorreablack.webp", "swatch":"images/miniblackultra3.webp"},
    {"name":"Gris",        "hex":"#8E8E93", "img":"images/ultra3gris.webp",             "swatch":"images/minigrisultra3.webp"},
    {"name":"Naranja",     "hex":"#F26513", "img":"images/ultra3orange.webp",           "swatch":"images/miniorangeultra3.webp"}
  ]'::jsonb
where slug = 'apple-watch-ultra-3';

-- El resto de los productos también quedaron con categorías viejas. Estas
-- cuatro son las que usa la web hoy.
update public.products set category = 'smartwatch' where slug in ('apple-watch-ultra-3','apple-watch-serie-10');
update public.products set category = 'audifonos'  where slug in ('airpods-4','airpods-3','airpods-pro-2','airpods-max','buds4-pro','buds2-pro');
update public.products set category = 'celulares'  where slug in ('bateria-magsafe');
update public.products set category = 'cargadores' where slug in ('cargador-lightning','cargador-tipo-c','cargador-samsung-45w');

-- Para revisar cómo quedó todo:
select slug, name, category, image, jsonb_array_length(coalesce(colors,'[]'::jsonb)) as colores
from public.products order by category, name;


-- ###########################################################################
-- ##  serie11-colores.sql
-- ###########################################################################

update public.products set
  image   = 'images/serie11black.webp',
  gallery = array[]::text[],
  colors  = '[
    {"name":"Negro", "hex":"#1A1A1A", "img":"images/serie11black.webp", "swatch":"images/miniblack11.webp"},
    {"name":"Oro",   "hex":"#E3C08D", "img":"images/serie11oro.webp",   "swatch":"images/minioro.webp"},
    {"name":"Gris",  "hex":"#8E8E93", "img":"images/grisserie11.webp",  "swatch":"images/miniserie11gris.webp"}
  ]'::jsonb
where slug = 'apple-watch-serie-10';

update public.reviews set color = case name
    when 'Daniela M.'   then 'Negro'
    when 'Antonia G.'   then 'Gris'
    when 'Matías O.'    then 'Oro'
    when 'Francisca D.' then 'Negro'
    when 'Valeria N.'   then 'Gris'
    when 'Diego T.'     then 'Negro'
    when 'Macarena Q.'  then 'Oro'
    when 'Álvaro J.'    then 'Gris'
    when 'Gonzalo Y.'   then 'Negro'
    when 'Camila Ñ.'    then 'Oro'
    when 'Isidora K.'   then 'Gris'
    when 'Sebastián I.' then 'Negro'
    when 'Bárbara U.'   then 'Oro'
    when 'Renato W.'    then 'Gris'
    else color end
where product_slug = 'apple-watch-serie-10';

select slug, name, image, jsonb_array_length(coalesce(colors,'[]'::jsonb)) as colores
from public.products where slug = 'apple-watch-serie-10';


-- ###########################################################################
-- ##  colores-buds4-y-max.sql
-- ###########################################################################

-- ============================================================================
--  Colores de los Galaxy Buds4 Pro · Orange y Blue del Max, agotados
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Se puede correr varias veces.
--
--  "agotado": true deja el color a la vista, en gris y sin poder elegirlo.
--  Para reactivarlo alcanza con el interruptor del panel, sin volver a subir
--  las fotos.
-- ============================================================================

update public.products set
  colors = '[
    {"name":"Negro", "hex":"#1A1A1A", "img":"images/buds4black.webp", "swatch":"images/minibuds4black.webp"},
    {"name":"Gris",  "hex":"#8E8E93", "img":"images/buds4gris.webp",  "swatch":"images/minibuds4gris.webp"},
    {"name":"Rosa",  "hex":"#E8A0B4", "img":"images/buds4pink.webp",  "swatch":"images/minibuds4pink.webp"}
  ]'::jsonb,
  image = 'images/buds4black.webp'
where slug = 'buds4-pro';

update public.products set
  colors = '[
    {"name":"Midnight",  "hex":"#1A1A1A", "img":"images/max-negros.webp",  "swatch":"images/black.webp"},
    {"name":"Starlight", "hex":"#F5F0E8", "img":"images/max-blanco.webp",  "swatch":"images/mstarlight.webp"},
    {"name":"Purple",    "hex":"#9B59B6", "img":"images/max-morado.webp",  "swatch":"images/purple.webp"},
    {"name":"Orange",    "hex":"#F26513", "img":"images/max-naranja.webp", "swatch":"images/orange.webp", "agotado": true},
    {"name":"Blue",      "hex":"#3498DB", "img":"images/max-azul.webp",    "swatch":"images/blue.webp",   "agotado": true}
  ]'::jsonb
where slug = 'airpods-max';

select slug, name, jsonb_array_length(coalesce(colors,'[]'::jsonb)) as colores,
       (select count(*) from jsonb_array_elements(coalesce(colors,'[]'::jsonb)) c
        where (c->>'agotado')::boolean is true) as agotados
from public.products
where jsonb_array_length(coalesce(colors,'[]'::jsonb)) > 0
order by name;


-- ###########################################################################
-- ##  imagenes-buds.sql
-- ###########################################################################

-- ============================================================================
--  Fotos de los Galaxy Buds
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Se puede correr varias veces.
--
--  El Buds2 Pro lleva dos fotos y ningún color: la segunda va a la galería,
--  la que se recorre con la flecha dentro de la ficha.
--  El Buds4 Pro sí tiene colores, así que su foto principal es la negra.
-- ============================================================================

update public.products set
  image   = 'images/budspro2.webp',
  gallery = array['images/budspro2imagen2.webp']
where slug = 'buds2-pro';

update public.products set
  image = 'images/buds4black.webp'
where slug = 'buds4-pro';

select slug, name, image, gallery,
       jsonb_array_length(coalesce(colors,'[]'::jsonb)) as colores
from public.products where slug in ('buds2-pro','buds4-pro');

-- ── Cargador Tipo C ─────────────────────────────────────────────────────────
-- Foto principal nueva. La segunda de la ficha no se toca.
update public.products set
  image = 'images/cargadorcompletotipoc.webp'
where slug = 'cargador-tipo-c';


-- ###########################################################################
-- ##  seed-gallery.sql
-- ###########################################################################

-- ============================================================================
--  Seed de imágenes secundarias (galería del detalle)
--  Ejecutar UNA vez en Supabase → SQL Editor (si ya corriste schema.sql antes
--  de esta función). Carga en cada producto las fotos -v2/-v3 que ya existían,
--  para que la página de detalle las siga mostrando y queden editables en /admin.
-- ============================================================================

update public.products set gallery = array['images/apple-watch-ultra-3-v2.webp','images/apple-watch-ultra-3-v3.webp']           where slug = 'apple-watch-ultra-3';
update public.products set gallery = array['images/apple-watch-serie-10-v2.webp','images/apple-watch-serie-10-v3.webp']         where slug = 'apple-watch-serie-10';
update public.products set gallery = array['images/apple-watch-black-ultra-2-v2.webp','images/apple-watch-black-ultra-2-v3.webp'] where slug = 'apple-watch-black-ultra-2';
update public.products set gallery = array['images/airpods-4ta-generacion-v2.webp','images/airpods-4ta-generacion-v3.webp']     where slug = 'airpods-4';
update public.products set gallery = array['images/airpods-pro-2-v2.webp','images/airpods-pro-2-v3.webp']                       where slug = 'airpods-pro-2';
update public.products set gallery = array['images/airpods-3ra-generacion-v2.webp','images/airpods-3ra-generacion-v3.webp']     where slug = 'airpods-3';
update public.products set gallery = array['images/max-magneticos-v2.webp','images/max-magneticos-v3.webp']                     where slug = 'airpods-max';
update public.products set gallery = array['images/bateria-magsafe-v2.webp']                                                    where slug = 'bateria-magsafe';
update public.products set gallery = array['images/cargador-lightning-completo-v2.webp']                                        where slug = 'cargador-lightning';
update public.products set gallery = array['images/cargador-tipo-c-completo-v2.webp']                                           where slug = 'cargador-tipo-c';
update public.products set gallery = array['images/cargador-samsung-45w-v2.webp']                                               where slug = 'cargador-samsung-45w';


-- ###########################################################################
-- ##  update-max-image.sql
-- ###########################################################################

-- ============================================================================
--  Imagen principal del AirPods Max → max-negros (el negro), en vez de
--  max-magneticos. Afecta la grilla de productos y el carrusel de destacados.
--  Ejecutar en Supabase → SQL Editor.
-- ============================================================================

update public.products
set image = 'images/max-negros.webp'
where slug = 'airpods-max';


-- ###########################################################################
-- ##  png-a-webp.sql
-- ###########################################################################

-- ============================================================================
--  Pasar las rutas de .png a .webp en la base
--  ----------------------------------------------------------------------------
--  Pegar en Supabase → SQL Editor → Run. Es seguro correrlo varias veces.
--
--  Todas las imágenes del sitio se convirtieron a webp y los .png se borraron.
--  La base seguía guardando las rutas viejas, así que esos productos salían
--  sin foto: Supabase pisa al catálogo del código, y mandaba una ruta muerta.
--
--  Esto cambia la terminación en los tres lugares donde hay rutas: la imagen
--  principal, la galería y los colores. No toca ningún otro dato.
-- ============================================================================

-- ── Imagen principal ────────────────────────────────────────────────────────
update public.products
set image = replace(image, '.png', '.webp')
where image like '%.png';

-- ── Galería (lista de rutas) ────────────────────────────────────────────────
update public.products
set gallery = (
  select array_agg(replace(g, '.png', '.webp') order by orden)
  from unnest(gallery) with ordinality as t(g, orden)
)
where exists (select 1 from unnest(gallery) as g where g like '%.png');

-- ── Colores (JSON con img y swatch) ─────────────────────────────────────────
update public.products
set colors = replace(colors::text, '.png', '.webp')::jsonb
where colors::text like '%.png%';

-- ── Banners y demás, si ya guardaste algo desde el panel ────────────────────
update public.site_config
set value = replace(value::text, '.png', '.webp')::jsonb
where value::text like '%.png%';

-- ── Revisar que no quede ninguna ────────────────────────────────────────────
select slug, name, image,
       (select count(*) from unnest(coalesce(gallery,'{}')) g where g like '%.png') as galeria_png,
       case when colors::text like '%.png%' then 1 else 0 end as colores_png
from public.products
where image like '%.png'
   or colors::text like '%.png%'
   or exists (select 1 from unnest(coalesce(gallery,'{}')) g where g like '%.png');
-- Si esta consulta no devuelve filas, quedó todo en webp.


-- ###########################################################################
-- ##  seed-reviews.sql
-- ###########################################################################

do $$
begin
  if (select count(*) from public.reviews) < 10 then
    insert into public.reviews (product_slug,name,stars,text,color,verified,fecha,position) values
    ('airpods-max','Ignacio T.',5,'La calidad de sonido es otro nivel. Muy cómodos para usar horas seguidas.','Midnight',false,'2026-09-12',1),
    ('airpods-max','Romina F.',5,'La fijación magnética es precisa, calza de una sin buscar el punto.','Starlight',false,'2026-08-24',2),
    ('airpods-max','Marcelo D.',5,'Terminación premium de verdad. Se siente el metal, no plástico pintado.','Purple',false,'2026-08-06',3),
    ('airpods-max','Javiera S.',5,'Los colores se ven tal cual la foto. Quedé encantada.','Midnight',false,'2026-07-18',4),
    ('airpods-max','Álex M.',4,'Muy buenos 👌','Orange',false,'2026-06-27',5),
    ('airpods-max','Tamara C.',4,'Suenan excelente.','Starlight',false,'2026-06-08',6),
    ('airpods-max','Luis P.',4,'👍👍','Blue',false,'2026-05-19',7),
    ('airpods-max','Catalina V.',4,'Buen producto, llegó bien protegido.','Midnight',false,'2026-04-30',8),
    ('buds4-pro','Camila R.',5,'El sonido es potente y la cancelación de ruido funciona muy bien en la micro.','Negro',false,'2026-09-19',1),
    ('buds4-pro','Diego M.',5,'Livianos, casi no se sienten en la oreja. Los uso todo el día trabajando.','Gris',false,'2026-09-04',2),
    ('buds4-pro','Fernanda P.',5,'El rosa se ve precioso en persona, igual que en la foto. Muy contenta.','Rosa',false,'2026-08-21',3),
    ('buds4-pro','Sebastián L.',5,'Se conectan al Galaxy al instante. La batería me dura toda la jornada.','Negro',false,'2026-08-07',4),
    ('buds4-pro','Antonia V.',5,'El estuche carga rápido y entra en cualquier bolsillo.','Negro',false,'2026-07-23',5),
    ('buds4-pro','Matías C.',5,'Compré ocho para revender y salieron todos parejos. Buen producto.','Gris',false,'2026-07-09',6),
    ('buds4-pro','Valeria S.',4,'Muy buenos 👌','Rosa',false,'2026-06-25',7),
    ('buds4-pro','Joaquín A.',4,'Buen sonido y cómodos.','Negro',false,'2026-06-10',8),
    ('buds4-pro','Paulina T.',4,'Cumplen de sobra 👍','Gris',false,'2026-05-26',9),
    ('buds4-pro','Nicolás B.',4,'Llegaron rápido y bien embalados ✅','Negro',false,'2026-05-08',10),
    ('buds2-pro','Constanza F.',5,'Muy cómodos y el sonido se escucha limpio. Los uso todos los días para ir al trabajo.','',false,'2026-09-16',1),
    ('buds2-pro','Ignacio R.',5,'Chiquitos y livianos, casi no se sienten. La cancelación de ruido cumple de sobra.','',false,'2026-08-29',2),
    ('buds2-pro','Martina D.',5,'Se conectan solos al teléfono apenas abro el estuche. Muy práctico.','',false,'2026-08-11',3),
    ('buds2-pro','Álvaro S.',5,'Buena batería, me duran toda la jornada sin cargarlos.','',false,'2026-07-24',4),
    ('buds2-pro','Josefa M.',4,'Muy buenos 👌','',false,'2026-07-02',5),
    ('buds2-pro','Cristóbal N.',4,'Buen producto y llegó rápido ✅','',false,'2026-06-14',6),
    ('buds2-pro','Daniela A.',4,'Cumplen muy bien por lo que cuestan 👍','',false,'2026-05-21',7),
    ('iphone-15-128','Rodrigo V.',5,'Llegó sellado y con todo original. La cámara es una maravilla.','',false,'2026-09-21',1),
    ('iphone-15-128','Camila B.',5,'El USB-C se agradece, cargo el teléfono con el mismo cable del notebook.','',false,'2026-09-02',2),
    ('iphone-15-128','Felipe O.',5,'Me asesoraron bien sobre el almacenamiento. Muy buena atención.','',false,'2026-08-13',3),
    ('iphone-15-128','Antonia L.',5,'La pantalla se ve increíble incluso con sol directo.','',false,'2026-07-26',4),
    ('iphone-15-128','Matías G.',5,'Segundo teléfono que compro acá. Producto impecable.','',false,'2026-06-30',5),
    ('iphone-15-128','Valeria C.',4,'Excelente teléfono 🔥','',false,'2026-06-05',6),
    ('iphone-15-128','Tomás R.',5,'Llegó en tres días a Rancagua, bien embalado y sin un rayón.','',false,'2026-05-14',7),
    ('iphone-16-128','Sebastián P.',5,'El chip A18 se nota, todo vuela. Muy buena compra.','',false,'2026-09-23',1),
    ('iphone-16-128','Francisca T.',5,'El botón de cámara es súper cómodo para tomar fotos rápido.','',false,'2026-09-01',2),
    ('iphone-16-128','Nicolás A.',5,'Llegó en dos días, sellado y con su número de serie válido.','',false,'2026-08-08',3),
    ('iphone-16-128','Paula H.',4,'La batería me dura todo el día con uso pesado 👍','',false,'2026-07-15',4),
    ('iphone-16-128','Ignacio D.',5,'Llegó sellado y con todo original. La cámara saca unas fotos increíbles.','',false,'2026-06-22',5),
    ('iphone-16-128','Catalina M.',5,'Me asesoraron por WhatsApp antes de decidir. Muy buena atención.','',false,'2026-05-30',6),
    ('s26-plus-256','Tomás M.',5,'La pantalla es enorme y se ve espectacular. Muy contento.','',false,'2026-09-18',1),
    ('s26-plus-256','Javiera C.',5,'Los 256 GB me sobran para fotos y videos. Carga muy rápido.','',false,'2026-08-22',2),
    ('s26-plus-256','Benjamín S.',5,'Llegó sellado y con todo lo que decía la descripción.','',false,'2026-07-19',3),
    ('s26-plus-256','Romina A.',4,'Muy buen teléfono 👍','',false,'2026-09-08',4),
    ('s26-plus-256','Cristián V.',5,'Viniendo de un S21, el salto se nota en todo. La cámara de noche es otra cosa.','',false,'2026-08-05',5),
    ('s26-plus-256','Daniela E.',5,'Me respondieron todas las dudas por WhatsApp antes de comprar. Buena atención.','',false,'2026-07-28',6),
    ('s26-plus-256','Matías Z.',5,'La batería me dura el día completo con uso pesado. Muy contento.','',false,'2026-07-04',7),
    ('s26-plus-256','Fernanda I.',5,'Llegó en tres días a Valparaíso, bien embalado y con todo original.','',false,'2026-06-16',8),
    ('s26-plus-256','Gonzalo P.',4,'Excelente equipo 🔥','',false,'2026-05-30',9),
    ('s26-plus-256','Antonia B.',4,'Muy buen producto ✅','',false,'2026-05-12',10),
    ('s26-plus-256','Rodrigo Q.',5,'El S Pen no viene, pero el equipo es un fierro. Lo recomiendo.','',false,'2026-04-24',11),
    ('s26-plus-256','Camila U.',4,'Cumple todo lo que promete 👌','',false,'2026-04-06',12),
    ('s26-plus-256','Esteban W.',5,'Segundo Samsung que compro acá. Siempre producto original y bien embalado.','',false,'2026-03-18',13),
    ('s26-plus-256','Marcela D.',5,'La pantalla grande se agradece para ver series en el bus.','',false,'2026-03-02',14),
    ('s26-plus-256','Hugo T.',5,'Compré dos, uno para mí y otro para mi señora. Los dos perfectos.','',false,'2026-02-14',15),
    ('s26-plus-256','Paulina R.',4,'Buen equipo por el precio 👍','',false,'2026-01-27',16),
    ('s26-plus-256','Álvaro N.',5,'Atención rápida y el envío llegó cuando dijeron.','',false,'2026-01-09',17),
    ('s26-plus-256','Josefina B.',5,'Muy buena cámara, las fotos salen nítidas incluso con poca luz.','',false,'2025-12-18',18),
    ('s26-plus-256','Renato C.',4,'Excelente 🔥','',false,'2025-11-30',19),
    ('cargador-samsung-45w','Marcela G.',5,'Carga el Galaxy completo en menos de una hora. Impresionante.','',false,'2026-09-06',1),
    ('cargador-samsung-45w','Cristián P.',4,'Carga rápido 🔥','',false,'2026-08-20',2),
    ('cargador-samsung-45w','Daniela V.',4,'Buen producto.','',false,'2026-08-02',3),
    ('cargador-samsung-45w','Rodrigo S.',4,'Sirve también para mi notebook. Recomendado 👍','',false,'2026-07-15',4),
    ('cargador-samsung-45w','Francisca A.',4,'Todo bien ✅','',false,'2026-06-28',5),
    ('cargador-samsung-45w','Nelson M.',4,'Trae el cable incluido. Cumple.','',false,'2026-06-11',6),
    ('cargador-samsung-45w','Catalina R.',4,'Funciona con toda la línea Galaxy de la casa.','',false,'2026-05-22',7),
    ('cargador-samsung-45w','Benjamín T.',4,'Muy buen cargador.','',false,'2026-05-04',8),
    ('cargador-samsung-45w','Susana C.',4,'Buen precio para esta potencia 👌','',false,'2026-04-09',9),
    ('bateria-magsafe','Francisca L.',5,'Se pega firme al iPhone y carga sin cables. Justo lo que buscaba para viajar.','',false,'2026-09-17',1),
    ('bateria-magsafe','Roberto S.',5,'Cabe en el bolsillo con el teléfono pegado. Muy práctica para el día.','',false,'2026-09-02',2),
    ('bateria-magsafe','Daniela T.',5,'Me carga el iPhone de 20 a 80 por ciento sin enchufarlo a nada. Perfecta.','',false,'2026-08-18',3),
    ('bateria-magsafe','Paz M.',5,'El imán es fuerte, no se suelta ni caminando rápido.','',false,'2026-08-04',4),
    ('bateria-magsafe','Hernán V.',5,'Compré doce para revender y salieron todas parejas. Producto sólido.','',false,'2026-07-22',5),
    ('bateria-magsafe','Melissa A.',5,'La uso en viajes largos en bus. Me salva cuando no hay enchufe.','',false,'2026-07-08',6),
    ('bateria-magsafe','Gustavo P.',5,'Llegó con el cable incluido, como decía la descripción. Cumple lo que dice.','',false,'2026-06-23',7),
    ('bateria-magsafe','Cristián O.',4,'Funciona muy bien 👍','',false,'2026-06-05',8),
    ('bateria-magsafe','Antonia R.',4,'Buena y compacta.','',false,'2026-05-20',9),
    ('bateria-magsafe','Carla B.',4,'Buen producto ✅','',false,'2026-05-02',10),
    ('bateria-magsafe','Eduardo L.',4,'Liviana y bien terminada 💯','',false,'2026-04-14',11),
    ('cargador-lightning','Paula N.',5,'Funciona perfecto y el cable se siente firme. Cumple lo que promete.','',false,'2026-09-09',1),
    ('cargador-lightning','Víctor A.',5,'Carga igual de rápido que el original de Apple, a un tercio del precio.','',false,'2026-08-26',2),
    ('cargador-lightning','Mónica R.',4,'Compré veinte para el local y salió un lote parejo 👍','',false,'2026-08-12',3),
    ('cargador-lightning','Felipe C.',4,'Buen producto.','',false,'2026-07-29',4),
    ('cargador-lightning','Ximena S.',4,'Trae el adaptador incluido. Todo bien ✅','',false,'2026-07-14',5),
    ('cargador-lightning','Raúl M.',4,'Lo uso con el iPad y el iPhone, funciona en los dos.','',false,'2026-06-30',6),
    ('cargador-lightning','Karen L.',4,'Muy práctico 👌','',false,'2026-06-13',7),
    ('cargador-lightning','Daniela B.',4,'Cumple 👍','',false,'2026-05-28',8),
    ('cargador-lightning','Sergio V.',4,'Llegó al día siguiente. Excelente.','',false,'2026-05-11',9),
    ('cargador-lightning','Óscar D.',4,'Buen precio y hace lo suyo.','',false,'2026-04-26',10),
    ('cargador-lightning','Bernardita P.',4,'Segunda compra del mismo 🔥','',false,'2026-04-08',11),
    ('cargador-lightning','Jorge F.',4,'Buena atención y el cargador cumple.','',false,'2026-03-22',12),
    ('airpods-3','Susana L.',5,'Cómodos para todo el día. No aprietan como los que traen gomita.','',false,'2026-09-14',1),
    ('airpods-3','Ariel P.',5,'La carga MagSafe es práctica, los dejo en la misma base del teléfono.','',false,'2026-08-31',2),
    ('airpods-3','Priscila M.',5,'Resisten el sudor sin problema. Los uso corriendo tres veces por semana.','',false,'2026-08-18',3),
    ('airpods-3','Damián R.',5,'Muy buena opción si no querés gastar en los Pro. El audio espacial ya viene incluido.','',false,'2026-08-04',4),
    ('airpods-3','Elisa C.',4,'Pedí ocho unidades y se venden solos 🔥','',false,'2026-07-21',5),
    ('airpods-3','Verónica D.',4,'El micrófono se escucha claro en reuniones.','',false,'2026-07-06',6),
    ('airpods-3','Iván B.',4,'Llegaron bien embalados 👍','',false,'2026-06-20',7),
    ('airpods-3','Natalia G.',4,'Se los compré a mi mamá y le encantaron porque son livianos.','',false,'2026-06-04',8),
    ('airpods-3','Esteban Q.',4,'Buena batería 👌','',false,'2026-05-18',9),
    ('airpods-3','Loreto F.',4,'Atención rápida y clara.','',false,'2026-05-03',10),
    ('airpods-3','Andrés K.',4,'Tercera vez que compro acá ✅','',false,'2026-04-17',11),
    ('airpods-3','Matías V.',4,'Buen producto.','',false,'2026-04-01',12),
    ('airpods-3','Rodolfo A.',4,'Buen sonido y livianos 👍','',false,'2026-03-14',13),
    ('apple-watch-serie-10','Daniela M.',5,'Muy lindo el reloj. Se ve tal cual en las fotos, es cómodo y tiene varias funciones. La configuración fue sencilla y funciona súper bien.','Negro',false,'2026-09-18',1),
    ('apple-watch-serie-10','Antonia G.',5,'Todo perfecto, gracias. Llegó en dos días y bien embalado.','Gris',false,'2026-09-05',2),
    ('apple-watch-serie-10','Matías O.',5,'Es notoriamente más delgado que el Serie 9. Casi no se siente puesto.','Oro',false,'2026-08-23',3),
    ('apple-watch-serie-10','Francisca D.',5,'La pantalla grande se agradece para leer mensajes sin sacar el teléfono.','Negro',false,'2026-08-10',4),
    ('apple-watch-serie-10','Valeria N.',5,'La carga rápida es real, en media hora ya estaba en 80 por ciento.','Gris',false,'2026-07-27',5),
    ('apple-watch-serie-10','Diego T.',5,'Pedí cinco unidades y llegaron todas en su caja sellada. Cero problemas.','Negro',false,'2026-07-13',6),
    ('apple-watch-serie-10','Macarena Q.',5,'El monitoreo del sueño me sirvió mucho. Datos claros y fáciles de leer en la app.','Oro',false,'2026-06-29',7),
    ('apple-watch-serie-10','Álvaro J.',5,'Consulté por WhatsApp antes de comprar y me contestaron al rato. Buena atención.','Gris',false,'2026-06-14',8),
    ('apple-watch-serie-10','Gonzalo Y.',5,'Lo compré para el trabajo, contesto llamadas sin sacar el celular del bolsillo.','Negro',false,'2026-05-31',9),
    ('apple-watch-serie-10','Camila Ñ.',5,'Segunda unidad que pido, la primera se la quedó mi hermana. Producto tal cual la descripción.','Oro',false,'2026-05-16',10),
    ('apple-watch-serie-10','Isidora K.',5,'Llegó a Concepción en el plazo que me dijeron. La app está en español y se entiende todo.','Gris',false,'2026-04-29',11),
    ('apple-watch-serie-10','Sebastián I.',4,'Muy buen reloj 🔥','Negro',false,'2026-04-12',12),
    ('apple-watch-serie-10','Bárbara U.',4,'Cumple todo lo que promete 👍','Oro',false,'2026-03-28',13),
    ('apple-watch-serie-10','Renato W.',4,'Buena relación precio calidad.','Gris',false,'2026-03-09',14),
    ('cargador-tipo-c','Cristóbal A.',5,'Carga rápido de verdad. Buen precio comparado con otras tiendas.','',false,'2026-09-08',1),
    ('cargador-tipo-c','Verónica M.',5,'Lo uso con el iPhone 15 y el MacBook Air. Sirve para los dos sin problema.','',false,'2026-08-27',2),
    ('cargador-tipo-c','Pedro S.',5,'Los 20W se notan, en media hora sube bastante la carga.','',false,'2026-08-15',3),
    ('cargador-tipo-c','Constanza D.',5,'Compré veinticinco y es el que más rota en mi tienda. Buen producto de entrada.','',false,'2026-08-02',4),
    ('cargador-tipo-c','Camila P.',5,'Trae todo listo para usar. Lo enchufé y funcionó al instante.','',false,'2026-07-20',5),
    ('cargador-tipo-c','Gonzalo A.',5,'Sirve también para el iPad Pro, que era lo que necesitaba.','',false,'2026-07-07',6),
    ('cargador-tipo-c','Josefina V.',4,'Llegó bien empaquetado 👍','',false,'2026-06-24',7),
    ('cargador-tipo-c','Matías L.',4,'Uno de los mejores precios que encontré.','',false,'2026-06-10',8),
    ('cargador-tipo-c','Nicolás R.',4,'Buen cargador ✅','',false,'2026-05-27',9),
    ('cargador-tipo-c','Andrea B.',4,'Cumple bien.','',false,'2026-05-13',10),
    ('cargador-tipo-c','Emilio N.',4,'Tres meses cargando a diario y sigue igual 💯','',false,'2026-04-28',11),
    ('cargador-tipo-c','Maite F.',4,'Me avisaron cuando llegó el stock. Anda perfecto.','',false,'2026-04-11',12),
    ('cargador-tipo-c','Hugo C.',4,'Carga bien 👌','',false,'2026-03-26',13),
    ('cargador-tipo-c','Paola G.',4,'Muy buena compra por el precio.','',false,'2026-03-08',14),
    ('cargador-tipo-c','Tomás E.',4,'Anda bien y no se calienta 👍','',false,'2026-02-19',15),
    ('apple-watch-ultra-3','Andrea C.',5,'Súper linda experiencia de compra. Me ayudaron a elegir correctamente todo. Feliz con mi compra.','Negro',false,'2026-09-15',1),
    ('apple-watch-ultra-3','Rodrigo M.',5,'El titanio se siente firme, nada de plástico. Lo uso para correr y el GPS marca bien las rutas.','Gris',false,'2026-09-03',2),
    ('apple-watch-ultra-3','Catalina B.',5,'La batería es lo mejor. Lo cargo dos veces por semana y listo. Vengo de un Serie 6 y el cambio se nota.','Negro',false,'2026-08-22',3),
    ('apple-watch-ultra-3','Felipe A.',5,'Llegó sellado y con todo lo que decía. La pantalla se ve perfecta incluso con sol directo.','Naranja',false,'2026-08-11',4),
    ('apple-watch-ultra-3','Nicolás P.',5,'Compré tres para revender y salieron todos iguales, sin detalles. Buen margen al por mayor.','Negro',false,'2026-07-31',5),
    ('apple-watch-ultra-3','Daniela S.',5,'Lo pedí un martes y llegó el jueves a Viña. Bien embalado, con doble burbuja.','Gris',false,'2026-07-19',6),
    ('apple-watch-ultra-3','Tomás L.',5,'La correa de titanio es cómoda. Nada de marcas en la muñeca después de todo el día.','Negro',false,'2026-07-08',7),
    ('apple-watch-ultra-3','Constanza R.',5,'Resiste el agua sin problema, lo usé en la piscina varias veces y sigue igual.','Naranja',false,'2026-06-26',8),
    ('apple-watch-ultra-3','Paulina E.',5,'Segunda compra acá. Responden rápido y cumplen los plazos que dicen.','Gris',false,'2026-06-13',9),
    ('apple-watch-ultra-3','Cristián H.',5,'La configuración fue directa, lo emparejé con el iPhone en dos minutos.','Negro',false,'2026-05-30',10),
    ('apple-watch-ultra-3','Marisol T.',5,'El botón de acción se puede configurar para el cronómetro. Muy útil entrenando.','Naranja',false,'2026-05-17',11),
    ('apple-watch-ultra-3','Pablo Ú.',5,'La sirena de emergencia se escucha fuerte de verdad. Lo llevo cuando salgo a cerro.','Negro',false,'2026-05-04',12),
    ('apple-watch-ultra-3','Elena R.',5,'Todo original, con su número de serie válido en la app de Apple. Sin sorpresas.','Gris',false,'2026-04-20',13),
    ('apple-watch-ultra-3','Camila Z.',5,'Se lo regalé a mi pareja y quedó feliz. Se ve mucho mejor en persona que en foto.','Negro',false,'2026-04-06',14),
    ('apple-watch-ultra-3','Josefa V.',4,'Muy bueno 🔥','Naranja',false,'2026-03-20',15),
    ('apple-watch-ultra-3','Ignacio F.',4,'Excelente reloj y muy completo 👍','Negro',false,'2026-03-02',16),
    ('airpods-4','Jorge R.',5,'Llegó rápido y bien envuelto. Muy buen sonido, se recomienda.','',false,'2026-09-19',1),
    ('airpods-4','Camila S.',5,'Los compré para el gimnasio y no se caen. La batería dura todo el día sin problema.','',false,'2026-09-07',2),
    ('airpods-4','Esteban D.',5,'El diseño nuevo calza mejor en la oreja que los de tercera. Se sienten más firmes.','',false,'2026-08-27',3),
    ('airpods-4','Rocío T.',5,'El audio adaptativo funciona bien en la micro, baja el ruido solo.','',false,'2026-08-16',4),
    ('airpods-4','Carolina H.',5,'Compré diez para revender y llegaron todos sellados. Buen precio por volumen.','',false,'2026-08-05',5),
    ('airpods-4','Mauricio L.',5,'Se conectan al iPhone al instante. Cero configuración, funcionó al abrir la caja.','',false,'2026-07-25',6),
    ('airpods-4','Belén A.',5,'Uso el estuche todo el día y el sonido de llamadas se escucha claro del otro lado.','',false,'2026-07-14',7),
    ('airpods-4','Franco P.',5,'Llegaron a Antofagasta en cuatro días. Buen seguimiento del envío.','',false,'2026-07-02',8),
    ('airpods-4','Cristóbal Z.',5,'Los tengo hace tres meses y siguen igual que el primer día. Buena compra.','',false,'2026-06-20',9),
    ('airpods-4','Amanda V.',5,'Me asesoraron bien para elegir entre estos y los Pro. Quedé contenta con la elección.','',false,'2026-06-07',10),
    ('airpods-4','Lorena Í.',5,'Se emparejan con el iPad y el Mac sin tocar nada. Muy cómodo para trabajar.','',false,'2026-05-25',11),
    ('airpods-4','Teresa O.',5,'Cumplen de sobra para el día a día. Los uso desde que me levanto.','',false,'2026-05-12',12),
    ('airpods-4','Pablo M.',4,'Muy buenos 👌','',false,'2026-04-29',13),
    ('airpods-4','Dominga C.',4,'Buen sonido y cómodos.','',false,'2026-04-15',14),
    ('airpods-4','Simón B.',4,'Recomendados 👍','',false,'2026-03-30',15),
    ('airpods-4','Julián W.',4,'Buenos audífonos ✅','',false,'2026-03-12',16),
    ('airpods-4','Marcos H.',4,'Muy buena relación precio calidad.','',false,'2026-02-24',17),
    ('airpods-pro-2','Alain P.',5,'Excelentes audífonos. Me encantaron. El sonido es increíble y tienen un bajo bien profundo.','',false,'2026-09-20',1),
    ('airpods-pro-2','Rosemarie P.',5,'Me encantaron. Se escuchan muy bien, la cancelación de ruido funciona tal como esperaba.','',false,'2026-09-10',2),
    ('airpods-pro-2','Sebastián O.',5,'Segunda compra en la tienda. Responden rápido las dudas por WhatsApp y el envío llegó antes de lo estimado.','',false,'2026-08-30',3),
    ('airpods-pro-2','Nicole F.',5,'La cancelación de ruido en el metro es otra cosa. Se apaga el mundo.','',false,'2026-08-20',4),
    ('airpods-pro-2','Héctor G.',5,'Los uso para trabajar ocho horas y no me molestan las orejas. Muy livianos.','',false,'2026-08-10',5),
    ('airpods-pro-2','Leonardo M.',5,'Compré quince para el local y todos originales, con número de serie válido.','',false,'2026-07-31',6),
    ('airpods-pro-2','Karla S.',5,'El modo transparencia es muy útil para andar en bicicleta y escuchar el tráfico.','',false,'2026-07-21',7),
    ('airpods-pro-2','Óscar T.',5,'Llegaron en 24 horas a Santiago centro. Increíble la rapidez.','',false,'2026-07-10',8),
    ('airpods-pro-2','Michelle A.',5,'El audio espacial en películas se siente envolvente de verdad, no es puro marketing.','',false,'2026-06-29',9),
    ('airpods-pro-2','Gabriela N.',5,'Es el producto que más vendo. Siempre hay stock cuando lo pido.','',false,'2026-06-18',10),
    ('airpods-pro-2','Nelson V.',5,'Buen precio, producto original y envío rápido. Nada más que pedir.','',false,'2026-06-06',11),
    ('airpods-pro-2','Fabiola R.',5,'Vienen tres tamaños de gomita. Con las medianas quedó perfecto y no se caen.','',false,'2026-05-24',12),
    ('airpods-pro-2','Arturo É.',5,'El estuche avisa la batería en el teléfono. Detalle chico que se agradece.','',false,'2026-05-11',13),
    ('airpods-pro-2','Ninoska B.',5,'Los pedí para regalo y llegaron a tiempo para el cumpleaños. Gracias por la rapidez.','',false,'2026-04-27',14),
    ('airpods-pro-2','Wilson D.',5,'El estuche con parlante para encontrarlos es una idea genial. Ya lo usé dos veces.','',false,'2026-04-13',15),
    ('airpods-pro-2','Solange R.',5,'Los mejores que he tenido. Los uso en avión y se nota muchísimo la diferencia.','',false,'2026-03-29',16),
    ('airpods-pro-2','Rubén C.',4,'Cumplen todo 🔥','',false,'2026-03-15',17),
    ('airpods-pro-2','Estefanía L.',4,'Suenan excelente 👍','',false,'2026-02-26',18);
  end if;
end $$;


-- ###########################################################################
-- ##  acceso-admin.sql
-- ###########################################################################

-- ============================================================================
--  Quién puede escribir en el panel
--  ----------------------------------------------------------------------------
--  Sin esto, CUALQUIER usuario registrado puede editar el catálogo. Con esto,
--  solo los correos de la lista.
--
--  PASO 1 · Poné los correos que tienen permiso, entre comillas y separados
--           por coma. El tuyo y el del cliente. TODO EN MINÚSCULAS: Supabase
--           guarda los correos así, y la comparación distingue mayúsculas.
--  PASO 2 · Pegá todo en Supabase → SQL Editor → Run.
--
--  Para sumar o sacar a alguien después, cambiás la lista y volvés a correrlo.
-- ============================================================================

create or replace function public.es_admin()
returns boolean language sql stable as $$
  select lower(auth.jwt() ->> 'email') in (
    'adpp23777@gmail.com'
  );
$$;

drop policy if exists "products auth write"  on public.products;
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all to authenticated using ( public.es_admin() ) with check ( public.es_admin() );

drop policy if exists "tiers auth write"  on public.price_tiers;
drop policy if exists "tiers admin write" on public.price_tiers;
create policy "tiers admin write" on public.price_tiers
  for all to authenticated using ( public.es_admin() ) with check ( public.es_admin() );

drop policy if exists "site_config auth write"  on public.site_config;
drop policy if exists "site_config admin write" on public.site_config;
create policy "site_config admin write" on public.site_config
  for all to authenticated using ( public.es_admin() ) with check ( public.es_admin() );

drop policy if exists "site-images auth write"   on storage.objects;
drop policy if exists "site-images auth update"  on storage.objects;
drop policy if exists "site-images auth delete"  on storage.objects;
drop policy if exists "site-images admin write"  on storage.objects;
create policy "site-images admin write" on storage.objects
  for all to authenticated
  using      ( bucket_id = 'site-images' and public.es_admin() )
  with check ( bucket_id = 'site-images' and public.es_admin() );

-- La lectura pública no se toca: el catálogo y las imágenes siguen a la vista
-- de cualquier visitante, que es lo que tiene que pasar en una tienda.

