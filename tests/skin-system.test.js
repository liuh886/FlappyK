'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const skinsCss = read('skins.css');
const skinSystem = read('scripts/skin-system.js');
const serviceWorker = read('sw.js');
const indexHtml = read('index.html');
const i18nCore = read('scripts/i18n-core.js');
const membershipConfig = read('membership-config.js');
const canvas = read('scripts/market-canvas.js');
const accountCss = read('account-integration.css');

// --- Catalog stability ------------------------------------------------------

const CATALOG_IDS = ['arcade', 'polar', 'amber'];
for (const id of CATALOG_IDS) {
    assert.ok(
        new RegExp(`id: '${id}'`).test(skinSystem),
        `Skin catalog must declare '${id}'.`,
    );
    assert.ok(
        new RegExp(`id: '${id}'[\\s\\S]{0,400}?atmosphere: '(none|snow|dust)'`).test(skinSystem),
        `Skin '${id}' must declare its ambient atmosphere kind.`,
    );
}
assert.ok(skinSystem.includes('getActiveSkin()'), 'The manifest must expose the full active skin profile.');
assert.ok(/SKIN_STORAGE_KEY = 'flappyk_skin_v1'/.test(skinSystem), 'The skin preference must persist under the stable key.');
assert.ok(skinSystem.includes('flappyk:skin-changed'), 'Switching skins must publish on the event bus.');
assert.ok(/root\.dataset\.skin\s*=\s*skin\.id/.test(skinSystem), 'Skins apply through the html data-skin attribute.');

// --- Token completeness per skin -------------------------------------------

const REQUIRED_TOKENS = [
    '--game-bg',
    '--game-surface',
    '--game-surface-raised',
    '--game-surface-active',
    '--game-border',
    '--game-border-strong',
    '--game-text',
    '--game-muted',
    '--game-faint',
    '--game-accent',
    '--game-system',
    '--game-green',
    '--game-red',
    '--game-depth',
];

const blocks = skinsCss.match(/html\[data-skin='([a-z]+)'\]\s*\{([\s\S]*?)\n\}/g) || [];
const blockIds = blocks.map((block) => block.match(/data-skin='([a-z]+)'/)[1]);
for (const id of ['polar', 'amber']) {
    assert.ok(blockIds.includes(id), `skins.css must define the ${id} token set.`);
    const block = blocks.find((candidate) => candidate.includes(`data-skin='${id}'`));
    for (const token of REQUIRED_TOKENS) {
        assert.ok(
            new RegExp(`${token}:\\s*#[0-9a-fA-F]{6}`).test(block),
            `Skin ${id} must define a concrete hex value for ${token}.`,
        );
    }
}

// Skins may only override tokens; component selectors are forbidden here.
assert.ok(!/[^-\w.](\.[a-z-]+\s*[,{])/i.test(skinsCss.replace(/html\[data-skin[^\{]*\{/g, '')), 'skins.css must stay token-only (no component selectors).');
assert.ok(!skinsCss.includes('shadowBlur') && !/gradient/i.test(skinsCss), 'Skins must not reintroduce glow or gradients.');

// Semantic color roles survive every palette swap.
for (const block of blocks) {
    const accent = block.match(/--game-accent:\s*(#[0-9a-fA-F]{6})/)[1];
    const system = block.match(/--game-system:\s*(#[0-9a-fA-F]{6})/)[1];
    assert.notEqual(accent.toLowerCase(), system.toLowerCase(), 'Accent and system roles must remain visually distinct.');
}

// --- Offline shell + entry wiring --------------------------------------------

assert.ok(serviceWorker.includes("'./skins.css'"), 'The offline shell must cache skins.css.');
assert.ok(serviceWorker.includes("'./scripts/skin-system.js'"), 'The offline shell must cache the skin manifest runtime.');
assert.ok(indexHtml.includes('<script defer src="scripts/skin-system.js"></script>'), 'skin-system.js must load deferred from the head to avoid palette flash.');
assert.ok(indexHtml.includes('href="skins.css"'), 'index.html must load the skin token sets.');

// --- Home toolbar entry -------------------------------------------------------

assert.ok(membershipConfig.includes("id = 'skin-toggle-slot'"), 'The home toolbar must reserve a skin slot.');
assert.ok(skinSystem.includes("getElementById('skin-toggle-slot')"), 'skin-system must mount its cycle button into the reserved slot.');
assert.ok(accountCss.includes('.home-skin-slot'), 'Toolbar presentation must own the skin slot geometry.');

// --- Bilingual labels ---------------------------------------------------------

for (const entry of [
    "'Skin: Market Arcade': '皮肤：像素街机'",
    "'Skin: Polar Exchange': '皮肤：极地冰原'",
    "'Skin: Amber Terminal': '皮肤：琥珀终端'",
]) {
    assert.ok(i18nCore.includes(entry), `Missing bilingual skin label: ${entry}`);
}

// --- Canvas follows the active skin ------------------------------------------

assert.ok(canvas.includes('refreshPalette'), 'market-canvas must export refreshPalette for instant re-theming.');
assert.ok(canvas.includes('FlappyKSkins?.getActive'), 'The avatar crest reads the active skin identity.');

console.log('Skin manifest, token completeness, offline shell, and toolbar contracts passed.');
