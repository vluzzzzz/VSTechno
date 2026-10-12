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
