'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'i18n.js'), 'utf8');

assert.match(source, /navigator\.languages/, 'Language detection must respect the browser preference list.');
assert.match(source, /storedLanguage/, 'A saved manual language choice must remain supported.');
assert.ok(source.includes('meta[property="og:title"]'), 'Open Graph title must be localized.');
assert.ok(source.includes('meta[name="twitter:description"]'), 'Twitter description must be localized.');

console.log('FlappyK i18n language contract passed.');
