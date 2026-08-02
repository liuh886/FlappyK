const assert = require('node:assert/strict');
const fs = require('node:fs');

const configSource = fs.readFileSync('membership-config.js', 'utf8');
const membershipSource = fs.readFileSync('membership.js', 'utf8');
const experienceSource = fs.readFileSync('membership-experience.js', 'utf8');
const hookSource = fs.readFileSync('membership-run-hook.js', 'utf8');
const membershipStyles = fs.readFileSync('membership.css', 'utf8');
const i18nStyles = fs.readFileSync('i18n.css', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const serviceWorkerSource = fs.readFileSync('sw.js', 'utf8');
const migrationSource = fs.readFileSync('supabase/migrations/0001_membership_foundation.sql', 'utf8');

assert.ok(configSource.includes('enabled: true'));
assert.ok(configSource.includes("supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co'"));
assert.ok(configSource.includes("supabasePublishableKey: 'sb_publishable_"));
assert.ok(configSource.includes("entitlementCode: 'flappyk.pro'"));
assert.ok(!/sk_(live|test)_/.test(configSource));
assert.ok(!/sb_secret_/.test(configSource));
assert.ok(!/whsec_/.test(configSource));
assert.ok(!/service_role/.test(configSource));

assert.ok(membershipSource.includes("if (configured) void initialise()"));
assert.ok(membershipSource.includes("from('entitlements')"));
assert.ok(membershipSource.includes("from('game_runs')"));
assert.ok(membershipSource.includes("can,"));
assert.ok(membershipSource.includes("signInWithOAuth"));
assert.ok(membershipSource.includes("signInWithOtp"));
assert.ok(membershipSource.includes("persistSession: true"));
assert.ok(membershipSource.includes("flowType: 'pkce'"));
assert.ok(membershipSource.includes('Authorization: `Bearer ${token}`'));

assert.ok(experienceSource.includes("utilityBar.id = 'home-utility-bar'"));
assert.ok(experienceSource.includes("const host = document.getElementById('game-container') || document.body"));
assert.ok(experienceSource.includes('host.appendChild(utilityBar)'));
assert.ok(!experienceSource.includes('document.body.appendChild(utilityBar)'));
assert.ok(experienceSource.includes("accountLabel: '账户'"));
assert.ok(experienceSource.includes('function normalizeLauncher()'));
assert.ok(experienceSource.includes("tierBadge.className = 'membership-launcher-tier'"));
assert.ok(experienceSource.includes("style.id = 'flappyk-account-utility-refinement'"));
assert.ok(experienceSource.indexOf('utilityBar.appendChild(languageToggle)')
    < experienceSource.indexOf('utilityBar.appendChild(launcher)'));
assert.ok(experienceSource.includes("guestAction: '登录并保存成绩'"));
assert.ok(experienceSource.includes("membership.open?.()"));
assert.ok(experienceSource.includes("window.addEventListener('flappyk:run-completed'"));
assert.ok(experienceSource.includes('syncUtilityVisibility'));
assert.ok(membershipStyles.includes('.home-utility-bar'));
assert.ok(membershipStyles.includes('max-width: calc(100% - 24px)'));
assert.ok(membershipStyles.includes('.membership-result-prompt'));
assert.ok(membershipStyles.includes('.membership-result-action'));
assert.ok(membershipStyles.includes('max-height: calc(100dvh'));
assert.ok(i18nStyles.includes('--font-zh-unified'));
assert.ok(i18nStyles.includes('font-family: var(--font-zh-unified) !important'));
assert.ok(!i18nStyles.includes('--font-zh-display'));
assert.ok(!i18nStyles.includes('--font-zh-ui'));
assert.ok(i18nStyles.includes("html[lang='zh-CN'] .stats-box"));
assert.ok(i18nStyles.includes("div:has(#target-return-display)"));
assert.ok(i18nStyles.includes('font-size: 15px'));

assert.ok(hookSource.includes("getElementById('champagne-btn')"));
assert.ok(hookSource.includes('isConfigured'));
assert.ok(hookSource.includes('queueCompletedRun'));
assert.ok(hookSource.includes('buildRunSignature'));

assert.ok(pwaSource.includes("'./membership-config.js'"));
assert.ok(pwaSource.includes("'./membership.js'"));
assert.ok(pwaSource.includes("'./membership-experience.js'"));
assert.ok(pwaSource.includes("'./membership-run-hook.js'"));
assert.ok(pwaSource.includes("'./membership.css'"));

assert.ok(serviceWorkerSource.includes("const APP_CACHE = 'flappyk-app-v5'"));
assert.ok(serviceWorkerSource.includes("const RUNTIME_CACHE = 'flappyk-runtime-v5'"));
assert.ok(serviceWorkerSource.includes("'./membership-config.js'"));
assert.ok(serviceWorkerSource.includes("'./membership.js'"));
assert.ok(serviceWorkerSource.includes("'./membership-experience.js'"));
assert.ok(serviceWorkerSource.includes("'./membership-run-hook.js'"));
assert.ok(serviceWorkerSource.includes("'./membership.css'"));

assert.ok(migrationSource.includes('alter table public.profiles enable row level security'));
assert.ok(migrationSource.includes('alter table public.game_runs enable row level security'));
assert.ok(migrationSource.includes('alter table public.subscriptions enable row level security'));
assert.ok(migrationSource.includes('alter table public.entitlements enable row level security'));
assert.ok(migrationSource.includes('revoke all on public.entitlements from anon, authenticated'));
assert.ok(migrationSource.includes('grant select on public.entitlements to authenticated'));
assert.ok(!migrationSource.includes('grant insert on public.entitlements to authenticated'));
assert.ok(!migrationSource.includes('grant update on public.entitlements to authenticated'));

console.log('Membership configuration, right-most account badge, hidden Chinese goal row, refreshed PWA shell, result guidance, sync contract, and RLS boundary validated');