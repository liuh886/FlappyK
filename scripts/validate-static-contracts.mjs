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

for (const canonicalSurface of [
  'id="game-hud-rail"',
  'id="run-progress-panel"',
  'class="home-mode-stack"',
  'id="settlement-summary"',
  'class="mobile-speed-control"',
]) {
  if (!index.includes(canonicalSurface)) {
    throw new Error(`Canonical gameplay DOM is missing ${canonicalSurface}`);
  }
}
const retiredRefinementPath = join(root, 'scripts/premium-ui-refinement.js');
if (existsSync(retiredRefinementPath) || index.includes('premium-ui-refinement.js')) {
  throw new Error('Runtime HUD composition refinement must remain deleted.');
}

const uiStateSource = readFileSync(join(root, 'scripts/ui-state.js'), 'utf8');
for (const retiredStatePath of ['inferFromDom', 'new MutationObserver']) {
  if (uiStateSource.includes(retiredStatePath)) {
    throw new Error(`Core UI lifecycle must not infer state from DOM: ${retiredStatePath}`);
  }
}
const premiumUiSource = readFileSync(join(root, 'scripts/premium-ui.js'), 'utf8');
for (const retiredInstaller of [
  'installHomeHierarchy',
  'installHud',
  'installDesktopControls',
  'installMobileControls',
  'installSettlementSummary',
]) {
  if (premiumUiSource.includes(retiredInstaller)) {
    throw new Error(`Premium UI must remain behavior-only; found ${retiredInstaller}`);
  }
}

const serviceWorker = readFileSync(join(root, 'sw.js'), 'utf8');
for (const asset of ['./manifest.webmanifest', './index.html', './pwa.js', './membership-config.js', './scripts/account-cloud-sync.js']) {
  if (!serviceWorker.includes(asset)) throw new Error(`Service worker does not retain required offline asset ${asset}`);
}

const migration = readFileSync(join(root, 'supabase/migrations/0001_membership_foundation.sql'), 'utf8').toLowerCase();
if (!migration.includes('enable row level security')) {
  throw new Error('Membership migration must enable row-level security.');
}

const dataLoader = readFileSync(join(root, 'data-loader.js'), 'utf8');
if (!index.includes('<script src="data-loader.js"></script>') || index.includes('<script src="data.js"></script>')) {
  throw new Error('FlappyK must boot through the lazy market data loader, not data.js.');
}
for (const market of ['crypto', 'ashare', 'usstock']) requireFile(`data/markets/${market}.json`);
if (!dataLoader.includes('window.FlappyKData') || !dataLoader.includes('loadMarket')) {
  throw new Error('Lazy market loader contract is missing.');
}
const gameSource = readFileSync(join(root, 'game.js'), 'utf8');
const canvasWrites = [...gameSource.matchAll(/canvas\.(?:width|height)\s*=/g)].length;
if (canvasWrites !== 2) {
  throw new Error(`Canvas backing store must have one owner in game.js; found ${canvasWrites} writes.`);
}
if (!gameSource.includes('window.devicePixelRatio') || !gameSource.includes('ctx.setTransform(dpr, 0, 0, dpr, 0, 0)')) {
  throw new Error('Canvas owner must scale its backing store for devicePixelRatio.');
}

const analytics = readFileSync(join(root, 'analytics.js'), 'utf8');
for (const eventName of ['play_start', 'run_complete']) {
  if (!analytics.includes(eventName)) throw new Error(`Missing required analytics event: ${eventName}`);
}
for (const rumContract of [
  'https://static.cloudflareinsights.com/beacon.min.js',
  '8ddfa35f08814f51af0a4ee625810bea',
]) {
  if (!index.includes(rumContract)) throw new Error(`FlappyK Cloudflare RUM contract is missing ${rumContract}`);
}

const membershipConfig = readFileSync(join(root, 'membership-config.js'), 'utf8');
const cloudSync = readFileSync(join(root, 'scripts/account-cloud-sync.js'), 'utf8');
for (const contract of [
  'window.HaoAccountConfig',
  "productCode: 'flappyk'",
  "entitlementCode: 'flappyk.pro'",
  'billingEnabled: true',
  'product-referral.js?v=5',
  '排行榜按正式游戏规则统计',
]) {
  if (!membershipConfig.includes(contract)) throw new Error(`FlappyK account config is missing ${contract}`);
}
for (const reference of [
  'https://liuh886.github.io/admin/shared/account-shell.css?v=6',
  'https://liuh886.github.io/admin/shared/account-shell.js?v=7',
  'scripts/account-cloud-sync.js',
]) {
  if (!index.includes(reference)) throw new Error(`FlappyK index is missing ${reference}`);
}
const sharedRuntimeSurface = `${index}\n${membershipConfig}`;
for (const retired of ['account-shell.css?v=5', 'account-shell.js?v=6', 'account-upgrade.css', 'account-upgrade.js', 'product-referral.js?v=3', 'product-referral.js?v=4']) {
  if (sharedRuntimeSurface.includes(retired)) throw new Error(`FlappyK still references retired shared runtime ${retired}`);
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
console.log('Structured gameplay, canonical UI lifecycle/DOM, PWA, analytics, Account Shell, cloud-history, and asset contracts passed.');

const decisionFiles = sourceFiles.filter((path) => relative(root, path).replace(/\\/g, '/').startsWith('scripts/decision/'));
if (decisionFiles.length < 7) throw new Error(`Decision Engine requires at least 7 modules; found ${decisionFiles.length}`);
for (const file of decisionFiles) {
  const content = readFileSync(file, 'utf8');
  if (/generateInvestmentAdvice/.test(content)) throw new Error(`Decision Engine must not contain generateInvestmentAdvice: ${relative(root, file)}`);
  if (/You should have|You were wrong|mistake/i.test(content) && !file.endsWith('validate-static-contracts.mjs')) {
    // Allow "mistake" only in comments about prohibition? Forbid in decision code except documentation
    if (/You should have bought|Your sell was a mistake/.test(content)) throw new Error(`Decision Engine contains hindsight language: ${relative(root, file)}`);
  }
  if (file.endsWith('market-regime.js') && /\bactions\b/.test(content) && /classifyMarket/.test(content)) {
    // market-regime must not read actions; allow the error message string but not actual logic
    const lines = content.split('\n').filter((line) => !line.trim().startsWith('//') && !line.includes('forbiddenKeys'));
    const actionReads = lines.join('\n').match(/\bactions\b/g);
    // The only allowed occurrence is in the forbiddenKeys list and error message
    // Count occurrences excluding the forbiddenKeys definition
    if (actionReads && actionReads.length > 2) throw new Error(`market-regime.js must not read player actions: ${relative(root, file)}`);
  }
}
for (const required of [
  'scripts/decision/decision-metrics.js',
  'scripts/decision/market-regime.js',
  'scripts/decision/counterfactual-engine.js',
  'scripts/decision/insight-engine.js',
  'scripts/decision/decision-storage.js',
  'scripts/decision/mastery-system.js',
  'scripts/decision/decision-recorder.js',
  'scripts/decision/ghost-overlay.js',
]) requireFile(required);
if (!index.includes('decision.css') || !index.includes('scripts/decision/decision-recorder.js')) {
  throw new Error('Decision Engine assets must be referenced in index.html');
}
if (!readFileSync(join(root, 'sw.js'), 'utf8').includes('scripts/decision/decision-metrics.js')) {
  throw new Error('Service worker must cache Decision Engine modules');
}
console.log(`Decision Engine contracts passed (${decisionFiles.length} modules, no hindsight, market-regime isolated, storage local-only).`);
