'use strict';

const sb = window.sb;
const BUCKET = 'site-images';
const CATS = [
  ['audifonos','Audífonos'],
  ['smartwatch','Smartwatch'],
  ['celulares','Celulares'],
  ['cargadores','Cargadores'],
];

const $ = (s, r = document) => r.querySelector(s);
const fmt = n => '$' + Number(n || 0).toLocaleString('es-AR');
const escH = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function slugify(str){
  return String(str).toLowerCase().trim()
    .replace(/[áä]/g,'a').replace(/[éë]/g,'e').replace(/[íï]/g,'i')
    .replace(/[óö]/g,'o').replace(/[úü]/g,'u').replace(/ñ/g,'n')
    .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');
}
function rid(){ return Math.random().toString(36).slice(2,6); }

let toastT = null;
function toast(msg, isErr){
  const t = $('#toast');
  t.innerHTML = (isErr ? '⚠️ ' : '✓ ') + escH(msg);
  t.classList.toggle('err', !!isErr);
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

let products = [];           
const work = new Map();      

async function boot(){
  if (!sb) {                      
    $('#notConfigured').classList.remove('hidden');
    $('#login').classList.add('hidden');
    return;
  }
  const { data:{ session } } = await sb.auth.getSession();
  if (session) showApp(); else showLogin();

  $('#loginForm').addEventListener('submit', onLogin);
  $('#logoutBtn').addEventListener('click', async () => {
    await sb.auth.signOut();
    showLogin();
  });
  $('#createBtn').addEventListener('click', createProduct);
  $('#newName').addEventListener('keydown', e => { if (e.key === 'Enter') createProduct(); });
}

function showLogin(){ $('#login').classList.remove('hidden'); $('#app').classList.add('hidden'); }
function showApp(){
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  loadProducts();
  // Las otras pestañas viven en js/as.js, que se carga después.
  if (typeof Secciones !== 'undefined') Secciones.init().catch(e => console.error('Secciones:', e));
  if (typeof Pedidos !== 'undefined') Pedidos.init();
  if (typeof Resenas !== 'undefined') Resenas.init();
}

async function onLogin(e){
  e.preventDefault();
  const btn = $('#loginBtn'), err = $('#loginErr');
  err.textContent = '';
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
  const { error } = await sb.auth.signInWithPassword({
    email: $('#loginEmail').value.trim(),
    password: $('#loginPass').value,
  });
  btn.disabled = false; btn.textContent = 'Entrar';
  if (error) { err.textContent = 'No se pudo entrar: ' + error.message; return; }
  showApp();
}


async function loadProducts(){
  const list = $('#list');
  list.innerHTML = '<div class="empty">Cargando productos…</div>';
  const { data, error } = await sb
    .from('products')
    .select('*, price_tiers(id,qty,price,active)')
    .order('position', { ascending: true });
  if (error) { list.innerHTML = '<div class="empty">Error: ' + escH(error.message) + '</div>'; return; }
  products = data || [];
  work.clear();
  if (!products.length) { list.innerHTML = '<div class="empty">Todavía no hay productos. Creá el primero arriba.</div>'; return; }
  list.innerHTML = '';
  products.forEach(p => list.appendChild(buildCard(p)));
}

