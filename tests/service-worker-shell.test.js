const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const serviceWorker = readFileSync(join(root, 'sw.js'), 'utf8');
const shellMatch = serviceWorker.match(/const APP_SHELL = \[([\s\S]*?)\];/);

assert.ok(shellMatch, 'Service worker must declare APP_SHELL.');

const assets = [...shellMatch[1].matchAll(/['"](\.\/[^'"]+)['"]/g)]
    .map((match) => match[1]);

for (const asset of assets) {
    if (asset === './') continue;
    assert.ok(
        existsSync(join(root, asset.slice(2))),
        `Service worker APP_SHELL references missing asset: ${asset}`
    );
}

assert.ok(
    !assets.includes('./scripts/premium-ui-refinement.js'),
    'Retired premium UI refinement must not return to the offline shell.'
);

console.log(`Validated ${assets.length} service-worker app-shell entries.`);
