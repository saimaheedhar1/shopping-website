/* ─── Configuration ──────────────────────────────────────────────────────── */
const API_BASE   = window.ENV_API_URL || '/api';
const SESSION_ID = (() => {
  let id = localStorage.getItem('shop_session');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('shop_session', id); }
  return id;
})();

/* ─── State ──────────────────────────────────────────────────────────────── */
let cart       = [];
let products   = [];
let activeCategory = 'All';

/* ─── API Helpers ────────────────────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': SESSION_ID,
      ...(opts.headers || {}),
    },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
  return res.json();
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ─── Cart ───────────────────────────────────────────────────────────────── */
function renderCart() {
  const itemsEl  = document.getElementById('cart-items');
  const totalEl  = document.getElementById('cart-total');
  const badgeEl  = document.getElementById('cart-badge');
  const totalCount = cart.reduce((s, i) => s + i.quantity, 0);

  badgeEl.textContent = totalCount;
  badgeEl.classList.toggle('visible', totalCount > 0);

  if (!cart.length) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p>Your cart is empty</p>
      </div>`;
    totalEl.textContent = '$0.00';
    return;
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  totalEl.textContent = `$${total.toFixed(2)}`;

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.productId}">
      <img src="${item.image_url}" alt="${item.name}" loading="lazy">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
        <div class="cart-qty">
          <button class="qty-btn" onclick="updateQty(${item.productId}, ${item.quantity - 1})">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQty(${item.productId}, ${item.quantity + 1})">+</button>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.productId})">Remove</button>
      </div>
    </div>`).join('');
}

async function addToCart(productId) {
  try {
    cart = await apiFetch('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    renderCart();
    toast('Added to cart!');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function updateQty(productId, quantity) {
  try {
    cart = await apiFetch(`/cart/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    renderCart();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function removeFromCart(productId) {
  try {
    cart = await apiFetch(`/cart/${productId}`, { method: 'DELETE' });
    renderCart();
    toast('Item removed', 'info');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function loadCart() {
  try { cart = await apiFetch('/cart'); renderCart(); } catch { /* ignore */ }
}

/* ─── Cart Sidebar ───────────────────────────────────────────────────────── */
function openCart()  {
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-sidebar').classList.add('open');
}
function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-sidebar').classList.remove('open');
}

/* ─── Product Detail Modal ───────────────────────────────────────────────── */
function openProductModal(product) {
  document.getElementById('modal-img').src       = product.image_url;
  document.getElementById('modal-img').alt       = product.name;
  document.getElementById('modal-category').textContent = product.category;
  document.getElementById('modal-name').textContent     = product.name;
  document.getElementById('modal-price').textContent    = `$${parseFloat(product.price).toFixed(2)}`;
  document.getElementById('modal-desc').textContent     = product.description;
  document.getElementById('modal-add-btn').onclick = () => {
    addToCart(product.id);
    closeModal('product-modal');
  };
  document.getElementById('product-modal').classList.add('open');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ─── Product Cards ──────────────────────────────────────────────────────── */
function renderProductCard(p) {
  return `
    <div class="product-card" onclick="openProductModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">
      <img src="${p.image_url}" alt="${p.name}" loading="lazy">
      <div class="product-card-body">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-description">${p.description?.substring(0, 80)}...</div>
        <div class="product-footer">
          <span class="product-price">$${parseFloat(p.price).toFixed(2)}</span>
          <button class="btn-add" onclick="event.stopPropagation(); addToCart(${p.id})">Add to Cart</button>
        </div>
      </div>
    </div>`;
}

function renderSkeletons(n = 8) {
  return Array.from({ length: n }, () => `
    <div class="product-card">
      <div class="skeleton" style="height:200px;border-radius:0"></div>
      <div class="product-card-body" style="display:flex;flex-direction:column;gap:.75rem">
        <div class="skeleton" style="height:14px;width:60%"></div>
        <div class="skeleton" style="height:18px;width:85%"></div>
        <div class="skeleton" style="height:12px;width:95%"></div>
        <div class="skeleton" style="height:12px;width:70%"></div>
        <div style="display:flex;justify-content:space-between">
          <div class="skeleton" style="height:22px;width:60px"></div>
          <div class="skeleton" style="height:34px;width:90px;border-radius:8px"></div>
        </div>
      </div>
    </div>`).join('');
}

/* ─── Fetch & Display Products ───────────────────────────────────────────── */
async function fetchProducts(params = {}) {
  const grid = document.getElementById('product-grid');
  const count = document.getElementById('product-count');
  grid.innerHTML = renderSkeletons();

  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();

  try {
    const data = await apiFetch(`/products${qs ? '?' + qs : ''}`);
    products = data.products;
    count.textContent = `${data.total} product${data.total !== 1 ? 's' : ''}`;

    if (!products.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:3rem 0">No products found.</p>';
      return;
    }
    grid.innerHTML = products.map(renderProductCard).join('');
  } catch (e) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--danger)">Failed to load products: ${e.message}</p>`;
  }
}

/* ─── Category Filters ───────────────────────────────────────────────────── */
async function loadCategories() {
  try {
    const categories = await apiFetch('/products/categories');
    const filtersEl = document.getElementById('category-filters');
    const all = document.querySelector('.filter-btn[data-cat="All"]');
    if (all) all.classList.add('active');

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      btn.onclick = () => filterByCategory(cat);
      filtersEl.appendChild(btn);
    });
  } catch { /* ignore */ }
}

function filterByCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  fetchProducts(cat === 'All' ? {} : { category: cat });
}

/* ─── Search ─────────────────────────────────────────────────────────────── */
function setupSearch() {
  const form = document.getElementById('search-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('search-input').value.trim();
    fetchProducts(q ? { search: q } : {});
  });
}

/* ─── Checkout ───────────────────────────────────────────────────────────── */
function openCheckout() {
  if (!cart.length) { toast('Your cart is empty', 'error'); return; }
  closeCart();

  const items = cart.map(i => ({...i}));
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const summaryEl = document.getElementById('checkout-summary');
  summaryEl.innerHTML = items.map(i =>
    `<div class="checkout-summary-row"><span>${i.name} ×${i.quantity}</span><span>$${(i.price*i.quantity).toFixed(2)}</span></div>`
  ).join('') + `<div class="checkout-summary-row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>`;

  document.getElementById('checkout-modal').classList.add('open');
}

async function submitOrder() {
  const email = document.getElementById('checkout-email').value.trim();
  const name  = document.getElementById('checkout-name').value.trim();
  if (!name || !email) { toast('Please fill all fields', 'error'); return; }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  try {
    const order = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({ items: cart, email, total }),
    });

    // Clear cart
    await apiFetch('/cart', { method: 'DELETE' });
    cart = [];
    renderCart();

    // Show success
    document.getElementById('checkout-form-body').style.display = 'none';
    const success = document.getElementById('checkout-success');
    success.style.display = 'block';
    document.getElementById('order-id').textContent = order.id;
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ─── Init ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  loadCategories();
  fetchProducts();
  setupSearch();
});
