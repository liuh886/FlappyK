import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const syntaxOnly = process.argv.includes('--syntax-only');
const ignoredDirectories = new Set(['.git', 'node_modules', 'playwright-report', 'test-results']);

function walk(directory) {
  const results = [];
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) results.push(...walk(absolute));
    else results.push(absolute);
  }
  return results;
}

function run(command, args, label) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}`);
}

function requireFile(path, label = path) {
  if (!existsSync(join(root, path))) throw new Error(`Missing ${label}: ${path}`);
}

const sourceFiles = walk(root)
  .filter((path) => ['.js', '.cjs', '.mjs'].includes(extname(path)))
  .filter((path) => !relative(root, path).startsWith('data/'))
  .sort();

for (const file of sourceFiles) {
  run(process.execPath, ['--check', file], `Syntax check for ${relative(root, file)}`);
}
console.log(`Syntax-checked ${sourceFiles.length} JavaScript files.`);

if (syntaxOnly) process.exit(0);

const regressionTests = walk(join(root, 'tests'))
  .filter((path) => path.endsWith('.test.js'))
  .filter((path) => !relative(root, path).startsWith('tests/e2e/'))
  .sort();
for (const test of regressionTests) {
  run(process.execPath, [test], `Regression test ${relative(root, test)}`);
}
console.log(`Executed ${regressionTests.length} discovered regression tests.`);

const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
if (!['standalone', 'fullscreen'].includes(manifest.display)) {
  throw new Error(`PWA display mode must be standalone/fullscreen; received ${String(manifest.display)}`);
}
if (typeof manifest.start_url !== 'string' || typeof manifest.scope !== 'string') {
  throw new Error('PWA start_url and scope are required.');
}
if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
  throw new Error('PWA manifest must declare install icons.');
}
for (const icon of manifest.icons) requireFile(icon.src, `PWA icon ${icon.sizes ?? ''}`);

const index = readFileSync(join(root, 'index.html'), 'utf8');
const scriptSources = [...index.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((match) => match[1]);
const stylesheetSources = [...index.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g)].map((match) => match[1]);
for (const source of [...scriptSources, ...stylesheetSources]) {
  if (/^(https?:)?\/\//.test(source)) continue;
  requireFile(source.replace(/^\.\//, ''), 'referenced asset');
}

const ids = [...index.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicates = ids.filter((id, indexValue) => ids.indexOf(id) !== indexValue);
if (duplicates.length) throw new Error(`Duplicate DOM IDs: ${[...new Set(duplicates)].join(', ')}`);
for (const criticalId of ['mobile-controls', 'pause-btn', 'game-back-btn', 'onboarding-start-btn']) {
  if (!ids.includes(criticalId)) throw new Error(`Missing critical gameplay control: #${criticalId}`);
}

const serviceWorker = readFileSync(join(root, 'sw.js'), 'utf8');
for (const asset of ['./manifest.webmanifest', './index.html', './pwa.js', './membership-config.js', './scripts/account-cloud-sync.js']) {
  if (!serviceWorker.includes(asset)) throw new Error(`Service worker does not retain required offline asset ${asset}`);
}

const migration = readFileSync(join(root, 'supabase/migrations/0001_membership_foundation.sql'), 'utf8').toLowerCase();
if (!migration.includes('enable row level security')) {
  throw new Error('Membership migration must enable row-level security.');
}

const analytics = readFileSync(join(root, 'analytics.js'), 'utf8');
for (const eventName of ['play_start', 'run_complete']) {
  if (!analytics.includes(eventName)) throw new Error(`Missing required analytics event: ${eventName}`);
}

const membershipConfig = readFileSync(join(root, 'membership-config.js'), 'utf8');
const cloudSync = readFileSync(join(root, 'scripts/account-cloud-sync.js'), 'utf8');
for (const contract of [
  'window.HaoAccountConfig',
  "productCode: 'flappyk'",
  "entitlementCode: 'flappyk.pro'",
  'billingEnabled: false',
  '公共排行榜不会直接信任浏览器提交的成绩',
]) {
  if (!membershipConfig.includes(contract)) throw new Error(`FlappyK account config is missing ${contract}`);
}
for (const reference of [
  'https://liuh886.github.io/admin/shared/account-shell.css?v=1',
  'https://liuh886.github.io/admin/shared/account-shell.js?v=1',
  'scripts/account-cloud-sync.js',
]) {
  if (!index.includes(reference)) throw new Error(`FlappyK index is missing ${reference}`);
}
for (const contract of [
  "from('game_runs')",
  "from('profiles')",
  'ignoreDuplicates: true',
  "onConflict: 'user_id,local_signature'",
  'window.HaoAccount.saveProductData',
]) {
  if (!cloudSync.includes(contract)) throw new Error(`FlappyK cloud sync is missing ${contract}`);
}
const publicBrowser = `${index}\n${membershipConfig}\n${cloudSync}`;
for (const forbidden of [/sk_(live|test)_/, /whsec_/, /sb_secret_/, /service_role/]) {
  if (forbidden.test(publicBrowser)) throw new Error(`FlappyK browser assets contain forbidden secret material: ${forbidden}`);
}

requireFile('data/leaderboard.json');
requireFile('.github/workflows/leaderboard.yml');
console.log('Structured gameplay, PWA, analytics, account, cloud-history, and asset contracts passed.');
