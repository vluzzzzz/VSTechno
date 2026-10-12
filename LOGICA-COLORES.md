# Lógica de variantes de color (replicable)

Documenta **toda** la lógica del sistema de colores: los **iconos/dots de color** en
las cards del catálogo, el **selector de color** dentro del modal de producto, la
**advertencia obligatoria** (si tocás "Pagar"/"Agregar" sin elegir color, te avisa y
no te deja), y cómo el color **se guarda en el carrito**.

> En este proyecto solo **AirPods Max** (`max-1-1`) y las correas tienen colores. La
> regla es automática: **cualquier producto cuyo `featureKey` esté en `_COLOR_VARIANTS`
> activa todo este sistema**. Si querés que SOLO los Max tengan colores, definí solo esa
> entrada en `_COLOR_VARIANTS` y listo — el resto de productos no muestran colores.

Archivos involucrados: `js/x0.js` (datos + modal + validación), `js/m/cart.js`
(carrito), `style.css` (estilos), `index.html` (bloque del selector).

---

## 1. Modelo de datos — `_COLOR_VARIANTS` (en `js/x0.js`)

Objeto keyed por `featureKey`. Cada color es un objeto con 5 campos:

```js
var _COLOR_VARIANTS = {
  'max-1-1': [
    { name: 'Midnight',  hex: '#1A1A1A', img: './images/max-negros.webp',  swatch: './images/black.png',     thumb: './images/miblack.webp' },
    { name: 'Starlight', hex: '#F5F0E8', img: './images/max-blanco.webp',  swatch: './images/starlight.png', thumb: './images/miblanco.webp' },
    { name: 'Orange',    hex: '#F26513', img: './images/max-naranja.webp', swatch: './images/orange.png',    thumb: './images/miorange.webp' },
    { name: 'Purple',    hex: '#9B59B6', img: './images/max-morado.webp',  swatch: './images/purple.webp',   thumb: './images/mipurple.webp' },
    { name: 'Blue',      hex: '#3498DB', img: './images/max-azul.webp',    swatch: './images/blue.png',      thumb: './images/miblue.webp' }
  ]
  // ...otros productos con color (correas, etc.). Para "solo Max", dejá solo max-1-1.
};
```

| Campo    | Para qué sirve |
|----------|----------------|
| `name`   | Nombre del color (se muestra en "Color: X" y en el carrito) |
| `hex`    | Color de respaldo si no hay `swatch` (se pinta el círculo con este color) |
| `img`    | **Imagen grande** del producto en ese color (la que se ve en el modal) |
| `swatch` | El **iconito/dot** redondo de color (el que se toca para elegir) |
| `thumb`  | Miniatura chica (para el carrito) |

---

## 2. Los dots de color en las cards del catálogo

En `_renderCatalogo()` (`js/x0.js`), si el producto tiene variantes se arman los dots:

```js
var cv = _COLOR_VARIANTS[p.featureKey];
var colorDotsHtml = '';
if (cv) {
  colorDotsHtml = '<div class="card-colors">' + cv.map(function (v) {
    return '<span class="card-color-dot">' + (v.swatch
      ? '<img src="' + v.swatch + '" alt="' + v.name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
      : '<span style="display:block;width:100%;height:100%;border-radius:50%;background:' + v.hex + '"></span>')
      + '</span>';
  }).join('') + '</div>';
}
// ...se inserta dentro de .card-price-row de la card
```

CSS:
```css
.card-colors { display:flex; flex-wrap:wrap; gap:5px; margin-left:auto; justify-content:flex-end; }
.card-color-dot { width:14px; height:14px; border-radius:50%; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
```

---

## 3. El selector de color dentro del modal de producto (ppage)

### HTML (en `index.html`, dentro de `#ppage`)
```html
<div class="ppage-colors" id="ppageColors" style="display:none">
  <span class="ppage-colors-label">Color: <span id="ppageColorName"></span></span>
  <div class="ppage-colors-row" id="ppageColorsRow"></div>
  <span class="ppage-color-hint" id="ppageColorHint">Selecciona tu color</span>
</div>
```

### Estado del modal (variables en `ProductModal`, `js/x0.js`)
```js
var imgIndex = 0, imgList = [], isTemp = false, _colorPicked = false, _awaitingColorConfirm = false;
```

### Render de los swatches — `renderColors(key)`
```js
function renderColors(key) {
  var wrap = document.getElementById('ppageColors');
  var row = document.getElementById('ppageColorsRow');
  var vars = _COLOR_VARIANTS[key];
  if (!wrap || !row) return;
  if (!vars) { wrap.style.display = 'none'; return; }   // producto sin colores → oculta el bloque
  wrap.style.display = '';
  row.innerHTML = vars.map(function (v, i) {
    return '<button class="ppage-color-swatch' + (i === imgIndex ? ' active' : '') + '" data-index="' + i + '" title="' + v.name + '" aria-label="' + v.name + '" style="' + (v.swatch ? '' : 'background:' + v.hex) + '">'
      + (v.swatch ? '<img src="' + v.swatch + '" alt="' + v.name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : '') + '</button>';
  }).join('');
  row.querySelectorAll('.ppage-color-swatch').forEach(function (s) {
    s.addEventListener('click', function () {
      if (_awaitingColorConfirm) {            // si estaba en modo "te aviso que elijas"
        _colorPicked = true;                  // ya eligió → desbloquea comprar
        _awaitingColorConfirm = false;
        var hint = document.getElementById('ppageColorHint'); if (hint) hint.classList.remove('show');
        var row = document.getElementById('ppageColorsRow'); if (row) row.classList.remove('shake');
      }
      goToImgDirectly(Number(this.dataset.index));
    });
  });
  var label = document.getElementById('ppageColorName');
  if (label && vars[imgIndex]) label.textContent = vars[imgIndex].name;
}
```

### Elegir un color cambia la imagen grande — `goToImgDirectly(ni)`
```js
function goToImgDirectly(ni) {
  if (ni === imgIndex || ni < 0 || ni >= imgList.length) return;
  imgIndex = ni;
  document.getElementById('ppageImg').src = imgList[ni];                 // imagen grande del color
  var scales = _IMG_SCALES[currentProduct.featureKey] || [1, 1, 1];
  document.getElementById('ppageImgWrap').style.setProperty('--ppage-img-scale', scales[ni] || 1);
  renderDots();
  _updateColorActive();
  var vars = _COLOR_VARIANTS[currentProduct.featureKey];
  if (vars && vars[ni]) { currentProduct.image = vars[ni].img; currentProduct.thumb = vars[ni].thumb; }
  var b = document.getElementById('ppageImgNext'); if (b) b.classList.add('hidden');
}
```

### Marcar el swatch activo + nombre — `_updateColorActive()`
```js
function _updateColorActive() {
  var row = document.getElementById('ppageColorsRow');
  if (!row) return;
  row.querySelectorAll('.ppage-color-swatch').forEach(function (s, i) { s.classList.toggle('active', i === imgIndex); });
  var label = document.getElementById('ppageColorName');
  var vars = _COLOR_VARIANTS[currentProduct && currentProduct.featureKey] || [];
  if (label && vars[imgIndex]) label.textContent = vars[imgIndex].name;
}
```

### Navegación por color (no por carrusel) — `_isColorNav()`
Para los productos con color, las flechas/dots de la galería normal se ocultan: la
navegación de imágenes se hace **con los swatches**.
```js
function _isColorNav() {
  if (!currentProduct) return false;
  return !!_COLOR_VARIANTS[currentProduct.featureKey];
}
// renderDots(): if (_isColorNav()) { w.innerHTML = ''; return; }
// updateArrow(): b.classList.toggle('hidden', _isColorNav() || ...);
// goToImg(): if (_isColorNav()) return;
```

---

## 4. La advertencia obligatoria (lo del "cosito" al pagar)

### ¿Necesita elegir color? — `_needsColor()`
```js
function _needsColor() {
  if (!currentProduct) return false;
  var vars = _COLOR_VARIANTS[currentProduct.featureKey];
  return vars && !_colorPicked;   // tiene colores Y todavía no eligió
}
```

### La sacudida + cartel — `_shakeColor()`
```js
function _shakeColor() {
  _awaitingColorConfirm = true;
  var row = document.getElementById('ppageColorsRow');
  var hint = document.getElementById('ppageColorHint');
  if (row) { row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); } // reinicia la animación
  if (hint) hint.classList.add('show');   // muestra "Selecciona tu color" en rojo
}
```

### Los 3 botones (Agregar / Pagar MP / WhatsApp) — TODOS validan primero
```js
// WhatsApp
document.getElementById('ppageWaBtn').addEventListener('click', function () {
  if (!currentProduct) return;
  if (_needsColor()) { _shakeColor(); return; }   // ⛔ no deja seguir sin color
  // ...arma el mensaje (incluye "Color: X") y abre wa.me
});

// Agregar al carrito
document.getElementById('ppageCartBtn').addEventListener('click', function () {
  if (!currentProduct) return;
  if (_needsColor()) { _shakeColor(); return; }   // ⛔
  Cart.setItem(_buildCartItem());
  // ...feedback visual (check) en el botón
});

// Pagar con Mercado Pago
document.getElementById('ppageMpBtn').addEventListener('click', function () {
  if (!currentProduct) return;
  if (_needsColor()) { _shakeColor(); return; }   // ⛔
  Cart.setItem(_buildCartItem());
  window._ppageCheckout = true;
  if (window.Checkout) window.Checkout.open();
});
```

### Reset al abrir cada producto — en `populate(card)`
```js
isTemp = false;
_colorPicked = false;        // arranca sin color elegido
_awaitingColorConfirm = false;
```

**Flujo de la advertencia:**
1. Abrís un producto con colores → `_colorPicked = false`.
2. Tocás **Agregar/Pagar/WhatsApp** sin elegir → `_needsColor()` true → `_shakeColor()`:
   los swatches se **sacuden** (borde rojo) y aparece **"Selecciona tu color"**.
3. Tocás un swatch → `_colorPicked = true`, se limpia el cartel y la sacudida.
4. Volvés a tocar el botón → ahora sí agrega/paga (con el color elegido).

---

## 5. Integración con el carrito

### Clave única por color — `_cartKey()`
Cada color es una **línea distinta** en el carrito (key = `featureKey::imgIndex`):
```js
function _cartKey() {
  if (!currentProduct) return '';
  var vars = _COLOR_VARIANTS[currentProduct.featureKey];
  return vars ? currentProduct.featureKey + '::' + imgIndex : currentProduct.featureKey;
}
```

### Armar el item del carrito — `_buildCartItem()`
```js
function _buildCartItem(oQty) {
  var vars = _COLOR_VARIANTS[currentProduct.featureKey];
  var ci = vars && vars[imgIndex];
  var img = ci ? (ci.img || ci.thumb || currentProduct.image) : currentProduct.image;
  return {
    key: _cartKey(),
    name: currentProduct.name,
    price: currentProduct.price,
    rawPrice: currentProduct.rawPrice,
    image: img,
    colorName: ci ? ci.name : '',   // ← el color elegido viaja al carrito
    qty: oQty || qty
  };
}
```

### En `js/m/cart.js` — guardar y mostrar el color
```js
// setItem / addItem guardan colorName:
state.cart.push({ key: key, name: product.name, price: product.price, rawPrice: product.rawPrice,
                  image: product.image, colorName: product.colorName || '', qty: product.qty || 1 });

// Render del item: muestra el color como chip al lado del nombre
'<p class="cart-item-name">' + item.name +
  (item.colorName ? ' <span class="cart-item-color">' + item.colorName + '</span>' : '') + '</p>'
```

El `colorName` también viaja al checkout (Mercado Pago / WhatsApp / email del pedido).

---

## 6. CSS (todo lo de colores)

```css
/* dots en la card del catálogo */
.card-colors { display:flex; flex-wrap:wrap; gap:5px; margin-left:auto; justify-content:flex-end; }
.card-color-dot { width:14px; height:14px; border-radius:50%; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }

/* selector dentro del modal */
.ppage-colors { display:flex; flex-direction:column; gap:8px; margin-top:-8px; }
.ppage-colors-label { font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; color:#6e6e73; }
.ppage-colors-label span { color:#111; font-weight:600; }
.ppage-colors-row { display:flex; gap:10px; flex-wrap:wrap; }
.ppage-color-swatch { width:32px; height:32px; border-radius:50%; border:2px solid transparent; cursor:pointer; padding:0; outline:none; overflow:hidden; transition:transform .2s cubic-bezier(.34,1.56,.64,1), border-color .2s, box-shadow .2s; }
.ppage-color-swatch:hover { transform:scale(1.15); }
.ppage-color-swatch.active { border-color:rgba(0,0,0,0.15); border-width:1.5px; }

/* cartel de advertencia + sacudida */
.ppage-color-hint { display:none; font-size:12px; font-weight:600; color:#ff3b30; margin-top:6px; }
.ppage-color-hint.show { display:block; }
@keyframes shakeColor {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
.ppage-colors-row.shake { animation: shakeColor 0.5s ease; border:1.5px solid #ff3b30; border-radius:12px; padding:6px; margin:-6px; }

/* chip de color en el carrito */
.cart-item-color { display:inline-block; background:rgba(0,0,0,.05); border-radius:6px; padding:1px 6px; font-size:10px; font-weight:600; color:#6e6e73; }
```

---

## 7. Resumen del flujo completo
1. **Catálogo:** la card muestra los **dots** (swatch de cada color) leídos de `_COLOR_VARIANTS[featureKey]`.
2. **Modal:** al abrir un producto, `renderColors()` dibuja los swatches; si no tiene colores, oculta el bloque. La galería normal se desactiva (`_isColorNav`) y se navega por color.
3. **Elegir color:** click en swatch → `goToImgDirectly()` cambia la imagen grande + marca el activo + actualiza "Color: X".
4. **Obligatorio:** los botones Agregar/Pagar/WhatsApp hacen `if (_needsColor()) { _shakeColor(); return; }` → sin color, **sacude + cartel rojo "Selecciona tu color"** y no avanza.
5. **Carrito:** al agregar, el item lleva `colorName` y una `key` única por color (`featureKey::imgIndex`); se muestra el color como chip y viaja al checkout/WhatsApp/email.

## 8. Cómo limitarlo a "solo Max"
En `_COLOR_VARIANTS` dejá **únicamente** la entrada del Max (`'max-1-1': [...]`). Todo el
sistema (dots, selector, advertencia, carrito por color) se activa solo para los
`featureKey` presentes ahí; el resto de productos quedan sin colores y sin advertencia.
