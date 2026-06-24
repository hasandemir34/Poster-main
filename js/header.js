import { getCurrentUser, logout } from './auth.js?v=5';

const defaultLinks = [
  { key: 'home', href: 'index.html', text: 'Ana Sayfa' },
  { key: 'how', href: 'index.html#nasil-calisir', text: 'Nasıl Çalışır' },
  { key: 'templates', href: 'templates.html', text: 'Şablonlar' },
];

function clearDynamicNav(navEl) {
  navEl.querySelectorAll('[data-header-dynamic="true"]').forEach(el => el.remove());
}

function createUserMenu(user, idSuffix = '') {
  const userMenu = document.createElement('div');
  userMenu.className = 'user-menu';
  userMenu.dataset.headerDynamic = 'true';
  userMenu.innerHTML = `
    <button class="user-menu-btn" id="userMenuBtn${idSuffix}">
      <span class="user-avatar">${user.name.charAt(0).toUpperCase()}</span>
      <span class="user-name-short">${user.name.split(' ')[0]}</span>
      <span class="user-chevron">▾</span>
    </button>
    <div class="user-dropdown" id="userDropdown${idSuffix}">
      <div class="user-dropdown-info">
        <div class="ud-name">${user.name}</div>
        <div class="ud-email">${user.email}</div>
      </div>
      <div class="user-dropdown-sep"></div>
      <a href="orders.html" class="ud-link">📦 Siparişlerim</a>
      <button class="ud-link ud-logout" id="udLogout${idSuffix}">🚪 Çıkış Yap</button>
    </div>
  `;

  const btn = userMenu.querySelector(`#userMenuBtn${idSuffix}`);
  const drop = userMenu.querySelector(`#userDropdown${idSuffix}`);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    drop.classList.toggle('open');
  });

  document.addEventListener('click', () => drop.classList.remove('open'));

  userMenu.querySelector(`#udLogout${idSuffix}`).addEventListener('click', () => {
    logout();
  });

  return userMenu;
}

export function renderSiteNav(navEl, activeKey = '', options = {}) {
  if (!navEl) return;

  navEl.innerHTML = '';

  defaultLinks.forEach(link => {
    const item = document.createElement('a');
    item.href = link.href;
    item.className = 'nav-link';
    item.textContent = link.text;
    if (link.key === activeKey) item.classList.add('active');
    navEl.appendChild(item);
  });

  if (options.includeAuth !== false) {
    renderAuthNav(navEl);
  }
}

export function renderAuthNav(navEl) {
  if (!navEl) return;
  clearDynamicNav(navEl);
  const user = getCurrentUser();

  if (user) {
    navEl.appendChild(createUserMenu(user));
  } else {
    const loginBtn = document.createElement('a');
    loginBtn.href = 'auth.html';
    loginBtn.className = 'nav-link';
    loginBtn.dataset.headerDynamic = 'true';
    loginBtn.textContent = 'Giriş Yap';

    const registerBtn = document.createElement('a');
    registerBtn.href = 'auth.html?tab=register';
    registerBtn.className = 'nav-cta';
    registerBtn.dataset.headerDynamic = 'true';
    registerBtn.style.marginLeft = '4px';
    registerBtn.textContent = '+ Kayıt Ol';

    navEl.appendChild(loginBtn);
    navEl.appendChild(registerBtn);
  }
}

/**
 * renderUserOnly — sadece kullanıcı avatar menüsünü render eder.
 * Designer gibi kendi nav yapısı olan sayfalar için kullanın.
 * Kullanıcı giriş yapmamışsa Giriş Yap butonu gösterir.
 */
export function renderUserOnly(containerEl) {
  if (!containerEl) return;
  clearDynamicNav(containerEl);
  const user = getCurrentUser();

  if (user) {
    containerEl.appendChild(createUserMenu(user, 'D'));
  } else {
    const loginBtn = document.createElement('a');
    loginBtn.href = 'auth.html';
    loginBtn.className = 'nav-link';
    loginBtn.dataset.headerDynamic = 'true';
    loginBtn.textContent = 'Giriş Yap';
    containerEl.appendChild(loginBtn);
  }
}
