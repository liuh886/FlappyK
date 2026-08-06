const APP_CACHE = 'flappyk-app-v19';
const RUNTIME_CACHE = 'flappyk-runtime-v19';

const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './style.css',
    './mobile-controls.css',
    './card-export.css',
    './share-challenge.css',
    './friend-challenge.css',
    './legend-ticker.css',
    './custom-challenge.css',
    './support-button.css',
    './experience.css',
    './leaderboard.css',
    './local-records.css',
    './daily-run.css',
    './onboarding.css',
    './i18n.css',
    './pwa.css',
    './premium-ui.css',
    './premium-ui-refinement.css',
    './home-story.css',
    './account-integration.css',
    './market-weather.css',
    './data.js',
    './qqq-loader.js',
    './scripts/friend-challenge-codec.js',
    './scripts/legend-score.js',
    './scripts/daily-run-core.js',
    './scripts/i18n-core.js',
    './scripts/i18n.js',
    './scripts/market-weather.js',
    './game.js',
    './scripts/market-pass-rule.js',
    './results.js',
    './legend-ticker.js',
    './custom-challenge.js',
    './experience.js',
    './core-hardening.js',
    './scripts/market-goal-ui.js',
    './onboarding.js',
    './friend-challenge.js',
    './daily-run.js',
    './scripts/game-pacing.js',
    './ui-polish.js',
    './leaderboard.js',
    './share-challenge.js',
    './card-export.js',
    './scripts/player-profile.js',
    './scripts/account-cloud-sync.js',
    './pwa.js',
    './scripts/ui-state.js',
    './scripts/premium-ui.js',
    './scripts/premium-ui-refinement.js',
    './scripts/home-story.js',
    './analytics.js',
    './membership-config.js',
    './data/leaderboard.json',
    './og-image.png',
    './icons/flappyk-icon.svg',
    './icons/favicon-32.png',
    './icons/apple-touch-icon-180.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => ![APP_CACHE, RUNTIME_CACHE].includes(key))
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request, { ignoreSearch: false });
        if (cached) return cached;
        throw error;
    }
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request, { ignoreSearch: false });
    const update = fetch(request)
        .then(async (response) => {
            if (response && (response.ok || response.type === 'opaque')) {
                const cache = await caches.open(RUNTIME_CACHE);
                await cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    return cached || update || Response.error();
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith(
            networkFirst(request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    if (url.origin === self.location.origin) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    if (
        url.hostname === 'fonts.googleapis.com'
        || url.hostname === 'fonts.gstatic.com'
        || url.hostname === 'html2canvas.hertzen.com'
        || url.hostname === 'raw.githubusercontent.com'
        || url.hostname === 'liuh886.github.io'
        || url.hostname === 'cdn.jsdelivr.net'
    ) {
        event.respondWith(staleWhileRevalidate(request));
    }
});
