-- ============================================================================
--  Imagen principal del AirPods Max → max-negros (el negro), en vez de
--  max-magneticos. Afecta la grilla de productos y el carrusel de destacados.
--  Ejecutar en Supabase → SQL Editor.
-- ============================================================================

update public.products
set image = 'images/max-negros.webp'
where slug = 'airpods-max';
