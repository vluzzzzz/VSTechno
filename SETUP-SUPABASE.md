# Setup Supabase + Admin (reemplazo del Excel)

La tienda ya no se configura desde el Google Sheet: ahora todo sale de **Supabase**
y se administra desde **`/admin`**. Seguí estos pasos una sola vez.

## 1. Crear el proyecto
1. Entrá a https://supabase.com → **New project**.
2. Anotá la contraseña de la base (no hace falta para esto, pero guardala).

## 2. Crear las tablas y el storage
1. En el panel: **SQL Editor → New query**.
2. Pegá TODO el contenido de [`supabase/schema.sql`](supabase/schema.sql) y dale **Run**.
   - Crea las tablas `products` y `price_tiers`, el bucket `site-images`,
     las políticas de seguridad (lectura pública, escritura solo logueado)
     y carga los 11 productos actuales con sus precios.

## 3. Crear el usuario admin
1. **Authentication → Users → Add user** → poné tu email y una contraseña.
2. **Authentication → Providers → Email**: desactivá *"Confirm email"*
   (así el usuario entra sin tener que verificar el correo).

## 4. Conectar el sitio
1. **Settings → API**: copiá **Project URL** y **anon public key**.
2. Pegalas en [`js/supabase-config.js`](js/supabase-config.js):
   ```js
   window.SUPABASE_URL = 'https://xxxxx.supabase.co';
   window.SUPABASE_ANON_KEY = 'eyJhbGci...';   // anon public (es pública, va al front)
   ```
3. Subí el cambio (commit + push) para que Vercel lo tome.

## 5. Listo
- La web (`/`) carga el catálogo desde Supabase.
- El panel (`/admin`) pide login y permite crear/editar/eliminar productos,
  precios por cantidad, stock, categoría, imágenes (se suben a Supabase),
  características, galería y colores.

---

### Notas
- La **anon key es pública** y segura de exponer: la seguridad la dan las políticas
  RLS (cualquiera puede leer el catálogo; solo un usuario logueado puede escribir).
- Para que un producto salga en el **carrusel de destacados** o en el **hero**,
  abrí su sección *"Características, imágenes y colores"* y activá los toggles
  *"En carrusel Destacados"* / *"En el hero principal"*.
- El sistema de **Temporadas + Flyers** del panel de referencia quedó para una
  fase 2 (no está incluido todavía).
