import { existsSync, readFileSync } from 'node:fs';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const required = [
  'admin/index.html',
  'admin/admin.css',
  'admin/admin.js',
  'docs/MEMBERSHIP_ADMIN.md',
  'supabase/migrations/0004_membership_admin_console.sql',
  'supabase/functions/membership-admin/index.ts'
];
for (const path of required) expect(existsSync(path), `Missing membership admin asset: ${path}`);

const html = readFileSync('admin/index.html', 'utf8');
const client = readFileSync('admin/admin.js', 'utf8');
const migration = readFileSync('supabase/migrations/0004_membership_admin_console.sql', 'utf8').toLowerCase();
const edge = readFileSync('supabase/functions/membership-admin/index.ts', 'utf8');
const combined = `${html}\n${client}\n${edge}`;

for (const contract of [
  'noindex,nofollow,noarchive',
  './admin.css',
  './admin.js',
  'refund-dialog',
  'cancel-dialog',
  'gift-form'
]) expect(html.includes(contract), `Admin HTML is missing ${contract}`);

for (const contract of [
  "adminFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/membership-admin'",
  "redirectUrl: 'https://liuh886.github.io/FlappyK/admin/'",
  "callAdmin('grant'",
  "callAdmin('extend_grant'",
  "callAdmin('revoke_grant'",
  "callAdmin('refund'",
  "callAdmin('cancel_subscription'",
  "els.refundConfirmation.value !== 'REFUND'",
  "els.cancelConfirmation.value !== 'CANCEL'"
]) expect(client.includes(contract), `Admin client contract is missing ${contract}`);

for (const contract of [
  'create table if not exists public.membership_admins',
  'create table if not exists public.membership_admin_actions',
  'membership_admin_actions is append-only',
  'enable row level security',
  'revoke all on public.membership_admins from public, anon, authenticated',
  'revoke all on public.membership_admin_actions from public, anon, authenticated',
  "where lower(email) = lower('liuh886@gmail.com')"
]) expect(migration.includes(contract), `Admin migration contract is missing ${contract}`);

for (const contract of [
  '.from("membership_admins")',
  'Administrator access is required.',
  'requireOwner()',
  'requireOperator()',
  'membership_admin_actions',
  'The payment does not belong to this user',
  'Type REFUND to confirm',
  'Type CANCEL to confirm',
  'STRIPE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
]) expect(edge.includes(contract), `Admin Edge Function contract is missing ${contract}`);

for (const forbidden of [
  /sk_(test|live)_[A-Za-z0-9]/,
  /whsec_[A-Za-z0-9]/,
  /service_role\s*[:=]\s*['"][A-Za-z0-9._-]+/i,
  /SUPABASE_DB_PASSWORD\s*[:=]\s*['"][^'"]+/i
]) expect(!forbidden.test(combined), `A server secret pattern leaked into admin assets: ${forbidden}`);

expect(!client.includes('.from("membership_admins")'), 'The browser must not query membership_admins directly.');
expect(!client.includes('STRIPE_SECRET_KEY'), 'The browser must not know the Stripe secret name or value.');
expect(edge.includes('charges?customer='), 'Refund validation must scope Stripe charges to the mapped customer.');

console.log('Membership admin security, refund, gift and audit contracts passed.');
