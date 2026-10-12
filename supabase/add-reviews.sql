create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  product_slug text not null,
  name         text not null default '',
  stars        int  not null default 5 check (stars between 1 and 5),
  text         text not null default '',
  color        text default '',
  verified     boolean not null default false,
  images       jsonb not null default '[]',
  fecha        date not null default current_date,
  position     int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists reviews_slug on public.reviews (product_slug, position);

alter table public.reviews enable row level security;

drop policy if exists "reviews lee todos" on public.reviews;
create policy "reviews lee todos" on public.reviews
  for select to anon, authenticated using ( true );

drop policy if exists "reviews admin write" on public.reviews;
create policy "reviews admin write" on public.reviews
  for all to authenticated using ( public.es_admin() ) with check ( public.es_admin() );
