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
