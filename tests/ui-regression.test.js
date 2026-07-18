const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let titleWrites = 0;
const title = {
    value: 'PROFIT CARD (1)',
    get textContent() {
        return this.value;
    },
    set textContent(nextValue) {
        this.value = nextValue;
        titleWrites += 1;
    },
};

const buyIcon = { textContent: '' };
const legendArea = { querySelectorAll: () => [] };
const observerCallbacks = [];

class FakeMutationObserver {
    constructor(callback) {
        observerCallbacks.push(callback);
    }

    observe() {}
}

const sandbox = {
    document: {
        querySelector: () => buyIcon,
        getElementById: (id) => {
            if (id === 'card-title') return title;
            if (id === 'champagne-export-area') return legendArea;
            return null;
        },
    },
    MutationObserver: FakeMutationObserver,
};

vm.runInNewContext(
    fs.readFileSync('interface-polish.js', 'utf8'),
    sandbox,
    { filename: 'interface-polish.js' },
);

assert.equal(buyIcon.textContent, '🐂');
assert.equal(title.textContent, 'PROFIT CARD');
assert.equal(titleWrites, 1);

observerCallbacks[0]();
assert.equal(title.textContent, 'PROFIT CARD');
assert.equal(titleWrites, 1, 'normalized title must not trigger repeated DOM writes');

const experienceSource = fs.readFileSync('experience.js', 'utf8');
assert.doesNotMatch(experienceSource, /AUTO_NEXT|nextBtn\.click|setTimeout/);
assert.match(experienceSource, /event\.key !== 'Escape'/);

console.log('UI regression checks passed');
