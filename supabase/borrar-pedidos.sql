-- ============================================================================
--  Permitir borrar pedidos desde el panel
--  ----------------------------------------------------------------------------
--  add-orders.sql a proposito NO dejaba borrar a nadie. Con esto, los correos
--  de la lista de administradores pueden eliminar un pedido desde la pestaña
--  Pedidos.
--
--  Pegá todo en Supabase → SQL Editor → Run.
--
--  OJO: un pedido borrado NO se recupera. Se van los datos del cliente, la
--  dirección y qué compró. El pago sigue registrado en Mercado Pago, pero acá
--  no queda nada.
-- ============================================================================

drop policy if exists "orders admin delete" on public.orders;
create policy "orders admin delete" on public.orders
  for delete to authenticated using ( public.es_admin() );
