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
