insert into public.products
  (slug, name, category, description, image, image_scale, in_stock, features, colors, position)
values
  ('iphone-18-pro-max-256', 'iPhone 18 Pro Max 256 GB', 'celulares',
   'iPhone 18 Pro Max de 256 GB. Pantalla Super Retina XDR, sistema de cámaras Pro y el chip más potente de Apple.',
   'images/iphone18.webp', 0.75, true,
   array['256 GB de almacenamiento','Pantalla Super Retina XDR','Sistema de cámaras Pro','Chip de última generación'],
   '[]'::jsonb, 99)
on conflict (slug) do update set
  name        = excluded.name,
  category    = excluded.category,
  description = excluded.description,
  image       = excluded.image,
  features    = excluded.features,
  colors      = excluded.colors;

update public.products set gallery = array['images/iphone18dos.webp']
where slug = 'iphone-18-pro-max-256';

delete from public.price_tiers
where product_id in (select id from public.products where slug = 'iphone-18-pro-max-256');

insert into public.price_tiers (product_id, qty, price, active)
select p.id, t.qty, t.price, true
from public.products p
join (values ('iphone-18-pro-max-256', 1, 1150000)) as t(slug, qty, price)
  on t.slug = p.slug;

select pr.slug, pr.name, pr.category, pr.image, pr.gallery,
       (select count(*) from public.price_tiers pt where pt.product_id = pr.id) as tramos
from public.products pr where pr.slug = 'iphone-18-pro-max-256';
