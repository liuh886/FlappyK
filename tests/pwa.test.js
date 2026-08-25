const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const pwa = fs.readFileSync('pwa.js', 'utf8');
const analytics = fs.readFileSync('analytics.js', 'utf8');

assert.equal(manifest.id, './');
assert.equal(manifest.start_url, './?source=pwa');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.display_override.includes('fullscreen'));
assert.equal(manifest.theme_color, '#07090c');
assert.equal(manifest.background_color, '#07090c');
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

for (const shellAsset of [
    'rel="manifest" href="manifest.webmanifest"',
    'name="theme-color" content="#07090c"',
    'rel="apple-touch-icon"',
    'style.css',
    'mobile-controls.css',
    'premium-ui.css',
    'pwa.css',
    'scripts/market-canvas.js',
    'scripts/ui-state.js',
    'scripts/premium-ui.js',
    'scripts/account-cloud-sync.js',
    'pwa.js',
]) {
    assert.ok(index.includes(shellAsset), `Missing PWA shell asset: ${shellAsset}`);
}

for (const retiredAsset of [
    'visual-polish.css',
    'premium-ui-refinement.css',
    'home-story.css',
    'account-upgrade.css',
    'account-upgrade.js',
    'ui-polish.js',
]) {
    assert.ok(!index.includes(retiredAsset), `Retired shell asset returned: ${retiredAsset}`);
}

assert.ok(index.includes('https://liuh886.github.io/admin/shared/account-shell.css?v=6'));
assert.ok(index.includes('async src="https://liuh886.github.io/admin/shared/account-shell.js?v=7"'));
assert.ok(index.includes('https://static.cloudflareinsights.com/beacon.min.js'));

assert.ok(sw.includes("const APP_CACHE = 'flappyk-app'"));
assert.ok(sw.includes("const RUNTIME_CACHE = 'flappyk-runtime'"));
assert.ok(sw.includes('isCriticalSameOriginAsset'));
assert.ok(sw.includes('? networkFirst(request)'));
assert.ok(!/flappyk-(?:app|runtime)-v\d+/.test(sw));

for (const cachedAsset of [
    "'./index.html'",
    "'./style.css'",
    "'./mobile-controls.css'",
    "'./premium-ui.css'",
    "'./manifest.webmanifest'",
    "'./data-loader.js'",
    "'./analytics.js'",
    "'./scripts/market-canvas.js'",
    "'./scripts/ui-state.js'",
    "'./scripts/premium-ui.js'",
    "'./indicator-cards.css'",
    "'./scripts/indicator-cards.js'",
    "'./account-integration.css'",
    "'./scripts/account-cloud-sync.js'",
    "'./icons/icon-512.png'",
]) {
    assert.ok(sw.includes(cachedAsset), `Offline shell must cache ${cachedAsset}`);
}

for (const retiredCachedAsset of [
    "'./market-weather.css'",
    "'./scripts/market-weather.js'",
    "'./experience.css'",
    "'./scripts/fx-particles.js'",
    "'./data.js'",
    "'./premium-ui-refinement.css'",
    "'./home-story.css'",
    "'./hud-compact.css'",
    "'./visual-polish.css'",
    "'./ui-polish.js'",
]) {
    assert.ok(!sw.includes(retiredCachedAsset), `Retired cached asset returned: ${retiredCachedAsset}`);
}

assert.ok(sw.includes("request.mode === 'navigate'"));
assert.ok(sw.includes("caches.match('./index.html')"));
assert.ok(sw.includes('self.skipWaiting()'));
assert.ok(sw.includes('self.clients.claim()'));

assert.ok(pwa.includes("navigator.serviceWorker.register('./sw.js'"));
assert.ok(pwa.includes("window.addEventListener('beforeinstallprompt'"));
assert.ok(pwa.includes("window.addEventListener('appinstalled'"));
assert.ok(pwa.includes("button.id = 'pwa-install-btn'"));
assert.ok(pwa.includes('添加到主屏幕'));

assert.ok(analytics.includes("const MEASUREMENT_ID = 'G-ZW4437KBXE'"));
for (const eventName of ['play_start', 'level_complete', 'run_complete', 'pwa_install']) {
    assert.ok(analytics.includes(eventName), `Missing analytics event: ${eventName}`);
}

console.log('PWA manifest, install flow, canonical shell color, offline shell, critical runtime assets, account bridge, analytics, and stable cache lifecycle checks passed.');
