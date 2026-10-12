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
