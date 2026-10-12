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
