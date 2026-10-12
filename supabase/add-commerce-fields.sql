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
