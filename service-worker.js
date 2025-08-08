/* sw.js – v12 (2025-07-30) */
const STATIC_CACHE   = 'panel-static-v12';
const HTML_CACHE     = 'panel-html-v1';

/* فایل‌های کاملاً ثابت (بدون querystring) */
const STATIC_ASSETS = [
    '/panel/assets/plugins/bootstrap/css/bootstrap.min.css',
    '/panel/assets/js/app.js',
];

self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS))
    );
    /* فعال شو بی‌درنگ تا کاربر مجبور به refresh دوباره نشود */
    self.skipWaiting();
});

self.addEventListener('activate', evt => {
    /* کش‌های قدیمی را پاک کن */
    const allow = [STATIC_CACHE, HTML_CACHE];
    evt.waitUntil(
        (async () => {
            for (const key of await caches.keys()) {
                if (!allow.includes(key)) await caches.delete(key);
            }
            /* درکِ تمام تب‌های باز */
            self.clients.claim();
            /* فعال‌سازی Navigation Preload */
            await self.registration.navigationPreload?.enable();
        })()
    );
});

/* ───── fetch ───── */
self.addEventListener('fetch', evt => {
    const { request } = evt;

    /* فقط GET را بررسی کن؛ بقیه را مستقیماً بفرست به شبکه */
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    /* درخواست‌هایی که قطعاً نباید کش شوند (API, auth, …) */
    if (url.pathname.startsWith('/api/') ||
        url.pathname.includes('/panel/api/') ||
        url.pathname.includes('/panel/login') ||
        url.pathname.includes('/panel/api/auth/logout.php')) {
        return; // network-default
    }

    /* فایل‌های استاتیک نسخه‌دار → Cache-First */
    if (STATIC_ASSETS.includes(url.pathname)) {
        evt.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    /* HTML پیمایشی (navigate) → Network-First با Navigation-Preload و fallback */
    if (request.mode === 'navigate') {
        evt.respondWith(htmlNetworkFirst(evt));
        return;
    }

    /* سایر موارد (تصویر، فونت، …) → Stale-While-Revalidate محدود */
    evt.respondWith(staleWhileRevalidate(request, 'panel-dynamic-v1', 64, 60 * 60));
});

/* ---- strategy helpers ---- */
async function cacheFirst(req, cacheName) {
    const cached = await caches.match(req);
    return cached || fetchAndPut(req, cacheName);
}

async function htmlNetworkFirst(evt) {
    const preload = await evt.preloadResponse;
    if (preload) return preload;

    try {
        const net = await fetch(evt.request);
        const clone = net.clone();
        const cache = await caches.open(HTML_CACHE);
        cache.put(evt.request, clone);
        return net;
    } catch {
        return caches.match('/panel/index.html'); // آفلاین
    }
}

async function staleWhileRevalidate(req, cacheName, maxEntries, maxAgeSec) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);

    /* بروزرسانی در پس‌زمینه */
    fetchAndPut(req, cacheName, maxEntries, maxAgeSec).catch(() => {});

    return cached || fetch(req);
}

async function fetchAndPut(req, cacheName, maxEntries = null, maxAgeSec = null) {
    const res = await fetch(req);
    if (res.ok) {
        const cache = await caches.open(cacheName);
        await cache.put(req, res.clone());
        /* پاکسازی بر اساس تعداد یا عمر */
        if (maxEntries || maxAgeSec) trimCache(cache, maxEntries, maxAgeSec);
    }
    return res;
}

async function trimCache(cache, maxEntries, maxAgeSec) {
    const keys = await cache.keys();
    const now  = Date.now();
    for (const [i, req] of keys.entries()) {
        const res = await cache.match(req);
        const dateHeader = res?.headers.get('date');
        const age = dateHeader ? (now - new Date(dateHeader).getTime()) / 1000 : Infinity;
        if ((maxEntries && i >= maxEntries) ||
            (maxAgeSec && age > maxAgeSec)) {
            await cache.delete(req);
        }
    }
}

/* ---- پیام لاگ‌اوت از صفحه ---- */
self.addEventListener('message', evt => {
    if (evt.data === 'logout') {
        /* حذف سریع همهٔ کش‌ها و SW بیکاری */
        caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
    }
});

