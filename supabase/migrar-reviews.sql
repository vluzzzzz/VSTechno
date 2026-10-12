insert into public.reviews (product_slug, name, stars, text, color, verified, fecha, position)
select
  r->>'product',
  coalesce(r->>'name', ''),
  coalesce(nullif(r->>'stars','')::int, 5),
  coalesce(r->>'text', ''),
  coalesce(r->>'color', ''),
  coalesce(nullif(r->>'verified','')::boolean, false),
  coalesce(nullif(r->>'date','')::date, current_date),
  (row_number() over ())::int
from public.site_config sc,
     lateral jsonb_array_elements(sc.value) as r
where sc.key = 'reviews'
  and jsonb_typeof(sc.value) = 'array'
  and not exists (select 1 from public.reviews);
