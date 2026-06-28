/* ── ADMIN PANEL ─────────────────────────────────────────────── */
const ADMIN_KEY    = 'framely:admin_credentials';
const SESSION_KEY  = 'framely:admin_session';
const ORDERS_KEY   = 'framely:orders';
const USERS_KEY    = 'framely:users';
const PRODUCTS_KEY = 'framely:products';

const DEFAULT_PRESETS = [
  { id: 'classic50',  name: 'Klasik 50',  desc: '30x45 cm Poster', cols: 5,  rows: 10, gap: 4, pad: 12, orient: 'portrait', icon: '🖼️', price: 179, active: true },
  { id: 'medium96',   name: 'Orta Grid',   desc: '40x60 cm Poster', cols: 8,  rows: 12, gap: 4, pad: 14, orient: 'portrait', icon: '📏', price: 229, active: true },
  { id: 'giant140',   name: 'Dev Mozaik',  desc: '50x70 cm Poster', cols: 10, rows: 14, gap: 3, pad: 16, orient: 'portrait', icon: '🏔️', price: 269, active: true },
  { id: 'a3grid49',   name: 'A3 7x7',      desc: 'A3 Poster',       cols: 7,  rows: 7,  gap: 4, pad: 18, orient: 'portrait', icon: 'A3', price: 189, active: true },
  { id: 'mini35',     name: 'Mini Kolaj',  desc: '30x40 cm Poster', cols: 5,  rows: 7,  gap: 4, pad: 12, orient: 'portrait', icon: '📋', price: 149, active: true },
  { id: 'square36',   name: 'Kare Kolaj',  desc: '50x50 cm Poster', cols: 6,  rows: 6,  gap: 5, pad: 14, orient: 'portrait', icon: '⬜', price: 199, active: true },
  { id: 'memories49', name: 'Anı Duvarı',  desc: '40x40 cm Poster', cols: 7,  rows: 7,  gap: 4, pad: 14, orient: 'portrait', icon: '📸', price: 199, active: true },
];

/* ── STORAGE HELPERS ─────────────────────────────────────────── */
function getAdminCredentials() {
  const stored = localStorage.getItem(ADMIN_KEY);
  if (stored) return JSON.parse(stored);
  const defaults = { email: 'admin@framely.com', password: 'Admin123' };
  localStorage.setItem(ADMIN_KEY, JSON.stringify(defaults));
  return defaults;
}

function getAdminSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

function setAdminSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function clearAdminSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getOrders() {
  return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
}

function saveOrders(list) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
}

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function safeJsonArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (e) {
    return [];
  }
}

function toInt(value, fallback, min, max) {
  const parsed = parseInt(value, 10);
  const n = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Math.max(n, min), max);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function slugifyProductId(name) {
  const base = String(name || 'urun')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28) || 'urun';
  return `${base}-${Date.now()}`;
}

function normalizeProduct(product, index = 0) {
  const fallback = DEFAULT_PRESETS[index] || DEFAULT_PRESETS[0];
  const name = String(product?.name || fallback.name || 'Yeni Ürün').trim();
  return {
    id: String(product?.id || slugifyProductId(name)),
    name,
    desc: String(product?.desc || fallback.desc || 'Poster').trim(),
    cols: toInt(product?.cols, fallback.cols || 5, 1, 20),
    rows: toInt(product?.rows, fallback.rows || 7, 1, 20),
    gap: toInt(product?.gap, fallback.gap || 4, 0, 20),
    pad: toInt(product?.pad, fallback.pad || 12, 0, 40),
    orient: product?.orient === 'landscape' ? 'landscape' : 'portrait',
    icon: String(product?.icon || fallback.icon || '🖼️').trim(),
    price: toInt(product?.price, fallback.price || 149, 1, 999999),
    active: product?.active !== false,
  };
}

function getProducts() {
  const stored = localStorage.getItem(PRODUCTS_KEY);
  if (stored) {
    const parsed = safeJsonArray(PRODUCTS_KEY).map(normalizeProduct);
    if (parsed.length > 0) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(parsed));
      return parsed;
    }
  }
  const prods = DEFAULT_PRESETS.map(p => ({ ...p }));
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(prods));
  return prods;
}

function saveProducts(list) {
  const normalized = (Array.isArray(list) ? list : []).map(normalizeProduct);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(normalized));
}

/* ── STATE ───────────────────────────────────────────────────── */
let currentTab = 'dashboard';
let editingProductId = null;
let viewingOrderId = null;
let orderFilter = 'all';
let orderSearch = '';
let productSearch = '';
let userSearch = '';

/* ── TOAST ───────────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.className = `toast ${type}`;
  t.querySelector('.toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ── AUTH ────────────────────────────────────────────────────── */
function checkSession() {
  const s = getAdminSession();
  if (s && s.expiresAt > Date.now()) {
    showApp(s.email);
    return true;
  }
  clearAdminSession();
  return false;
}

function showApp(email) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'block';
  document.getElementById('headerEmail').textContent = email;
  switchTab('dashboard');
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const creds = getAdminCredentials();
  const errEl = document.getElementById('loginError');

  if (email === creds.email && pass === creds.password) {
    errEl.classList.remove('visible');
    setAdminSession({ email, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    showApp(email);
  } else {
    errEl.textContent = 'E-posta veya şifre hatalı.';
    errEl.classList.add('visible');
  }
}

function handleSignout() {
  clearAdminSession();
  document.getElementById('adminApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
}

/* ── TAB SWITCHING ───────────────────────────────────────────── */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  document.querySelectorAll('.content-pane').forEach(el => {
    el.classList.toggle('active', el.id === 'pane-' + tab);
  });
  document.getElementById('headerTitle').textContent = {
    dashboard: 'Dashboard',
    orders:    'Siparişler',
    products:  'Ürünler',
    users:     'Kullanıcılar',
    settings:  'Ayarlar',
  }[tab] || '';

  if (tab === 'dashboard') renderDashboard();
  if (tab === 'orders')    renderOrders();
  if (tab === 'products')  renderProducts();
  if (tab === 'users')     renderUsers();
}

/* ── DASHBOARD ───────────────────────────────────────────────── */
function renderDashboard() {
  const orders   = getOrders();
  const users    = getUsers();
  const products = getProducts();

  const totalRevenue = orders.reduce((s, o) => s + (o.total || o.price || 0), 0);
  const activeProds  = products.filter(p => p.active !== false).length;
  const pending      = orders.filter(o => o.status === 'Hazırlanıyor').length;

  document.getElementById('stat-orders').textContent = orders.length;
  document.getElementById('stat-revenue').textContent = totalRevenue.toLocaleString('tr-TR') + ' ₺';
  document.getElementById('stat-users').textContent = users.length;
  document.getElementById('stat-products').textContent = activeProds;
  document.getElementById('stat-pending').textContent = pending;

  // Recent orders
  const tbody = document.getElementById('recentOrdersBody');
  const recent = orders.slice(0, 8);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Henüz sipariş yok</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.userName || '—'}<div style="font-size:11px;color:var(--text-muted)">${o.userEmail || ''}</div></td>
      <td>${o.presetName || o.preset || '—'}</td>
      <td><strong>${(o.total || o.price || 0).toLocaleString('tr-TR')} ₺</strong></td>
      <td>${statusBadge(o.status)}</td>
    </tr>
  `).join('');
}

/* ── STATUS BADGE ────────────────────────────────────────────── */
function statusBadge(status) {
  const map = {
    'Hazırlanıyor': 'hazirlaniyor',
    'Baskıda':      'baskida',
    'Kargoda':      'kargoda',
    'Teslim Edildi':'teslim',
    'İptal':        'iptal',
  };
  const cls = map[status] || 'hazirlaniyor';
  return `<span class="status-badge status-${cls}">${status || 'Hazırlanıyor'}</span>`;
}

/* ── ORDERS ──────────────────────────────────────────────────── */
function renderOrders() {
  let orders = getOrders();

  // Update nav badge
  const pending = orders.filter(o => o.status === 'Hazırlanıyor').length;
  const badge = document.getElementById('orderNavBadge');
  if (badge) badge.textContent = pending || '';
  if (badge) badge.style.display = pending ? 'flex' : 'none';

  // Filter
  if (orderFilter !== 'all') {
    orders = orders.filter(o => (o.status || 'Hazırlanıyor') === orderFilter);
  }

  // Search
  if (orderSearch) {
    const q = orderSearch.toLowerCase();
    orders = orders.filter(o =>
      (o.id || '').toLowerCase().includes(q) ||
      (o.userName || '').toLowerCase().includes(q) ||
      (o.userEmail || '').toLowerCase().includes(q) ||
      (o.presetName || '').toLowerCase().includes(q)
    );
  }

  const tbody = document.getElementById('ordersBody');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Sipariş bulunamadı</div><div class="empty-desc">Filtre veya arama kriterlerini değiştirin.</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong style="font-family:monospace;font-size:12px">${o.id}</strong></td>
      <td>
        <div style="font-weight:600">${o.userName || '—'}</div>
        <div style="font-size:11px;color:var(--text-muted)">${o.userEmail || ''}</div>
      </td>
      <td>${o.presetName || o.preset || '—'}</td>
      <td><strong>${(o.total || o.price || 0).toLocaleString('tr-TR')} ₺</strong></td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${formatDate(o.createdAt)}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="openOrderDetail('${o.id}')">Detay</button>
          <button class="btn btn-ghost btn-sm" onclick="downloadOrderPdf('${o.id}')">PDF</button>
          <button class="btn btn-ghost btn-sm" onclick="quickStatusCycle('${o.id}')">Durum Seç →</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function downloadOrderPdf(orderId) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  if (!order.pdfDataUri) {
    showToast('Bu sipariş için PDF oluşturulamadı.', 'error');
    return;
  }

  const link = document.createElement('a');
  link.href = order.pdfDataUri;
  link.download = `${order.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('PDF indirildi');
}

function quickStatusCycle(orderId) {
  openOrderDetail(orderId);
  showToast('Sipariş durumunu seçin', 'info');
}

function openOrderDetail(orderId) {
  viewingOrderId = orderId;
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('orderDetailId').textContent = order.id;
  document.getElementById('orderDetailName').textContent = order.userName || '—';
  document.getElementById('orderDetailEmail').textContent = order.userEmail || '—';
  document.getElementById('orderDetailPreset').textContent = order.presetName || order.preset || '—';
  document.getElementById('orderDetailDesc').textContent = order.presetDesc || '—';
  document.getElementById('orderDetailTotal').textContent = (order.total || order.price || 0).toLocaleString('tr-TR') + ' ₺';
  document.getElementById('orderDetailCard').textContent = order.cardLast4 ? '**** ' + order.cardLast4 : '—';
  document.getElementById('orderDetailDate').textContent = formatDate(order.createdAt);

  const addr = order.address || {};
  document.getElementById('orderDetailAddress').textContent =
    [addr.address, addr.district, addr.city, addr.zip].filter(Boolean).join(', ') || '—';

  document.getElementById('orderDetailStatus').value = order.status || 'Hazırlanıyor';

  document.getElementById('orderDetailModal').classList.add('open');
}

function saveOrderStatus() {
  const orders = getOrders();
  const order = orders.find(o => o.id === viewingOrderId);
  if (!order) return;
  order.status = document.getElementById('orderDetailStatus').value;
  saveOrders(orders);
  closeModal('orderDetailModal');
  renderOrders();
  if (currentTab === 'dashboard') renderDashboard();
  showToast('Sipariş durumu güncellendi');
}

/* ── PRODUCTS ────────────────────────────────────────────────── */
function renderProducts() {
  let products = getProducts();

  if (productSearch) {
    const q = productSearch.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }

  const grid = document.getElementById('productsGrid');
  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state products-empty">
        <div class="empty-icon">🖼️</div>
        <div class="empty-title">Ürün bulunamadı</div>
        <div class="empty-desc">Yeni ürün ekleyin veya arama kriterini değiştirin.</div>
      </div>
    `;
    document.getElementById('productCount').textContent = '0 ürün';
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="product-card" id="pcard-${escapeHtml(p.id)}">
      <div class="product-card-preview">
        ${buildProductPreview(p)}
      </div>
      <div class="product-card-body">
        <div class="product-card-header">
          <div>
            <div class="product-name">${escapeHtml(p.name)}</div>
            <div style="margin-top:3px">
              <span class="product-status-badge ${p.active !== false ? 'active' : 'inactive'}">
                ${p.active !== false ? '● Aktif' : '● Pasif'}
              </span>
            </div>
          </div>
          <div class="product-icon">${escapeHtml(p.icon || '🖼️')}</div>
        </div>
        <div class="product-desc">${escapeHtml(p.desc)}</div>
        <div class="product-meta">
          <span class="product-price">${Number(p.price).toLocaleString('tr-TR')} ₺</span>
          <span class="product-cells">${p.cols * p.rows} fotoğraf</span>
        </div>
        <div class="product-meta" style="margin-bottom:14px;font-size:12px;color:var(--text-muted)">
          ${p.cols}×${p.rows} grid · ${p.gap}px boşluk
        </div>
        <div class="product-actions">
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="openProductModal('${escapeHtml(p.id)}')">✏️ Düzenle</button>
          <button class="btn btn-sm" style="background:${p.active!==false?'var(--yellow-bg)':'var(--green-bg)'};color:${p.active!==false?'var(--yellow)':'var(--green)'};border:1px solid ${p.active!==false?'#ffe0a0':'#a0e0b4'}" onclick="toggleProductActive('${escapeHtml(p.id)}')">${p.active !== false ? 'Pasife Al' : 'Aktife Al'}</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${escapeHtml(p.id)}')" title="Ürünü sil">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('productCount').textContent = `${products.length} ürün`;
}

function buildProductPreview(p) {
  const cols = toInt(p.cols, 5, 1, 20);
  const rows = toInt(p.rows, 7, 1, 20);
  const cells = Math.min(cols * rows, 30);
  const previewCols = Math.min(cols, 6);
  const previewRows = Math.min(rows, 5);
  const gridStyle = `grid-template-columns: repeat(${previewCols}, 1fr); grid-template-rows: repeat(${previewRows}, 1fr)`;
  let html = `<div class="product-preview-grid" style="${gridStyle}">`;
  for (let i = 0; i < cells; i++) {
    html += `<div class="product-preview-cell"></div>`;
  }
  html += '</div>';
  return html;
}

function openProductModal(productId = null) {
  editingProductId = productId;
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  setProductFormError('');

  if (productId) {
    const products = getProducts();
    const p = products.find(x => x.id === productId);
    if (!p) return;
    title.textContent = 'Ürün Düzenle';
    document.getElementById('pName').value    = p.name;
    document.getElementById('pDesc').value    = p.desc;
    document.getElementById('pIcon').value    = p.icon || '';
    document.getElementById('pPrice').value   = p.price;
    document.getElementById('pCols').value    = p.cols;
    document.getElementById('pRows').value    = p.rows;
    document.getElementById('pGap').value     = p.gap;
    document.getElementById('pPad').value     = p.pad;
    document.getElementById('pOrient').value  = p.orient || 'portrait';
    document.getElementById('pActive').value  = p.active !== false ? 'true' : 'false';
  } else {
    title.textContent = 'Yeni Ürün Ekle';
    document.getElementById('productForm').reset();
    document.getElementById('pPrice').value = '149';
    document.getElementById('pCols').value = '5';
    document.getElementById('pRows').value = '7';
    document.getElementById('pOrient').value = 'portrait';
    document.getElementById('pActive').value = 'true';
    document.getElementById('pGap').value = '4';
    document.getElementById('pPad').value = '12';
  }

  updateCellCountPreview();
  modal.classList.add('open');
}

function setProductFormError(message) {
  const el = document.getElementById('productFormError');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('visible', Boolean(message));
}

function updateCellCountPreview() {
  const c = parseInt(document.getElementById('pCols')?.value, 10) || 0;
  const r = parseInt(document.getElementById('pRows')?.value, 10) || 0;
  const el = document.getElementById('cellCountPreview');
  if (el) el.textContent = c * r;
}

function saveProduct() {
  const name   = document.getElementById('pName').value.trim();
  const desc   = document.getElementById('pDesc').value.trim();
  const icon   = document.getElementById('pIcon').value.trim() || '🖼️';
  const price  = toInt(document.getElementById('pPrice').value, 0, 0, 999999);
  const cols   = toInt(document.getElementById('pCols').value, 0, 0, 20);
  const rows   = toInt(document.getElementById('pRows').value, 0, 0, 20);
  const gap    = toInt(document.getElementById('pGap').value, 4, 0, 20);
  const pad    = toInt(document.getElementById('pPad').value, 12, 0, 40);
  const orient = document.getElementById('pOrient').value;
  const active = document.getElementById('pActive').value === 'true';

  if (!name) {
    setProductFormError('Ürün adı zorunludur.');
    document.getElementById('pName').focus();
    return;
  }
  if (!desc) {
    setProductFormError('Açıklama zorunludur.');
    document.getElementById('pDesc').focus();
    return;
  }
  if (price <= 0) {
    setProductFormError('Fiyat 1 TL veya daha yüksek olmalıdır.');
    document.getElementById('pPrice').focus();
    return;
  }
  if (cols < 1 || rows < 1) {
    setProductFormError('Sütun ve satır sayısı en az 1 olmalıdır.');
    document.getElementById('pCols').focus();
    return;
  }
  if (cols * rows > 300) {
    setProductFormError('Fotoğraf kapasitesi en fazla 300 olabilir. Daha küçük bir grid seçin.');
    document.getElementById('pCols').focus();
    return;
  }

  setProductFormError('');
  const products = getProducts();

  if (editingProductId) {
    const idx = products.findIndex(p => p.id === editingProductId);
    if (idx === -1) return;
    products[idx] = { ...products[idx], name, desc, icon, price, cols, rows, gap, pad, orient, active };
    showToast('Ürün güncellendi');
  } else {
    const id = slugifyProductId(name);
    products.push({ id, name, desc, icon, price, cols, rows, gap, pad, orient, active });
    showToast('Yeni ürün eklendi');
  }

  saveProducts(products);
  closeModal('productModal');
  renderProducts();
  renderDashboard();
}

function deleteProduct(productId) {
  if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
  const products = getProducts().filter(p => p.id !== productId);
  saveProducts(products);
  renderProducts();
  renderDashboard();
  showToast('Ürün silindi');
}

function toggleProductActive(productId) {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === productId);
  if (idx === -1) return;
  products[idx].active = products[idx].active === false ? true : false;
  saveProducts(products);
  renderProducts();
  renderDashboard();
  showToast(products[idx].active ? 'Ürün aktife alındı' : 'Ürün pasife alındı');
}

/* ── USERS ───────────────────────────────────────────────────── */
function renderUsers() {
  let users = getUsers();

  if (userSearch) {
    const q = userSearch.toLowerCase();
    users = users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }

  const orders = getOrders();
  const tbody = document.getElementById('usersBody');

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">Kullanıcı bulunamadı</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const userOrders = orders.filter(o => o.userEmail === u.email);
    const totalSpent = userOrders.reduce((s, o) => s + (o.total || o.price || 0), 0);
    const initials = (u.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `
      <tr>
        <td>
          <div class="user-info">
            <div class="user-avatar">${initials}</div>
            <div>
              <div style="font-weight:600">${u.name || '—'}</div>
              <div style="font-size:11px;color:var(--text-muted)">${u.id || ''}</div>
            </div>
          </div>
        </td>
        <td>${u.email}</td>
        <td>${userOrders.length} sipariş</td>
        <td><strong>${totalSpent.toLocaleString('tr-TR')} ₺</strong></td>
        <td style="font-size:12px;color:var(--text-muted)">${formatDate(u.createdAt)}</td>
      </tr>
    `;
  }).join('');
}

/* ── SETTINGS ────────────────────────────────────────────────── */
function saveSettings(e) {
  e.preventDefault();
  const newEmail = document.getElementById('settingEmail').value.trim();
  const newPass  = document.getElementById('settingPass').value;
  const confirm  = document.getElementById('settingPassConfirm').value;

  if (!newEmail) { showToast('E-posta boş olamaz.', 'error'); return; }
  if (newPass && newPass !== confirm) { showToast('Şifreler eşleşmiyor.', 'error'); return; }
  if (newPass && newPass.length < 6)  { showToast('Şifre en az 6 karakter olmalı.', 'error'); return; }

  const creds = getAdminCredentials();
  creds.email = newEmail;
  if (newPass) creds.password = newPass;
  localStorage.setItem(ADMIN_KEY, JSON.stringify(creds));

  // Update session
  const session = getAdminSession();
  if (session) {
    session.email = newEmail;
    setAdminSession(session);
  }

  document.getElementById('headerEmail').textContent = newEmail;
  document.getElementById('settingPass').value = '';
  document.getElementById('settingPassConfirm').value = '';
  showToast('Ayarlar kaydedildi');
}

/* ── MODALS ──────────────────────────────────────────────────── */
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

/* ── UTILS ───────────────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── INIT ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (!checkSession()) {
    document.getElementById('loginScreen').style.display = 'flex';
  }

  // Login form
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  // Sign out
  document.getElementById('btnSignout').addEventListener('click', handleSignout);

  // Nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });

  // Order search + filter
  document.getElementById('orderSearch').addEventListener('input', e => {
    orderSearch = e.target.value;
    renderOrders();
  });

  document.getElementById('orderFilter').addEventListener('change', e => {
    orderFilter = e.target.value;
    renderOrders();
  });

  // Product search
  document.getElementById('productSearch').addEventListener('input', e => {
    productSearch = e.target.value;
    renderProducts();
  });

  // User search
  document.getElementById('userSearch').addEventListener('input', e => {
    userSearch = e.target.value;
    renderUsers();
  });

  // Product modal save
  document.getElementById('btnSaveProduct').addEventListener('click', saveProduct);
  ['pCols','pRows'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateCellCountPreview);
  });

  // Order detail status save
  document.getElementById('btnSaveOrderStatus').addEventListener('click', saveOrderStatus);

  // New product button
  document.getElementById('btnNewProduct').addEventListener('click', () => openProductModal(null));

  // Settings form
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);

  // Pre-fill settings email
  document.getElementById('settingEmail').value = getAdminCredentials().email;

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});
