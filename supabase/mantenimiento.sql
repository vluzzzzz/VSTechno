-- ============================================================================
--  Modo mantenimiento
--  ----------------------------------------------------------------------------
--  Una bandera que, encendida, muestra en toda la tienda un aviso y deja el
--  resto fuera de servicio. Sirve para bajar el sitio cuando hace falta, sin
--  tocar el código ni volver a desplegar.
--
--  A diferencia del resto del panel, esta bandera NO la puede cambiar
--  cualquier administrador: solo el correo dueño, el de es_owner(). Un
--  administrador común la ve, pero no la puede apagar.
--
--  PASO 1 · Poné tu correo en es_owner(), en minúsculas.
--  PASO 2 · Pegá todo en Supabase → SQL Editor → Run.
-- ============================================================================

create or replace function public.es_owner()
returns boolean language sql stable as $$
  select lower(auth.jwt() ->> 'email') = 'adpps23777@gmail.com';
$$;

create table if not exists public.app_flags (
  id       int primary key default 1,
  locked   boolean not null default false,
  mensaje  text    not null default '',
  updated_at timestamptz not null default now(),
  constraint app_flags_una_fila check (id = 1)
);

insert into public.app_flags (id, locked, mensaje)
values (1, false, '')
on conflict (id) do nothing;

alter table public.app_flags enable row level security;

-- La tienda tiene que poder leer la bandera para saber si mostrarse o no.
drop policy if exists "app_flags lectura" on public.app_flags;
create policy "app_flags lectura" on public.app_flags
  for select to anon, authenticated using ( true );

-- Escribir: solo el dueño. Ni el público ni un administrador común.
drop policy if exists "app_flags escritura" on public.app_flags;
create policy "app_flags escritura" on public.app_flags
  for update to authenticated using ( public.es_owner() ) with check ( public.es_owner() );
