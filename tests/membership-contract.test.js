const assert = require('node:assert/strict');
const fs = require('node:fs');

const configSource = fs.readFileSync('membership-config.js', 'utf8');
const membershipSource = fs.readFileSync('membership.js', 'utf8');
const hookSource = fs.readFileSync('membership-run-hook.js', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const serviceWorkerSource = fs.readFileSync('sw.js', 'utf8');
const migrationSource = fs.readFileSync('supabase/migrations/0001_membership_foundation.sql', 'utf8');

assert.ok(configSource.includes('enabled: false'));
assert.ok(configSource.includes("entitlementCode: 'flappyk.pro'"));
assert.ok(!/sk_(live|test)_/.test(configSource));
assert.ok(!/sb_secret_/.test(configSource));
assert.ok(!/whsec_/.test(configSource));

assert.ok(membershipSource.includes("if (configured) void initialise()"));
assert.ok(membershipSource.includes("from('entitlements')"));
assert.ok(membershipSource.includes("from('game_runs')"));
assert.ok(membershipSource.includes("can,"));
assert.ok(membershipSource.includes("signInWithOAuth"));
assert.ok(membershipSource.includes("signInWithOtp"));
assert.ok(membershipSource.includes("persistSession: true"));
assert.ok(membershipSource.includes("flowType: 'pkce'"));
assert.ok(membershipSource.includes('Authorization: `Bearer ${token}`'));

assert.ok(hookSource.includes("getElementById('champagne-btn')"));
assert.ok(hookSource.includes('isConfigured'));
assert.ok(hookSource.includes('queueCompletedRun'));
assert.ok(hookSource.includes('buildRunSignature'));

assert.ok(pwaSource.includes("'./membership-config.js'"));
assert.ok(pwaSource.includes("'./membership.js'"));
assert.ok(pwaSource.includes("'./membership-run-hook.js'"));
assert.ok(pwaSource.includes("'./membership.css'"));

assert.ok(serviceWorkerSource.includes("const APP_CACHE = 'flappyk-app-v3'"));
assert.ok(serviceWorkerSource.includes("'./membership-config.js'"));
assert.ok(serviceWorkerSource.includes("'./membership.js'"));
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

console.log('Membership configuration, guest fallback, sync contract, and RLS boundary validated');
