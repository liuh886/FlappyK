(() => {
    'use strict';

    let customSelectionPending = false;

    document.getElementById('custom-start-btn')?.addEventListener('click', () => {
        customSelectionPending = true;
    }, { capture: true });

    document.getElementById('custom-retry-btn')?.addEventListener('click', () => {
        customSelectionPending = true;
    }, { capture: true });

    document.getElementById('custom-cancel-btn')?.addEventListener('click', () => {
        customSelectionPending = false;
    }, { capture: true });

    document.getElementById('custom-change-btn')?.addEventListener('click', () => {
        customSelectionPending = false;
    }, { capture: true });

    const previousPickRandomData = pickRandomData;
    pickRandomData = function hardenedPickRandomData() {
        if (customSelectionPending) {
            customSelectionPending = false;
            return previousPickRandomData();
        }

        if (level === 1) currentMarket = 'crypto';
        else if (level === 2) currentMarket = 'ashare';
        else currentMarket = 'usstock';

        const eligibleAssets = Object.keys(stockData[currentMarket] || {})
            .filter((asset) => Array.isArray(stockData[currentMarket][asset]))
            .filter((asset) => stockData[currentMarket][asset].length >= DAYS_PER_LEVEL);

        if (eligibleAssets.length === 0) {
            throw new Error(`No ${currentMarket} asset has ${DAYS_PER_LEVEL} usable days`);
        }

        currentAsset = eligibleAssets[Math.floor(Math.random() * eligibleAssets.length)];
        const data = stockData[currentMarket][currentAsset];
        const maxStart = data.length - DAYS_PER_LEVEL;
        const startIndex = Math.floor(Math.random() * (maxStart + 1));

        return data.slice(startIndex, startIndex + DAYS_PER_LEVEL);
    };

    const previousStartLevel = startLevel;
    startLevel = function hardenedStartLevel() {
        previousStartLevel();

        if (levelDisp.textContent !== 'CUSTOM') {
            const visibleGame = Math.min(Math.max(level, 1), 3);
            levelDisp.textContent = `${visibleGame}/3`;
        }
    };

    function replaceControl(id, handler) {
        const original = document.getElementById(id);
        if (!original) return;

        const replacement = original.cloneNode(true);
        original.replaceWith(replacement);

        replacement.addEventListener('click', (event) => {
            event.preventDefault();
            handler();
        });
    }

    replaceControl('btn-buy', handleBuy);
    replaceControl('btn-sell', handleSell);
    replaceControl('btn-speed-up', () => changeSpeed(1));
    replaceControl('btn-speed-down', () => changeSpeed(-1));

    const previousEndLevel = endLevel;
    endLevel = function hardenedEndLevel() {
        const completedLevel = level;
        const wasCustomChallenge = levelDisp.textContent === 'CUSTOM';

        previousEndLevel();

        const card = document.getElementById('profit-card');
        const title = document.getElementById('card-title');
        if (!card || !title) return;

        if (wasCustomChallenge) {
            card.dataset.resultMode = 'custom';
            delete card.dataset.completedLevel;
            return;
        }

        card.dataset.resultMode = 'normal';
        card.dataset.completedLevel = String(completedLevel);
        title.textContent = 'PROFIT CARD';
    };

    if (champagneBtn) {
        champagneBtn.addEventListener('click', () => {
            champagneExportArea
                .querySelectorAll('.profit-card h2')
                .forEach((title) => {
                    title.textContent = 'PROFIT CARD';
                });
        });
    }
})();