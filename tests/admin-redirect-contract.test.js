const { existsSync, readFileSync } = require('node:fs');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const redirect = readFileSync('admin/index.html', 'utf8');
const canonicalUrl = 'https://liuh886.github.io/admin/';

expect(redirect.includes(canonicalUrl), 'Legacy admin path must redirect to the standalone console');
expect(redirect.includes('location.replace'), 'Legacy admin redirect must replace browser history');
expect(redirect.includes('rel="canonical"'), 'Legacy page must declare the standalone canonical URL');
expect(redirect.includes('noindex,nofollow,noarchive'), 'Legacy redirect must remain excluded from indexing');
expect(!existsSync('admin/admin.js'), 'FlappyK must not retain the admin application');
expect(!existsSync('admin/admin.css'), 'FlappyK must not retain the admin design bundle');
expect(!existsSync('supabase/functions/membership-admin/index.ts'), 'Admin Edge Function source belongs in liuh886/admin');
expect(!existsSync('supabase/migrations/0004_membership_admin_console.sql'), 'Admin schema migration belongs in liuh886/admin');
expect(!existsSync('supabase/migrations/0005_membership_admin_explicit_deny.sql'), 'Admin deny-policy migration belongs in liuh886/admin');
expect(!existsSync('docs/MEMBERSHIP_ADMIN.md'), 'Admin runbook belongs in liuh886/admin');

console.log('Standalone admin extraction contract checks passed');
