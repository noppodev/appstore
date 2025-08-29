let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installPwaBtn');
  if (btn) btn.hidden = false;
});

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('installPwaBtn');
  if (btn) btn.hidden = true;
  deferredPrompt = null;
});

document.addEventListener('DOMContentLoaded', async () => {
  registerServiceWorker();
  setupPwaInstallButton();
  attachHandlers();
  renderSkeletons(6);
  await renderApps();
});

function setupPwaInstallButton() {
  const btn = document.getElementById('installPwaBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.hidden = true;
  });
}

function attachHandlers() {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  searchInput?.addEventListener('input', renderApps);
  sortSelect?.addEventListener('change', renderApps);
  const upd = document.getElementById('updateCacheBtn');
  upd?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await navigator.serviceWorker?.ready;
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
      alert('オフラインデータを更新しました');
    } catch (err) {
      console.error(err);
      alert('更新に失敗しました');
    }
  });
}

async function fetchCatalog() {
  const res = await fetch('apps.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('apps.json load failed');
  /** @type {Array} */
  const data = await res.json();
  return data;
}

function normalizeEntry(entry) {
  return {
    id: entry.id ?? crypto.randomUUID?.() ?? String(Math.random()),
    name: entry.name ?? 'No name',
    description: entry.description ?? '',
    version: entry.version ?? '',
    updatedAt: entry.updatedAt ?? entry.updated ?? '',
    tags: entry.tags ?? [],
    icon: entry.icon ?? 'icons/icon-192.png',
    homepage: entry.homepage ?? '',
    apkUrl: entry.apkUrl ?? entry.apk ?? '#',
  };
}

async function renderApps() {
  const grid = document.getElementById('appsGrid');
  if (!grid) return;
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = '';
  let apps = [];
  try {
    const raw = await fetchCatalog();
    apps = raw.map(normalizeEntry);
  } catch (e) {
    console.warn('catalog not found, using sample');
    apps = [
      normalizeEntry({
        id: 'sample',
        name: 'サンプル電卓',
        description: 'デモ用のダミーアプリ',
        version: '1.0.0',
        updatedAt: '2025-01-01',
        tags: ['demo'],
        icon: 'icons/icon-192.png',
        apkUrl: 'sample/sample.apk'
      })
    ];
  }

  const q = document.getElementById('searchInput')?.value?.trim()?.toLowerCase() ?? '';
  const sort = document.getElementById('sortSelect')?.value ?? 'latest';
  if (q) {
    apps = apps.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.join(' ').toLowerCase().includes(q)
    );
  }
  if (sort === 'name') {
    apps.sort((a,b) => a.name.localeCompare(b.name));
  } else {
    apps.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  const tpl = document.getElementById('appCardTpl');
  apps.forEach(app => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.icon').src = app.icon;
    node.querySelector('.icon').alt = app.name;
    node.querySelector('.title').textContent = app.name;
    node.querySelector('.desc').textContent = app.description;
    node.querySelector('.ver').textContent = `v${app.version}`;
    node.querySelector('.updated').textContent = app.updatedAt;
    const tags = node.querySelector('.tags');
    tags.innerHTML = '';
    app.tags.forEach(t => {
      const s = document.createElement('span');
      s.textContent = t;
      tags.appendChild(s);
    });
    const a = node.querySelector('.dl');
    a.href = app.apkUrl;
    a.setAttribute('download', '');
    a.addEventListener('click', () => {
      // 直接リンクでダウンロードし、通知からインストールしてもらう想定
    });
    // homepageボタンは廃止
    grid.appendChild(node);
  });
  const countLabel = document.getElementById('countLabel');
  if (countLabel) countLabel.textContent = `${apps.length}件`;
  grid.removeAttribute('aria-busy');
}

function renderSkeletons(count) {
  const grid = document.getElementById('appsGrid');
  const tpl = document.getElementById('skeletonTpl');
  if (!grid || !tpl) return;
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    grid.appendChild(tpl.content.firstElementChild.cloneNode(true));
  }
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
    } catch (e) { console.warn('sw failed', e); }
  }
}


