const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const indexSource = fs.readFileSync('index.html', 'utf8');
const serviceWorkerSource = fs.readFileSync('sw.js', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const analyticsSource = fs.readFileSync('analytics.js', 'utf8');
const pixelStyles = fs.readFileSync('premium-ui-refinement.css', 'utf8');
const accountStyles = fs.readFileSync('account-integration.css', 'utf8');
const baseStyles = fs.readFileSync('style.css', 'utf8');
const homeMarketStyles = fs.readFileSync('home-market.css', 'utf8');
const homeMarketSource = fs.readFileSync('scripts/home-market.js', 'utf8');

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
assert.ok(!indexSource.includes('visual-polish.css'));
assert.ok(indexSource.includes('pwa.css'));
assert.ok(indexSource.includes('premium-ui.css'));
assert.ok(indexSource.includes('premium-ui-refinement.css'));
assert.ok(indexSource.includes('home-market.css'));
assert.ok(indexSource.includes('scripts/ui-state.js'));
assert.ok(indexSource.includes('scripts/premium-ui.js'));
assert.ok(indexSource.includes('scripts/home-market.js'));
assert.ok(indexSource.includes('pwa.js'));
assert.ok(indexSource.includes('https://liuh886.github.io/admin/shared/account-shell.css?v=2'));
assert.ok(indexSource.includes('async src="https://liuh886.github.io/admin/shared/account-shell.js?v=2"'));
assert.ok(indexSource.includes('scripts/account-cloud-sync.js'));
assert.ok(!indexSource.includes('home-story'));

assert.ok(pixelStyles.includes("family=Pixelify+Sans"));
assert.ok(pixelStyles.includes('--pixel-shadow-step'));
assert.ok(pixelStyles.includes('--pixel-cut'));
assert.ok(pixelStyles.includes("grid-template-columns: minmax(0, 1fr) minmax(108px, 0.86fr)"));
assert.ok(pixelStyles.includes('width: 176px'));
assert.ok(pixelStyles.includes('.run-progress-panel .hud-details'));
assert.ok(pixelStyles.includes('clip-path: none'));
assert.ok(accountStyles.includes('.home-utility-bar'));
assert.ok(accountStyles.includes('.home-account-slot .hao-account-trigger'));
assert.ok(accountStyles.includes("html:not([data-ui-state='home']) .home-utility-bar"));
assert.ok(baseStyles.includes('HUD instrument system: one shell, one divider, one label/value hierarchy.'));
assert.ok(baseStyles.includes('--hud-shell:'));
assert.ok(baseStyles.includes('--hud-divider:'));
assert.ok(baseStyles.includes('.weather-status::before'));
assert.ok(homeMarketStyles.includes('.home-market-canvas'));
assert.ok(homeMarketStyles.includes('.home-market-wallet'));
assert.ok(homeMarketStyles.includes('.resource-glyph--coin'));
assert.ok(homeMarketStyles.includes('.hud-cash-resource'));
assert.ok(homeMarketSource.includes("event.key === 'ArrowUp'"));
assert.ok(homeMarketSource.includes("event.key === 'ArrowDown'"));
assert.ok(homeMarketSource.includes('function drawFloor('));
assert.ok(homeMarketSource.includes('function promoteGameCashResource()'));

assert.ok(serviceWorkerSource.includes("const APP_CACHE = 'flappyk-app-v20'"));
assert.ok(serviceWorkerSource.includes("const RUNTIME_CACHE = 'flappyk-runtime-v20'"));
assert.ok(serviceWorkerSource.includes("'./data.js'"));
assert.ok(serviceWorkerSource.includes("'./analytics.js'"));
assert.ok(serviceWorkerSource.includes("'./membership-config.js'"));
assert.ok(serviceWorkerSource.includes("'./account-integration.css'"));
assert.ok(serviceWorkerSource.includes("'./scripts/account-cloud-sync.js'"));
assert.ok(serviceWorkerSource.includes("'./premium-ui.css'"));
assert.ok(serviceWorkerSource.includes("'./premium-ui-refinement.css'"));
assert.ok(serviceWorkerSource.includes("'./home-market.css'"));
assert.ok(serviceWorkerSource.includes("'./scripts/home-market.js'"));
assert.ok(serviceWorkerSource.includes("'./market-weather.css'"));
assert.ok(serviceWorkerSource.includes("'./scripts/market-weather.js'"));
assert.ok(!serviceWorkerSource.includes('home-story'));
assert.ok(!serviceWorkerSource.includes("'./membership.js'"));
assert.ok(!serviceWorkerSource.includes("'./membership-experience.js'"));
assert.ok(!serviceWorkerSource.includes("'./membership-run-hook.js'"));
assert.ok(!serviceWorkerSource.includes("'./membership.css'"));
assert.ok(!serviceWorkerSource.includes("'./membership-sync.css'"));
assert.ok(!serviceWorkerSource.includes("'./scripts/cloud-run-sync-core.js'"));
assert.ok(!serviceWorkerSource.includes("'./hud-compact.css'"));
assert.ok(!serviceWorkerSource.includes("'./visual-polish.css'"));
assert.ok(serviceWorkerSource.includes("'./scripts/ui-state.js'"));
assert.ok(serviceWorkerSource.includes("'./scripts/premium-ui.js'"));
assert.ok(serviceWorkerSource.includes("'./manifest.webmanifest'"));
assert.ok(serviceWorkerSource.includes("'./icons/icon-512.png'"));
assert.ok(serviceWorkerSource.includes("request.mode === 'navigate'"));
assert.ok(serviceWorkerSource.includes("caches.match('./index.html')"));
assert.ok(serviceWorkerSource.includes('self.skipWaiting()'));
assert.ok(serviceWorkerSource.includes('self.clients.claim()'));
assert.ok(serviceWorkerSource.includes("url.hostname === 'liuh886.github.io'"));
assert.ok(serviceWorkerSource.includes("url.hostname === 'cdn.jsdelivr.net'"));

assert.ok(pwaSource.includes("navigator.serviceWorker.register('./sw.js'"));
assert.ok(pwaSource.includes("window.addEventListener('beforeinstallprompt'"));
assert.ok(pwaSource.includes("window.addEventListener('appinstalled'"));
assert.ok(pwaSource.includes("button.id = 'pwa-install-btn'"));
assert.ok(pwaSource.includes("loadScript('flappyk-analytics-loader', './analytics.js')"));
assert.ok(!pwaSource.includes('hud-compact.css'));
assert.ok(pwaSource.includes("ensureStylesheet('flappyk-market-weather-styles', './market-weather.css')"));
assert.ok(pwaSource.includes("ensureStylesheet('flappyk-home-market-styles', './home-market.css')"));
assert.ok(pwaSource.indexOf('flappyk-home-market-styles') > pwaSource.indexOf('flappyk-market-weather-styles'));
assert.ok(!pwaSource.includes('flappyk-membership-client'));
assert.ok(!pwaSource.includes('flappyk-membership-experience'));
assert.ok(!pwaSource.includes('flappyk-membership-run-hook'));
assert.ok(!pwaSource.includes('flappyk-membership-styles'));
assert.ok(!pwaSource.includes('flappyk-membership-sync-styles'));
assert.ok(pwaSource.includes('添加到主屏幕'));

assert.ok(analyticsSource.includes("const MEASUREMENT_ID = 'G-ZW4437KBXE'"));
assert.ok(analyticsSource.includes("track('play_start')"));
assert.ok(analyticsSource.includes("track('level_complete'"));
assert.ok(analyticsSource.includes("track('run_complete'"));
assert.ok(analyticsSource.includes("track('pwa_install'"));

console.log('PWA manifest, icons, install UI, analytics, interactive full-viewport market home, unified coin HUD, staged weather, account toolbar, personal cloud history, and v20 offline cache checks passed');