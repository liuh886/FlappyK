(function exposeMarketPassRule(root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.FlappyKMarketPassRule = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    function evaluate({ startCash, finalCash, startPrice, finalPrice }) {
        const values = { startCash, finalCash, startPrice, finalPrice };

        Object.entries(values).forEach(([name, value]) => {
            if (!Number.isFinite(value)) {
                throw new TypeError(`${name} must be a finite number`);
            }
        });

        if (startCash <= 0) throw new RangeError('startCash must be greater than zero');
        if (startPrice <= 0) throw new RangeError('startPrice must be greater than zero');

        const playerReturn = (finalCash - startCash) / startCash;
        const marketReturn = (finalPrice - startPrice) / startPrice;
        const excessReturn = playerReturn - marketReturn;

        return {
            playerReturn,
            marketReturn,
            excessReturn,
            isSuccess: excessReturn > 0,
        };
    }

    return { evaluate };
});

(() => {
    'use strict';

    if (typeof window === 'undefined'
        || typeof startLevel !== 'function'
        || typeof endLevel !== 'function') {
        return;
    }

    const ruleApi = window.FlappyKMarketPassRule;
    const formatReturn = (value) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;

    const previousStartLevel = startLevel;
    startLevel = function marketPassStartLevel() {
        previousStartLevel();
        targetDisp.innerText = 'BEAT THE MARKET';
    };

    endLevel = function marketPassEndLevel() {
        clearInterval(gameInterval);
        isPlaying = false;
        stopAudio();

        cash += shares * currentPrice;
        shares = 0;

        const performance = ruleApi.evaluate({
            startCash: levelStartCash,
            finalCash: cash,
            startPrice: currentData[0].close,
            finalPrice: currentPrice,
        });

        const levelRetStr = formatReturn(performance.playerReturn);
        const marketRetStr = formatReturn(performance.marketReturn);
        const excessRetStr = formatReturn(performance.excessReturn);
        const cumReturn = (cash - INITIAL_CASH) / INITIAL_CASH;
        const cumRetStr = formatReturn(cumReturn);

        settlementScreen.classList.add('active');
        const profitCard = document.getElementById('profit-card');
        profitCard.className = 'profit-card';
        profitCard.classList.add(`card-theme-${currentMarket}`);

        document.getElementById('card-title').innerText = `PROFIT CARD (${level})`;
        document.getElementById('card-asset').innerText = currentAsset;
        document.getElementById('card-start-cash').innerText = levelStartCash.toFixed(2);
        document.getElementById('card-final-cash').innerText = cash.toFixed(2);
        document.getElementById('card-level-return').innerText = levelRetStr;
        document.getElementById('card-market-return').innerText = marketRetStr;
        document.getElementById('card-excess-return').innerText = excessRetStr;

        let peak = totalHistory[0];
        let maxDrawdown = 0;
        for (let i = 0; i < totalHistory.length; i++) {
            if (totalHistory[i] > peak) peak = totalHistory[i];
            const drawdown = (peak - totalHistory[i]) / peak;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
        const mddStr = `-${(maxDrawdown * 100).toFixed(2)}%`;

        document.getElementById('card-return').innerText = cumRetStr;
        document.getElementById('card-small-return').innerText = cumRetStr;
        document.getElementById('card-final').innerText = cash.toFixed(2);

        const startDate = currentData[0].date;
        const endDate = currentData[dayIndex].date;
        document.getElementById('card-period').innerText = `${startDate} ~ ${endDate}`;

        const statusMsg = document.getElementById('card-status');
        const retElem = document.getElementById('card-return');
        retElem.className = `big-return ${cumReturn > 0
            ? 'card-positive'
            : cumReturn < 0
                ? 'card-negative'
                : 'card-neutral'}`;

        if (performance.isSuccess) {
            statusMsg.innerText = 'MARKET BEATEN!';
            statusMsg.className = 'status-msg card-positive';

            collectedCards.push({
                level,
                market: currentMarket,
                asset: currentAsset,
                startCashStr: `$${levelStartCash.toFixed(2)}`,
                finalCashStr: `$${cash.toFixed(2)}`,
                mddStr,
                periodStr: `${startDate} ~ ${endDate}`,
                levelRetStr,
                marketRetStr,
                excessRetStr,
                cumRetStr,
            });

            if (level === 3) {
                nextBtn.style.display = 'none';
                champagneBtn.style.display = 'block';
                saveBtn.style.display = 'none';
            } else {
                nextBtn.style.display = 'block';
                champagneBtn.style.display = 'none';
                saveBtn.style.display = 'block';
            }
            restartBtn.style.display = 'none';

            level++;
            targetReturn = 0;
        } else {
            statusMsg.innerText = 'MARKET WON.';
            statusMsg.className = 'status-msg card-negative';
            nextBtn.style.display = 'none';
            champagneBtn.style.display = 'none';
            saveBtn.style.display = 'none';
            restartBtn.style.display = 'block';
        }
    };
})();
