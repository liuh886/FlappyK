const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

const index = read('index.html');
const uiState = read('scripts/ui-state.js');
const premiumUi = read('scripts/premium-ui.js');
const premiumCss = read('premium-ui.css');
const mobileCss = read('mobile-controls.css');
const pacing = read('scripts/game-pacing.js');
const experience = read('experience.js');
const onboarding = read('onboarding.js');

for (const shellContract of [
    'id="game-hud-rail"',
    'id="run-progress-panel"',
    'id="game-top-controls"',
    'id="pause-btn"',
    'id="game-back-btn"',
    'id="mobile-controls"',
    'id="onboarding-screen"',
    'id="daily-run-btn"',
    'id="personal-profile-summary"',
    'leaderboard-open-btn',
    'challenge-share-btn',
    'scripts/ui-state.js',
    'scripts/premium-ui.js',
    'scripts/game-pacing.js',
]) {
    assert.ok(index.includes(shellContract), `Missing product-shell contract: ${shellContract}`);
}

assert.equal(index.includes('NOT LIVE DATA'), false);
assert.equal(index.includes('ESC = RETURN HOME'), false);
assert.equal(index.includes('id="btn-pause"'), false);
assert.equal(index.includes('premium-ui-refinement.js'), false);
assert.ok(index.indexOf('pwa.js') < index.indexOf('scripts/ui-state.js'));
assert.ok(index.indexOf('scripts/ui-state.js') < index.indexOf('scripts/premium-ui.js'));

for (const stateContract of [
    "PLAYING: 'playing'",
    "PAUSED: 'paused'",
    "SETTLEMENT: 'settlement'",
    'root.dataset.layout = layout',
    'root.dataset.virtualControls',
    "controller?.on('level-did-start'",
    "controller?.on('level-will-settle'",
]) {
    assert.ok(uiState.includes(stateContract), `Missing shared UI-state contract: ${stateContract}`);
}
assert.ok(!uiState.includes('inferFromDom'));
assert.ok(!uiState.includes('new MutationObserver'));

for (const presentationContract of [
    'function renderHud()',
    'function renderSettlement()',
    'playerReturn - marketReturn',
    'function syncTopControls()',
]) {
    assert.ok(premiumUi.includes(presentationContract), `Missing behavior-only UI contract: ${presentationContract}`);
}
for (const retiredInstaller of ['installHomeHierarchy', 'installMobileControls', 'installSettlementSummary', "meter.id = 'excess-meter'"]) {
    assert.ok(!premiumUi.includes(retiredInstaller), `Runtime composition must stay retired: ${retiredInstaller}`);
}

for (const cssContract of [
    '#game-top-controls[hidden]',
    '.excess-meter-track',
    '.game-coachmark',
    '.settlement-summary',
    '.home-primary-actions',
]) {
    assert.ok(premiumCss.includes(cssContract), `Missing canonical shared presentation contract: ${cssContract}`);
}

for (const mobileContract of [
    '#mobile-controls[hidden]',
    '#mobile-controls:not([hidden])',
    'Runtime state decides whether this dock exists; viewport width does not.',
    '@media (orientation: landscape) and (max-height: 500px)',
]) {
    assert.ok(mobileCss.includes(mobileContract), `Missing touch geometry contract: ${mobileContract}`);
}
assert.ok(!mobileCss.includes('#game-top-controls[hidden]'), 'Touch geometry must not own shared top-control visibility.');
assert.ok(!mobileCss.includes('#pause-btn::before'), 'Pause state must not be painted by mobile CSS pseudo-elements.');
assert.ok(!mobileCss.includes("content: 'Ⅱ'"), 'Pause state must live in the DOM, not CSS content.');

for (const pacingContract of [
    'const DEFAULT_SPEED = 15',
    "event.code !== 'Space'",
    "document.addEventListener('visibilitychange'",
    'gameInterval = setInterval(gameTick, TICK_RATE)',
    'mobileControls.hidden = !showMobileControls',
    'topControls.hidden = !gameActive',
    "pauseButton.textContent = resume ? '▶' : 'Ⅱ'",
    "isChinese() ? '继续游戏' : 'Resume game'",
    "isChinese() ? '暂停游戏' : 'Pause game'",
    "backButton.textContent = '↩'",
    "window.addEventListener('flappyk:layout-state'",
    "window.addEventListener('orientationchange'",
]) {
    assert.ok(pacing.includes(pacingContract), `Missing pacing/control contract: ${pacingContract}`);
}

assert.ok(experience.includes("event.key !== 'Escape'"));
assert.equal(experience.includes('AUTO_NEXT'), false);
assert.equal(experience.includes('nextBtn.click'), false);

assert.ok(onboarding.includes("const STORAGE_KEY = 'flappyk_onboarding_seen_v1'"));
assert.ok(onboarding.includes('function queueGuide()'));
assert.ok(onboarding.includes('function consumePending()'));
assert.equal(onboarding.includes('event.stopImmediatePropagation()'), false);
assert.equal(onboarding.includes('button?.click()'), false);

console.log('Product shell, source-owned composition, explicit lifecycle, responsive touch geometry, onboarding, and manual navigation contracts passed.');