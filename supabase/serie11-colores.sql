update public.products set
  image   = 'images/serie11black.webp',
  gallery = array[]::text[],
  colors  = '[
    {"name":"Negro", "hex":"#1A1A1A", "img":"images/serie11black.webp", "swatch":"images/miniblack11.webp"},
    {"name":"Oro",   "hex":"#E3C08D", "img":"images/serie11oro.webp",   "swatch":"images/minioro.webp"},
    {"name":"Gris",  "hex":"#8E8E93", "img":"images/grisserie11.webp",  "swatch":"images/miniserie11gris.webp"}
  ]'::jsonb
where slug = 'apple-watch-serie-10';

update public.reviews set color = case name
    when 'Daniela M.'   then 'Negro'
    when 'Antonia G.'   then 'Gris'
    when 'Matías O.'    then 'Oro'
    when 'Francisca D.' then 'Negro'
    when 'Valeria N.'   then 'Gris'
    when 'Diego T.'     then 'Negro'
    when 'Macarena Q.'  then 'Oro'
    when 'Álvaro J.'    then 'Gris'
    when 'Gonzalo Y.'   then 'Negro'
    when 'Camila Ñ.'    then 'Oro'
    when 'Isidora K.'   then 'Gris'
    when 'Sebastián I.' then 'Negro'
    when 'Bárbara U.'   then 'Oro'
    when 'Renato W.'    then 'Gris'
    else color end
where product_slug = 'apple-watch-serie-10';

select slug, name, image, jsonb_array_length(coalesce(colors,'[]'::jsonb)) as colores
from public.products where slug = 'apple-watch-serie-10';
