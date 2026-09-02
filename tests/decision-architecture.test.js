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

    // ghost must respect prefers-reduced-motion
    assert.ok(ghost.includes('prefers-reduced-motion') || ghost.includes('prefersReducedMotion'), 'ghost must respect reduced motion');
    assert.ok(ghost.includes('GHOST REPLAY'), 'ghost must have replay button');
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
