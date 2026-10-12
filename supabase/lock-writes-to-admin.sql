-- ============================================================================
--  Endurecer seguridad: que SOLO tu usuario admin pueda escribir
--  (aunque alguien logre registrarse/loguearse, no podrá editar nada).
--
--  1) Reemplazá  TU-EMAIL-ADMIN@ejemplo.com  por el email de tu usuario admin.
--  2) Ejecutá todo en Supabase → SQL Editor.
-- ============================================================================

-- ── products ──
drop policy if exists "products auth write"  on public.products;
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'TU-EMAIL-ADMIN@ejemplo.com' )
  with check ( (auth.jwt() ->> 'email') = 'TU-EMAIL-ADMIN@ejemplo.com' );

-- ── price_tiers ──
drop policy if exists "tiers auth write"  on public.price_tiers;
drop policy if exists "tiers admin write" on public.price_tiers;
create policy "tiers admin write" on public.price_tiers
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'TU-EMAIL-ADMIN@ejemplo.com' )
  with check ( (auth.jwt() ->> 'email') = 'TU-EMAIL-ADMIN@ejemplo.com' );

-- ── storage (subida de imágenes) ──
drop policy if exists "site-images auth write"  on storage.objects;
drop policy if exists "site-images auth update" on storage.objects;
drop policy if exists "site-images auth delete" on storage.objects;
drop policy if exists "site-images admin write" on storage.objects;
create policy "site-images admin write" on storage.objects
  for all to authenticated
  using      ( bucket_id = 'site-images' and (auth.jwt() ->> 'email') = 'TU-EMAIL-ADMIN@ejemplo.com' )
  with check ( bucket_id = 'site-images' and (auth.jwt() ->> 'email') = 'TU-EMAIL-ADMIN@ejemplo.com' );

-- La lectura pública (select) NO se toca: el catálogo y las imágenes siguen visibles para todos.
