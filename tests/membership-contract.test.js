const assert = require('node:assert/strict');
const fs = require('node:fs');

const configSource = fs.readFileSync('membership-config.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');
const cloudSyncSource = fs.readFileSync('scripts/account-cloud-sync.js', 'utf8');
const cardStoreSource = fs.readFileSync('scripts/indicator-card-store.js', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const serviceWorkerSource = fs.readFileSync('sw.js', 'utf8');
const migrationSource = fs.readFileSync('supabase/migrations/0001_membership_foundation.sql', 'utf8');
const privacySource = fs.readFileSync('docs/CLOUD_RUN_SYNC.md', 'utf8');
const accountStyles = fs.readFileSync('account-integration.css', 'utf8');

for (const contract of [
  'window.HaoAccountConfig',
  'enabled: true',
  'billingEnabled: true',
  "supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co'",
  "supabasePublishableKey: 'sb_publishable_",
  "productCode: 'flappyk'",
  "entitlementCode: 'flappyk.pro'",
  "mountSelectors: ['[data-account-slot]'",
  'ensureHomeAccountToolbar',
  '公共排行榜不会直接信任浏览器提交的成绩',
]) {
  assert.ok(configSource.includes(contract), `Missing shared FlappyK account contract: ${contract}`);
}
for (const forbidden of [/sk_(live|test)_/, /sb_secret_/, /whsec_/, /service_role/]) {
  assert.ok(!forbidden.test(configSource), `FlappyK account config contains forbidden secret material: ${forbidden}`);
}

for (const reference of [
  'https://liuh886.github.io/admin/shared/account-shell.css?v=4',
  '<script src="membership-config.js"></script>',
  'async src="https://liuh886.github.io/admin/shared/account-shell.js?v=4"',
  '<script src="scripts/account-cloud-sync.js"></script>',
]) {
  assert.ok(indexSource.includes(reference), `FlappyK page is missing ${reference}`);
}
for (const toolbarContract of [
  '.home-utility-bar',
  '.home-account-slot .hao-account-trigger',
  "html:not([data-ui-state='home']) .home-utility-bar",
  '@media (max-width: 640px)',
]) {
  assert.ok(accountStyles.includes(toolbarContract), `Account toolbar styles are missing ${toolbarContract}`);
}

for (const contract of [
  'window.HaoAccount',
  'window.HaoAccount.saveProductData',
  "from('profiles')",
  "from('game_runs')",
  "onConflict: 'user_id,local_signature'",
  'ignoreDuplicates: true',
  "window.addEventListener('hao:account-changed'",
  "window.addEventListener('flappyk:run-completed'",
  'mergeProfiles',
]) {
  assert.ok(cloudSyncSource.includes(contract), `Missing personal cloud-history contract: ${contract}`);
}

for (const contract of [
  "const STATE_KEY = 'indicator_cards'",
  'const STARTER_COUNT = 3',
  'const DAILY_DRAW_LIMIT = 3',
  'accountState?.isPro === true',
  'window.HaoAccount.saveProductData',
  '[STATE_KEY]: payload',
  "window.addEventListener('hao:account-changed'",
]) {
  assert.ok(cardStoreSource.includes(contract), `Missing account-backed indicator card contract: ${contract}`);
}
assert.ok(!cardStoreSource.includes('localStorage'), 'Indicator card entitlement must not use a browser-local membership fallback.');

for (const retainedRuntime of [
  "loadScript('flappyk-analytics-loader'",
  "ensureStylesheet('flappyk-market-weather-styles'",
  "loadScript('flappyk-market-weather-client'",
  "ensureStylesheet('flappyk-indicator-card-styles'",
  "loadScript('flappyk-indicator-core'",
  "loadScript('flappyk-indicator-history'",
  "loadScript('flappyk-indicator-card-store'",
  "loadScript('flappyk-indicator-cards'",
]) {
  assert.ok(pwaSource.includes(retainedRuntime), `PWA runtime lost ${retainedRuntime}`);
}
for (const retiredRuntime of [
  'flappyk-membership-styles',
  'flappyk-membership-sync-styles',
  'flappyk-membership-client',
  'flappyk-membership-experience',
  'flappyk-membership-run-hook',
  'flappyk-cloud-run-sync-core',
]) {
  assert.ok(!pwaSource.includes(retiredRuntime), `PWA runtime still loads retired account code: ${retiredRuntime}`);
}

assert.ok(serviceWorkerSource.includes("const APP_CACHE = 'flappyk-app'"));
assert.ok(serviceWorkerSource.includes("const RUNTIME_CACHE = 'flappyk-runtime'"));
assert.ok(serviceWorkerSource.includes('isCriticalSameOriginAsset'));
assert.ok(!/flappyk-(?:app|runtime)-v\d+/.test(serviceWorkerSource));
for (const retainedAsset of [
  "'./membership-config.js'",
  "'./account-integration.css'",
  "'./scripts/account-cloud-sync.js'",
  "'./market-weather.css'",
  "'./scripts/market-weather.js'",
  "'./premium-ui.css'",
  "'./premium-ui-refinement.css'",
  "'./home-story.css'",
  "'./scripts/home-story.js'",
  "'./indicator-cards.css'",
  "'./scripts/indicator-core.js'",
  "'./scripts/indicator-history.js'",
  "'./scripts/indicator-card-store.js'",
  "'./scripts/indicator-cards.js'",
]) {
  assert.ok(serviceWorkerSource.includes(retainedAsset), `Offline shell is missing ${retainedAsset}`);
}
for (const retiredAsset of [
  "'./membership.js'",
  "'./membership-experience.js'",
  "'./membership-run-hook.js'",
  "'./membership.css'",
  "'./membership-sync.css'",
  "'./scripts/cloud-run-sync-core.js'",
]) {
  assert.ok(!serviceWorkerSource.includes(retiredAsset), `Offline shell still caches retired account code: ${retiredAsset}`);
}

for (const retiredFile of [
  'membership.js',
  'membership-experience.js',
  'membership-run-hook.js',
  'membership.css',
  'membership-sync.css',
  'scripts/cloud-run-sync-core.js',
]) {
  assert.equal(fs.existsSync(retiredFile), false, `Retired account file still exists: ${retiredFile}`);
}

assert.ok(migrationSource.includes('alter table public.profiles enable row level security'));
assert.ok(migrationSource.includes('alter table public.game_runs enable row level security'));
assert.ok(migrationSource.includes('alter table public.subscriptions enable row level security'));
assert.ok(migrationSource.includes('alter table public.entitlements enable row level security'));
assert.ok(migrationSource.includes('revoke all on public.entitlements from anon, authenticated'));
assert.ok(migrationSource.includes('grant select on public.entitlements to authenticated'));
assert.ok(!migrationSource.includes('grant insert on public.entitlements to authenticated'));
assert.ok(!migrationSource.includes('grant update on public.entitlements to authenticated'));

for (const privacyContract of [
  'Partial runs, keystrokes',
  'personal durability data',
  'must use a separate server-side validation path',
  'does not read data from Ownly, RhythmCoach, NewsFlow, or AlphaEngine',
]) {
  assert.ok(privacySource.includes(privacyContract), `Cloud-history documentation is missing ${privacyContract}`);
}

console.log('Shared Google/GitHub/X Account Shell v4, account-backed card inventory, personal cloud history, stable PWA cache lifecycle, trusted entitlement boundary, privacy, rankings, and RLS checks validated');