/* 食品健康查 — 离线缓存 Service Worker（相对 scope，兼容子路径部署） */
const CACHE = 'food-health-v3';
// 部署基准路径（如 / 或 /<repo>/），由注册 scope 推导
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '') + '/';
const APP_SHELL = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
  `${BASE}icon-maskable-512.png`,
  `${BASE}apple-touch-icon.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API 请求等跨域流量不缓存

  // 页面导航：网络优先，离线时回退到缓存外壳
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(`${BASE}index.html`, copy));
          return res;
        })
        .catch(() => caches.match(`${BASE}index.html`))
    );
    return;
  }

  // Vite 构建产物（带哈希，内容不可变）：缓存优先
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // 图标 / manifest / OCR 引擎等静态文件：缓存优先，首次使用后写入缓存（离线 OCR 可用）
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
