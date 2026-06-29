/* ── ADMIN PANEL — Supabase Entegreli ──────────────────────────────────────── */
import { supabase } from './supabase.js';
import { getDesignPdfUrl } from './pdf.js';

// ── YARDIMCILAR ───────────────────────────────────────────────────────────────
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function toInt(value, fallback, min, max) {
  const parsed = parseInt(value, 10);
  const n = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Math.max(n, min), max);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function slugifyProductId(name) {
  const base = String(name || 'urun')
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 28) || 'urun';
  return `${base}-${Date.now()}`;
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.className = `toast ${type}`;
  t.querySelector('.toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let currentTab       = 'dashboard';
let editingProductId = null;
let viewingOrderId   = null;
let orderFilter      = 'all';
let orderSearch      = '';
let productSearch    = '';
let userSearch       = '';

// ── AUTH — Supabase admin girişi ──────────────────────────────────────────────
async function checkAdminSession() {
  const { data } = await supabase.auth.getSession();
  const uid = data?.session?.user?.id;
  if (!uid) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', uid)
    .single();

  if (profile?.is_admin) {
    showApp(data.session.user.email);
    return true;
  }
  return false;
}

function showApp(email) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'block';
  document.getElementById('headerEmail').textContent = email;
  switchTab('dashboard');
}

async function handleLogin(e) {
  e.preventDefault();
  const email  = document.getElementById('loginEmail').value.trim();
  const pass   = document.getElementById('loginPass').value;
  const errEl  = document.getElementById('loginError');
  const btn    = e.target.querySelector('button[type="submit"]');

  errEl.classList.remove('visible');
  btn.textContent = 'Giriş yapılıyor...';
  btn.disabled = true;

  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  btn.textContent = 'Giriş Yap';
  btn.disabled = false;

  if (error) {
    errEl.textContent = 'E-posta veya şifre hatalı.';
    errEl.classList.add('visible');
    return;
  }

  const isAdmin = await checkAdminSession();
  if (!isAdmin) {
    await supabase.auth.signOut();
    errEl.textContent = 'Bu hesap admin değil.';
    errEl.classList.add('visible');
  }
}

async function handleSignout() {
  await supabase.auth.signOut();
  document.getElementById('adminApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
}

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
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

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
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

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function renderDashboard() {
  // İstatistikler
  const [
    { count: orderCount },
    { data: revenueData },
    { count: userCount },
    { data: activeProducts },
    { count: pendingCount },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('total'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('id').eq('active', true),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Hazırlanıyor'),
  ]);

  const totalRevenue = (revenueData || []).reduce((s, o) => s + Number(o.total || 0), 0);

  document.getElementById('stat-orders').textContent  = orderCount || 0;
  document.getElementById('stat-revenue').textContent = totalRevenue.toLocaleString('tr-TR') + ' ₺';
  document.getElementById('stat-users').textContent   = userCount || 0;
  document.getElementById('stat-products').textContent = (activeProducts || []).length;
  document.getElementById('stat-pending').textContent  = pendingCount || 0;

  // Son siparişler
  const { data: recent } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8);

  const tbody = document.getElementById('recentOrdersBody');
  if (!recent || recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Henüz sipariş yok</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(o => `
    <tr>
      <td><strong>${escapeHtml(o.id)}</strong></td>
      <td>${escapeHtml(o.user_name || '—')}<div style="font-size:11px;color:var(--text-muted)">${escapeHtml(o.user_email || '')}</div></td>
      <td>${escapeHtml(o.preset_name || '—')}</td>
      <td><strong>${Number(o.total || 0).toLocaleString('tr-TR')} ₺</strong></td>
      <td>${statusBadge(o.status)}</td>
    </tr>
  `).join('');
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
async function renderOrders() {
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (orderFilter !== 'all') query = query.eq('status', orderFilter);

  const { data: orders } = await query;
  let filtered = orders || [];

  if (orderSearch) {
    const q = orderSearch.toLowerCase();
    filtered = filtered.filter(o =>
      (o.id || '').toLowerCase().includes(q) ||
      (o.user_name || '').toLowerCase().includes(q) ||
      (o.user_email || '').toLowerCase().includes(q) ||
      (o.preset_name || '').toLowerCase().includes(q)
    );
  }

  // Badge
  const { count: pendingCount } = await supabase
    .from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Hazırlanıyor');
  const badge = document.getElementById('orderNavBadge');
  if (badge) { badge.textContent = pendingCount || ''; badge.style.display = pendingCount ? 'flex' : 'none'; }

  const tbody = document.getElementById('ordersBody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Sipariş bulunamadı</div><div class="empty-desc">Filtre veya arama kriterlerini değiştirin.</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => `
    <tr data-order-id="${escapeHtml(o.id)}">
      <td><strong style="font-family:monospace;font-size:12px">${escapeHtml(o.id)}</strong></td>
      <td>
        <div style="font-weight:600">${escapeHtml(o.user_name || '—')}</div>
        <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(o.user_email || '')}</div>
      </td>
      <td>${escapeHtml(o.preset_name || '—')}</td>
      <td><strong>${Number(o.total || 0).toLocaleString('tr-TR')} ₺</strong></td>
      <td class="status-cell-${escapeHtml(o.id)}">${statusBadge(o.status)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${formatDate(o.created_at)}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="openOrderDetail('${escapeHtml(o.id)}')">Detay</button>
          <button class="btn btn-ghost btn-sm" onclick="showInlineStatusPicker('${escapeHtml(o.id)}', '${escapeHtml(o.status || 'Hazırlanıyor')}')">Durum Seç →</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function showInlineStatusPicker(orderId, currentStatus) {
  // Daha önce açık bir picker varsa kapat
  const existing = document.getElementById('inlineStatusPicker');
  if (existing) existing.remove();

  const statuses = [
    { value: 'Hazırlanıyor', label: '⏳ Hazırlanıyor' },
    { value: 'Baskıda',      label: '🖨️ Baskıda' },
    { value: 'Kargoda',      label: '🚚 Kargoda' },
    { value: 'Teslim Edildi',label: '✅ Teslim Edildi' },
    { value: 'İptal',        label: '❌ İptal' },
  ];

  const row = document.querySelector(`tr[data-order-id="${orderId}"]`);
  if (!row) return;

  const picker = document.createElement('div');
  picker.id = 'inlineStatusPicker';
  picker.style.cssText = `
    position:fixed;
    z-index:9999;
    background:#fff;
    border:1.5px solid var(--border-mid, #e2e0db);
    border-radius:10px;
    box-shadow:0 8px 32px rgba(0,0,0,.14);
    padding:6px;
    min-width:200px;
    display:flex;
    flex-direction:column;
    gap:2px;
  `;

  statuses.forEach(s => {
    const opt = document.createElement('button');
    opt.textContent = s.label;
    opt.style.cssText = `
      background:${s.value === currentStatus ? 'var(--accent-bg, #fff3f3)' : 'transparent'};
      color:${s.value === currentStatus ? 'var(--accent, #e84040)' : 'var(--text, #1e1e1e)'};
      border:none;
      border-radius:7px;
      padding:9px 14px;
      text-align:left;
      font-size:13px;
      font-weight:${s.value === currentStatus ? '700' : '500'};
      cursor:pointer;
      transition:background .12s;
      font-family:inherit;
    `;
    opt.onmouseenter = () => {
      if (s.value !== currentStatus) opt.style.background = 'var(--bg, #faf8f5)';
    };
    opt.onmouseleave = () => {
      if (s.value !== currentStatus) opt.style.background = 'transparent';
    };
    opt.addEventListener('click', async () => {
      picker.remove();
      if (s.value === currentStatus) return;
      const { error } = await supabase
        .from('orders')
        .update({ status: s.value })
        .eq('id', orderId);
      if (error) { showToast('Durum güncellenemedi', 'error'); return; }
      // Sadece o satırdaki badge'i güncelle — tam re-render gerekmiyor
      const cell = document.querySelector(`.status-cell-${orderId}`);
      if (cell) cell.innerHTML = statusBadge(s.value);
      // Buton metnini güncelle (data-order-id satırındaki son td içindeki 2. buton)
      const btn = row.querySelector('.td-actions button:last-child');
      if (btn) btn.setAttribute('onclick', `showInlineStatusPicker('${orderId}', '${s.value}')`);
      showToast('Sipariş durumu güncellendi ✓');
      if (currentTab === 'dashboard') renderDashboard();
    });
    picker.appendChild(opt);
  });

  // Picker'ı butona yakın konumlandır
  const triggerBtn = row.querySelector('.td-actions button:last-child');
  if (triggerBtn) {
    const rect = triggerBtn.getBoundingClientRect();
    const viewportH = window.innerHeight;
    picker.style.left = rect.left + 'px';
    // Altta yer yoksa yukarı aç
    if (rect.bottom + 220 > viewportH) {
      picker.style.bottom = (viewportH - rect.top + 4) + 'px';
      picker.style.top = 'auto';
    } else {
      picker.style.top = (rect.bottom + 4) + 'px';
    }
  }

  document.body.appendChild(picker);

  // Dışarıya tıklayınca kapat
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 0);
}

async function openOrderDetail(orderId) {
  viewingOrderId = orderId;
  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (!order) return;

  document.getElementById('orderDetailId').textContent      = order.id;
  document.getElementById('orderDetailName').textContent    = order.user_name || '—';
  document.getElementById('orderDetailEmail').textContent   = order.user_email || '—';
  document.getElementById('orderDetailPreset').textContent  = order.preset_name || '—';
  document.getElementById('orderDetailDesc').textContent    = order.preset_desc || '—';
  document.getElementById('orderDetailTotal').textContent   = Number(order.total || 0).toLocaleString('tr-TR') + ' ₺';
  document.getElementById('orderDetailCard').textContent    = order.card_last4 ? '**** ' + order.card_last4 : '—';
  document.getElementById('orderDetailDate').textContent    = formatDate(order.created_at);

  const addr = order.address || {};
  document.getElementById('orderDetailAddress').textContent =
    [addr.address || addr.line, addr.district, addr.city, addr.zip].filter(Boolean).join(', ') || '—';

  document.getElementById('orderDetailStatus').value = order.status || 'Hazırlanıyor';
  document.getElementById('orderDetailModal').classList.add('open');
}

async function saveOrderStatus() {
  const newStatus = document.getElementById('orderDetailStatus').value;
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', viewingOrderId);

  if (error) { showToast('Durum güncellenemedi', 'error'); return; }
  closeModal('orderDetailModal');
  renderOrders();
  if (currentTab === 'dashboard') renderDashboard();
  showToast('Sipariş durumu güncellendi');
}

async function downloadOrderPdf() {
  if (!viewingOrderId) {
    showToast('Sipariş ID bulunamadı.', 'error');
    return;
  }

  showToast('PDF adresi alınıyor...', 'info');

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('design_pdf_path')
      .eq('id', viewingOrderId)
      .single();

    if (error || !order) {
      showToast('Sipariş bilgisi alınamadı.', 'error');
      console.error(error);
      return;
    }

    const path = order.design_pdf_path;
    if (!path) {
      showToast('Bu sipariş için tasarım PDF\'i bulunmuyor.', 'error');
      return;
    }

    const url = await getDesignPdfUrl(path, 300);
    if (!url) {
      showToast('İndirme bağlantısı üretilemedi.', 'error');
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = `siparis-${viewingOrderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast('PDF indiriliyor/açılıyor...');
  } catch (err) {
    console.error('PDF indirme hatası:', err);
    showToast('Bir hata oluştu.', 'error');
  }
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
async function renderProducts() {
  const { data: allProds } = await supabase
    .from('products').select('*').order('sort_order', { ascending: true });

  let products = allProds || [];
  if (productSearch) {
    const q = productSearch.toLowerCase();
    products = products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.descr || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q)
    );
  }

  const grid = document.getElementById('productsGrid');
  document.getElementById('productCount').textContent = `${products.length} ürün`;

  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state products-empty"><div class="empty-icon">🖼️</div><div class="empty-title">Ürün bulunamadı</div><div class="empty-desc">Yeni ürün ekleyin veya arama kriterini değiştirin.</div></div>`;
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="product-card" id="pcard-${escapeHtml(p.id)}">
      <div class="product-card-preview">${buildProductPreview(p)}</div>
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
        <div class="product-desc">${escapeHtml(p.descr || '')}</div>
        <div class="product-meta">
          <span class="product-price">${Number(p.price).toLocaleString('tr-TR')} ₺</span>
          <span class="product-cells">${p.cols * p.rows} fotoğraf</span>
        </div>
        <div class="product-meta" style="margin-bottom:14px;font-size:12px;color:var(--text-muted)">
          ${p.cols}×${p.rows} grid · ${p.gap}px boşluk
        </div>
        <div class="product-actions">
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="openProductModal('${escapeHtml(p.id)}')">✏️ Düzenle</button>
          <button class="btn btn-sm" style="background:${p.active!==false?'var(--yellow-bg)':'var(--green-bg)'};color:${p.active!==false?'var(--yellow)':'var(--green)'};border:1px solid ${p.active!==false?'#ffe0a0':'#a0e0b4'}" onclick="toggleProductActive('${escapeHtml(p.id)}',${p.active})">${p.active !== false ? 'Pasife Al' : 'Aktife Al'}</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${escapeHtml(p.id)}')" title="Ürünü sil">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function buildProductPreview(p) {
  const cols = toInt(p.cols, 5, 1, 20);
  const rows = toInt(p.rows, 7, 1, 20);
  const cells = Math.min(cols * rows, 30);
  const previewCols = Math.min(cols, 6);
  const previewRows = Math.min(rows, 5);
  const gridStyle = `grid-template-columns: repeat(${previewCols}, 1fr); grid-template-rows: repeat(${previewRows}, 1fr)`;
  let html = `<div class="product-preview-grid" style="${gridStyle}">`;
  for (let i = 0; i < cells; i++) html += `<div class="product-preview-cell"></div>`;
  html += '</div>';
  return html;
}

async function openProductModal(productId = null) {
  editingProductId = productId;
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  setProductFormError('');

  if (productId) {
    const { data: p } = await supabase.from('products').select('*').eq('id', productId).single();
    if (!p) return;
    title.textContent = 'Ürün Düzenle';
    document.getElementById('pName').value   = p.name;
    document.getElementById('pDesc').value   = p.descr || '';
    document.getElementById('pIcon').value   = p.icon || '';
    document.getElementById('pPrice').value  = p.price;
    document.getElementById('pCols').value   = p.cols;
    document.getElementById('pRows').value   = p.rows;
    document.getElementById('pGap').value    = p.gap;
    document.getElementById('pPad').value    = p.pad;
    document.getElementById('pOrient').value = p.orient || 'portrait';
    document.getElementById('pActive').value = p.active !== false ? 'true' : 'false';
  } else {
    title.textContent = 'Yeni Ürün Ekle';
    document.getElementById('productForm').reset();
    document.getElementById('pPrice').value  = '149';
    document.getElementById('pCols').value   = '5';
    document.getElementById('pRows').value   = '7';
    document.getElementById('pOrient').value = 'portrait';
    document.getElementById('pActive').value = 'true';
    document.getElementById('pGap').value    = '4';
    document.getElementById('pPad').value    = '12';
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

async function saveProduct() {
  const name   = document.getElementById('pName').value.trim();
  const descr  = document.getElementById('pDesc').value.trim();
  const icon   = document.getElementById('pIcon').value.trim() || '🖼️';
  const price  = toInt(document.getElementById('pPrice').value, 0, 0, 999999);
  const cols   = toInt(document.getElementById('pCols').value, 0, 0, 20);
  const rows   = toInt(document.getElementById('pRows').value, 0, 0, 20);
  const gap    = toInt(document.getElementById('pGap').value, 4, 0, 20);
  const pad    = toInt(document.getElementById('pPad').value, 12, 0, 40);
  const orient = document.getElementById('pOrient').value;
  const active = document.getElementById('pActive').value === 'true';

  if (!name) { setProductFormError('Ürün adı zorunludur.'); document.getElementById('pName').focus(); return; }
  if (!descr) { setProductFormError('Açıklama zorunludur.'); document.getElementById('pDesc').focus(); return; }
  if (price <= 0) { setProductFormError('Fiyat 1 TL veya daha yüksek olmalıdır.'); return; }
  if (cols < 1 || rows < 1) { setProductFormError('Sütun ve satır sayısı en az 1 olmalıdır.'); return; }
  if (cols * rows > 300) { setProductFormError('Fotoğraf kapasitesi en fazla 300 olabilir.'); return; }

  setProductFormError('');

  if (editingProductId) {
    const { error } = await supabase.from('products')
      .update({ name, descr, icon, price, cols, rows, gap, pad, orient, active })
      .eq('id', editingProductId);
    if (error) { showToast('Ürün güncellenemedi', 'error'); return; }
    showToast('Ürün güncellendi');
  } else {
    const { data: maxSort } = await supabase.from('products').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
    const sort_order = (maxSort?.sort_order || 0) + 1;
    const id = slugifyProductId(name);
    const { error } = await supabase.from('products')
      .insert({ id, name, descr, icon, price, cols, rows, gap, pad, orient, active, sort_order });
    if (error) { showToast('Ürün eklenemedi', 'error'); return; }
    showToast('Yeni ürün eklendi');
  }

  closeModal('productModal');
  renderProducts();
  renderDashboard();
}

async function deleteProduct(productId) {
  if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) { showToast('Ürün silinemedi', 'error'); return; }
  renderProducts();
  renderDashboard();
  showToast('Ürün silindi');
}

async function toggleProductActive(productId, currentActive) {
  const newActive = !currentActive;
  const { error } = await supabase.from('products').update({ active: newActive }).eq('id', productId);
  if (error) { showToast('Güncelleme başarısız', 'error'); return; }
  renderProducts();
  renderDashboard();
  showToast(newActive ? 'Ürün aktife alındı' : 'Ürün pasife alındı');
}

// ── USERS ─────────────────────────────────────────────────────────────────────
async function renderUsers() {
  const { data: allUsers } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  let users = allUsers || [];
  if (userSearch) {
    const q = userSearch.toLowerCase();
    users = users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }

  // Tüm siparişleri bir kez çek
  const { data: allOrders } = await supabase.from('orders').select('user_id, total');

  const tbody = document.getElementById('usersBody');
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">Kullanıcı bulunamadı</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const userOrders  = (allOrders || []).filter(o => o.user_id === u.id);
    const totalSpent  = userOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const initials    = (u.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `
      <tr>
        <td>
          <div class="user-info">
            <div class="user-avatar">${initials}</div>
            <div>
              <span class="user-name-link" onclick="openCustomerModal('${escapeHtml(u.id)}')"
                title="Profili düzenle">${escapeHtml(u.name || '—')}</span>
              <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(u.email || '—')}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(u.email || '—')}</td>
        <td>${userOrders.length} sipariş</td>
        <td><strong>${totalSpent.toLocaleString('tr-TR')} ₺</strong></td>
        <td style="font-size:12px;color:var(--text-muted)">${formatDate(u.created_at)}</td>
      </tr>
    `;
  }).join('');
}

// ── CUSTOMER MODAL ────────────────────────────────────────────────────────────
let _cmOrders = [];

async function openCustomerModal(userId) {
  // Kullanıcı profilini çek
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Tüm siparişlerini çek
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  _cmOrders = orders || [];
  const u = profile || {};
  const totalSpent = _cmOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const initials = (u.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Hero
  document.getElementById('cmAvatar').textContent        = initials;
  document.getElementById('cmDisplayName').textContent   = u.name || '—';
  document.getElementById('cmDisplayEmail').textContent  = u.email || '—';
  document.getElementById('cmOrderCount').textContent    = `${_cmOrders.length} sipariş`;
  document.getElementById('cmTotalSpent').textContent    = `${totalSpent.toLocaleString('tr-TR')} ₺`;
  document.getElementById('cmJoinDate').textContent      = formatDate(u.created_at);

  // Form alanları
  document.getElementById('cmUserId').value    = u.id || '';
  const parts = (u.name || '').split(' ');
  document.getElementById('cmFirstName').value = parts[0] || '';
  document.getElementById('cmLastName').value  = parts.slice(1).join(' ') || '';
  document.getElementById('cmPhone').value     = u.phone    || '';
  document.getElementById('cmAddress').value   = u.address  || '';
  document.getElementById('cmDistrict').value  = u.district || '';
  document.getElementById('cmCity').value      = u.city     || '';
  document.getElementById('cmZip').value       = u.zip      || '';
  document.getElementById('cmNotes').value     = u.notes    || '';
  document.getElementById('cmError').textContent = '';

  // Son siparişler
  const divider = document.getElementById('cmOrdersDivider');
  const ordersEl = document.getElementById('cmRecentOrders');
  if (_cmOrders.length > 0) {
    divider.style.display = '';
    ordersEl.innerHTML = _cmOrders.map(o => {
      const statusColors = {
        'Hazırlanıyor': '#FF9500', 'Baskıda': '#007AFF',
        'Kargoda': '#AF52DE', 'Teslim Edildi': '#34C759', 'İptal': '#e5534b'
      };
      const color = statusColors[o.status] || '#888';
      return `
        <div class="cm-order-row">
          <span class="cm-or-id">#${escapeHtml(String(o.id).slice(-8).toUpperCase())}</span>
          <span class="cm-or-name">${escapeHtml(o.preset_name || o.product_id || '—')}</span>
          <span class="cm-or-total">${Number(o.total || 0).toLocaleString('tr-TR')} ₺</span>
          <span class="status-badge" style="background:${color}22;color:${color};font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600">${escapeHtml(o.status || '—')}</span>
        </div>
      `;
    }).join('');
  } else {
    divider.style.display = 'none';
    ordersEl.innerHTML = '';
  }

  document.getElementById('customerModal').classList.add('open');
}

async function saveCustomer() {
  const userId    = document.getElementById('cmUserId').value;
  const firstName = document.getElementById('cmFirstName').value.trim();
  const lastName  = document.getElementById('cmLastName').value.trim();
  const phone     = document.getElementById('cmPhone').value.trim();
  const address   = document.getElementById('cmAddress').value.trim();
  const district  = document.getElementById('cmDistrict').value.trim();
  const city      = document.getElementById('cmCity').value.trim();
  const zip       = document.getElementById('cmZip').value.trim();
  const notes     = document.getElementById('cmNotes').value.trim();
  const errEl     = document.getElementById('cmError');
  errEl.textContent = '';

  if (!firstName) { errEl.textContent = 'Ad alanı zorunludur.'; return; }

  const name = [firstName, lastName].filter(Boolean).join(' ');

  const btn = document.getElementById('btnSaveCustomer');
  btn.disabled = true;
  btn.textContent = 'Kaydediliyor...';

  const { error } = await supabase
    .from('profiles')
    .update({ name, phone, address, district, city, zip, notes })
    .eq('id', userId);

  btn.disabled = false;
  btn.innerHTML = '💾 Kaydet';

  if (error) {
    errEl.textContent = 'Kayıt sırasında hata: ' + error.message;
    showToast('Kayıt başarısız', 'error');
    return;
  }

  // Hero'yu güncelle
  document.getElementById('cmDisplayName').textContent = name;
  document.getElementById('cmAvatar').textContent = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  showToast('Müşteri profili güncellendi ✓');
  closeModal('customerModal');
  renderUsers();
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
async function saveSettings(e) {
  e.preventDefault();
  const newPass    = document.getElementById('settingPass').value;
  const confirmPas = document.getElementById('settingPassConfirm').value;

  if (newPass && newPass !== confirmPas) { showToast('Şifreler eşleşmiyor.', 'error'); return; }
  if (newPass && newPass.length < 6)     { showToast('Şifre en az 6 karakter olmalı.', 'error'); return; }

  if (newPass) {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) { showToast('Şifre güncellenemedi: ' + error.message, 'error'); return; }
  }

  document.getElementById('settingPass').value = '';
  document.getElementById('settingPassConfirm').value = '';
  showToast('Şifre güncellendi');
}

// ── MODALS ────────────────────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function viewPendingOrders() {
  switchTab('orders');
  const filterEl = document.getElementById('orderFilter');
  if (filterEl) {
    filterEl.value = 'Hazırlanıyor';
  }
  orderFilter = 'Hazırlanıyor';
  renderOrders();
}

// ── Global erişim (onclick="..." için) ───────────────────────────────────────
window.openOrderDetail       = openOrderDetail;
window.showInlineStatusPicker = showInlineStatusPicker;
window.openProductModal      = openProductModal;
window.deleteProduct         = deleteProduct;
window.toggleProductActive   = toggleProductActive;
window.downloadOrderPdf      = downloadOrderPdf;
window.closeModal            = closeModal;
window.switchTab             = switchTab;
window.viewPendingOrders     = viewPendingOrders;
window.openCustomerModal     = openCustomerModal;


// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const isAdmin = await checkAdminSession();
  if (!isAdmin) {
    document.getElementById('loginScreen').style.display = 'flex';
  }

  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('btnSignout').addEventListener('click', handleSignout);

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });

  document.getElementById('orderSearch').addEventListener('input', e => {
    orderSearch = e.target.value; renderOrders();
  });
  document.getElementById('orderFilter').addEventListener('change', e => {
    orderFilter = e.target.value; renderOrders();
  });
  document.getElementById('productSearch').addEventListener('input', e => {
    productSearch = e.target.value; renderProducts();
  });
  document.getElementById('userSearch').addEventListener('input', e => {
    userSearch = e.target.value; renderUsers();
  });

  document.getElementById('btnSaveProduct').addEventListener('click', saveProduct);
  ['pCols','pRows'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateCellCountPreview);
  });

  document.getElementById('btnSaveOrderStatus').addEventListener('click', saveOrderStatus);
  document.getElementById('btnNewProduct').addEventListener('click', () => openProductModal(null));
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
  document.getElementById('btnSaveCustomer').addEventListener('click', saveCustomer);

  // Sipariş detayı modalı — çarp (X) ve İptal butonları
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});
