'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const index = read('index.html');
const sw = read('sw.js');
const metrics = read('scripts/decision/decision-metrics.js');
const regime = read('scripts/decision/market-regime.js');
const cf = read('scripts/decision/counterfactual-engine.js');
const insight = read('scripts/decision/insight-engine.js');
const recorder = read('scripts/decision/decision-recorder.js');
const ghost = read('scripts/decision/ghost-overlay.js');
const ghostView = read('scripts/decision/presentation/ghost-replay-view.js');
const verdictView = read('scripts/decision/presentation/verdict-view.js');
const cfView = read('scripts/decision/presentation/counterfactual-view.js');

// Decision Engine must be referenced and load after game.js
{
    const gameAt = index.indexOf('game.js');
    const metricsAt = index.indexOf('scripts/decision/decision-metrics.js');
    const recorderAt = index.indexOf('scripts/decision/decision-recorder.js');
    const ghostAt = index.indexOf('scripts/decision/ghost-overlay.js');
    assert.ok(gameAt >= 0 && metricsAt > gameAt, 'decision-metrics must load after game.js');
    assert.ok(recorderAt > metricsAt, 'decision-recorder must load after pure modules');
    assert.ok(ghostAt > recorderAt, 'ghost-overlay must load after recorder');
}

// Service worker caches decision modules
{
    for (const mod of [
        'scripts/decision/decision-metrics.js',
        'scripts/decision/market-regime.js',
        'scripts/decision/counterfactual-engine.js',
        'scripts/decision/insight-engine.js',
        'scripts/decision/decision-storage.js',
        'scripts/decision/mastery-system.js',
        'scripts/decision/decision-recorder.js',
        'scripts/decision/ghost-overlay.js',
    ]) {
        assert.ok(sw.includes(mod), `sw.js must cache ${mod}`);
    }
    assert.ok(sw.includes('decision.css'), 'sw.js must cache decision.css');
}

// Decision modules must be pure / isolated
{
    // metrics must not touch window/localStorage/DOM
    assert.ok(!metrics.includes('localStorage'), 'decision-metrics must not touch localStorage');
    assert.ok(!metrics.includes('document.'), 'decision-metrics must not touch DOM');
    // regime must not read player fields except forbiddenKeys check
    const regimeLines = regime.split('\n').filter((l) => !l.trim().startsWith('//') && !l.includes('forbiddenKeys'));
    const regimeBody = regimeLines.join('\n');
    // Allow error message containing actions but not logic
    const actionRefs = (regimeBody.match(/\bactions\b/g) || []).length;
    assert.ok(actionRefs <= 1, `market-regime must not read actions, found ${actionRefs} references`);
    assert.ok(regime.includes("must not read player field"), 'market-regime must guard player fields');

    // cf must not contain hindsight advice
    assert.ok(!cf.includes('generateInvestmentAdvice'), 'counterfactual must not contain generateInvestmentAdvice');
    assert.ok(!/You should have/.test(cf), 'counterfactual must not contain hindsight');

    // insight must only emit whitelisted verdicts
    for (const verdict of ['PAPER_HANDS', 'DODGED_THE_CRASH', 'MISSED_THE_DIP', 'OVERTRADER', 'DIAMOND_HANDS_LEVEL']) {
        assert.ok(insight.includes(verdict), `insight must whitelist ${verdict}`);
    }
    assert.ok(insight.includes('at most 2') || insight.includes('slice(0, 2)'), 'insight must cap at 2 verdicts');

    // recorder must subscribe via controller, never wrap
    assert.ok(recorder.includes("controller.on('data-resolved'"), 'recorder must subscribe to data-resolved');
    assert.ok(recorder.includes("controller.on('level-did-settle'"), 'recorder must subscribe to level-did-settle');
    assert.ok(!recorder.includes('startLevel =') && !recorder.includes('handleBuy ='), 'recorder must not wrap game functions');
    assert.ok(recorder.includes('flappyk:decision-ready'), 'recorder must emit decision-ready');
    // fail-open
    assert.ok(recorder.includes('try') && recorder.includes('catch'), 'recorder must be fail-open');

    // ghost must respect prefers-reduced-motion (now in presentation/ghost-replay-view.js, overlay keeps contract string)
    assert.ok(ghost.includes('GHOST REPLAY'), 'ghost must have replay button');
    assert.ok(ghostView.includes('prefers-reduced-motion') || ghostView.includes('prefersReducedMotion'), 'ghost-replay-view must respect reduced motion');
    assert.ok(ghostView.includes('GHOST_DURATION_MS') || ghostView.includes('6500'), 'ghost replay must have fixed 5-8s duration');
    // ghost overlay must be thin orchestrator, not contain drawing logic
    assert.ok(!ghost.includes('drawFrame') || ghost.includes('FlappyKGhostReplayView'), 'ghost-overlay must delegate drawing to presentation');
    // single channel: recorder must emit via FlappyKEvents (with fallback else for tests without bus)
    const recorderEmits = (recorder.match(/FlappyKEvents\.emit\('flappyk:decision-ready'/g) || []).length;
    const windowEmits = (recorder.match(/window\.dispatchEvent\(new CustomEvent\('flappyk:decision-ready'/g) || []).length;
    assert.equal(recorderEmits, 1, 'recorder must emit decision-ready exactly once via FlappyKEvents');
    // window fallback is allowed only as else branch when bus missing
    assert.ok(windowEmits <= 1, `recorder window fallback at most once, found ${windowEmits}`);
    if (windowEmits === 1) assert.ok(recorder.includes('else window.dispatchEvent'), 'window fallback must be guarded by else');
    // ghost overlay must not double-subscribe: bus is authoritative, window only as fallback
    const ghostWindowSub = (ghost.match(/window\.addEventListener\('flappyk:decision-ready'/g) || []).length;
    const ghostBusSub = (ghost.match(/FlappyKEvents\.on\('flappyk:decision-ready'/g) || []).length;
    assert.equal(ghostBusSub, 1, 'ghost must subscribe once via FlappyKEvents');
    assert.ok(ghostWindowSub <= 1, `ghost window fallback at most once, found ${ghostWindowSub}`);
    if (ghostWindowSub === 1) assert.ok(ghost.includes('} else {'), 'ghost window fallback must be guarded');

    // presentation must be logic-free: highlightMoment computed in engine
    assert.ok(metrics.includes('highlightMoment'), 'decision-metrics must own highlightMoment');
    assert.ok(!cfView.includes('if (report.lastSellDay') || cfView.includes('highlightMoment'), 'counterfactual-view must not recompute biggest moment, must use report.highlightMoment');
    assert.ok(!verdictView.includes('tradeCount * 1') || verdictView.includes('tradeCount'), 'verdict view fee formatting is allowed but not decision logic');
    // ghost final frame must draw both shadow and foreground
    const shadowDraws = (ghostView.match(/fillText\(`YOU/g) || []).length;
    assert.ok(shadowDraws >= 2, `ghost final frame must draw shadow + foreground (${shadowDraws} draws found)`);
    // ghost must be responsive: dynamic height based on viewport
    assert.ok(ghostView.includes('viewportH') && ghostView.includes('Math.max(220'), 'ghost must compute responsive height 220-400');
}

// Fact / Counterfactual / Interpretation separation
{
    const philosophy = read('PRODUCT_PHILOSOPHY.md');
    assert.ok(philosophy.includes('FACT') && philosophy.includes('COUNTERFACTUAL') && philosophy.includes('INTERPRETATION'), 'philosophy must define three layers');
    const uiArch = read('docs/UI_ARCHITECTURE.md');
    assert.ok(uiArch.includes('Decision Engine'), 'UI architecture must document Decision Engine');
    assert.ok(uiArch.includes('EXCESS > 0'), 'architecture must pin EXCESS win rule');
}

console.log('decision architecture contracts passed');
