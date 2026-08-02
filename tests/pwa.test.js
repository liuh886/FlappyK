const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const indexSource = fs.readFileSync('index.html', 'utf8');
const serviceWorkerSource = fs.readFileSync('sw.js', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const analyticsSource = fs.readFileSync('analytics.js', 'utf8');

assert.equal(manifest.id, './');
assert.equal(manifest.start_url, './?source=pwa');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.display_override.includes('fullscreen'));
assert.equal(manifest.theme_color, '#0d1117');
assert.equal(manifest.background_color, '#0d1117');
assert.equal(manifest.prefer_related_applications, false);

const regular192 = manifest.icons.find((icon) => icon.sizes === '192x192' && icon.purpose === 'any');
const regular512 = manifest.icons.find((icon) => icon.sizes === '512x512' && icon.purpose === 'any');
const maskable512 = manifest.icons.find((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable');
assert.equal(regular192?.src, 'icons/icon-192.png');
assert.equal(regular512?.src, 'icons/icon-512.png');
assert.equal(maskable512?.src, 'icons/icon-maskable-512.png');

function pngSize(path) {
    const bytes = fs.readFileSync(path);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

assert.deepEqual(pngSize('icons/favicon-32.png'), [32, 32]);
assert.deepEqual(pngSize('icons/apple-touch-icon-180.png'), [180, 180]);
assert.deepEqual(pngSize('icons/icon-192.png'), [192, 192]);
assert.deepEqual(pngSize('icons/icon-512.png'), [512, 512]);
assert.deepEqual(pngSize('icons/icon-maskable-512.png'), [512, 512]);

assert.ok(indexSource.includes('rel="manifest" href="manifest.webmanifest"'));
assert.ok(indexSource.includes('name="theme-color" content="#0d1117"'));
assert.ok(indexSource.includes('rel="apple-touch-icon"'));
assert.ok(indexSource.includes('visual-polish.css'));
assert.ok(indexSource.includes('pwa.css'));
assert.ok(indexSource.includes('pwa.js'));

assert.ok(serviceWorkerSource.includes("const APP_CACHE = 'flappyk-app-v3'"));
assert.ok(serviceWorkerSource.includes("'./data.js'"));
assert.ok(serviceWorkerSource.includes("'./analytics.js'"));
assert.ok(serviceWorkerSource.includes("'./membership-config.js'"));
assert.ok(serviceWorkerSource.includes("'./membership.js'"));
assert.ok(serviceWorkerSource.includes("'./membership-run-hook.js'"));
assert.ok(serviceWorkerSource.includes("'./membership.css'"));
assert.ok(serviceWorkerSource.includes("'./manifest.webmanifest'"));
assert.ok(serviceWorkerSource.includes("'./icons/icon-512.png'"));
assert.ok(serviceWorkerSource.includes("request.mode === 'navigate'"));
assert.ok(serviceWorkerSource.includes("caches.match('./index.html')"));
assert.ok(serviceWorkerSource.includes('self.skipWaiting()'));
assert.ok(serviceWorkerSource.includes('self.clients.claim()'));

assert.ok(pwaSource.includes("navigator.serviceWorker.register('./sw.js'"));
assert.ok(pwaSource.includes("window.addEventListener('beforeinstallprompt'"));
assert.ok(pwaSource.includes("window.addEventListener('appinstalled'"));
assert.ok(pwaSource.includes("button.id = 'pwa-install-btn'"));
assert.ok(pwaSource.includes("loadScript('flappyk-analytics-loader', './analytics.js')"));
assert.ok(pwaSource.includes("loadScript('flappyk-membership-config', './membership-config.js')"));
assert.ok(pwaSource.includes("ensureStylesheet('flappyk-membership-styles', './membership.css')"));
assert.ok(pwaSource.includes('添加到主屏幕'));

assert.ok(analyticsSource.includes("const MEASUREMENT_ID = 'G-ZW4437KBXE'"));
assert.ok(analyticsSource.includes("track('play_start')"));
assert.ok(analyticsSource.includes("track('level_complete'"));
assert.ok(analyticsSource.includes("track('run_complete'"));
assert.ok(analyticsSource.includes("track('pwa_install'"));

console.log('PWA manifest, icons, install UI, analytics, membership shell, and offline cache checks passed');
