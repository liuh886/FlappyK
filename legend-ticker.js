(() => {
    'use strict';

    const formatReturn = (value) =>
        `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;

    function parseReturn(value) {
        const parsed = Number.parseFloat(String(value || '').replace('%', ''));
        return Number.isFinite(parsed) ? parsed / 100 : 0;
    }

    function attachCompletedLevelMetrics() {
        const previousEndLevel = endLevel;

        endLevel = function legendAwareEndLevel() {
            const completedLevel = level;
            const projectedCash = cash + (shares * currentPrice);
            const levelReturn = (projectedCash - levelStartCash) / levelStartCash;
            const startPrice = currentData[0].close;
            const marketReturn = (currentPrice - startPrice) / startPrice;
            const days = currentData.length;

            previousEndLevel();

            const completedCard = collectedCards.find((card) => card.level === completedLevel);
            if (completedCard) {
                completedCard.levelReturn = levelReturn;
                completedCard.marketReturn = marketReturn;
                completedCard.excessReturn = levelReturn - marketReturn;
                completedCard.days = days;
            }
        };
    }

    function buildLegendSummary() {
        const ticker = document.getElementById('legend-ticker');
        if (!ticker || collectedCards.length === 0) return;

        let benchmarkGrowth = 1;
        let totalDays = 0;

        collectedCards.forEach((card) => {
            const levelReturn = Number.isFinite(card.levelReturn)
                ? card.levelReturn
                : parseReturn(card.levelRetStr);
            const excessReturn = Number.isFinite(card.excessReturn)
                ? card.excessReturn
                : parseReturn(card.excessRetStr);
            const marketReturn = Number.isFinite(card.marketReturn)
                ? card.marketReturn
                : levelReturn - excessReturn;

            benchmarkGrowth *= (1 + marketReturn);
            totalDays += Number.isFinite(card.days) ? card.days : DAYS_PER_LEVEL;
        });

        const totalGain = Number.isFinite(finalReturn)
            ? finalReturn
            : parseReturn(collectedCards[collectedCards.length - 1]?.cumRetStr);
        const benchmarkReturn = benchmarkGrowth - 1;
        const totalExcess = totalGain - benchmarkReturn;
        const summary = [
            '3 MARKETS CONQUERED',
            `GAIN ${formatReturn(totalGain)} IN ${totalDays} DAYS`,
            `EXCESS ${formatReturn(totalExcess)} TOTAL`,
            'CRYPTO',
            'A-SHARES',
            'US STOCKS'
        ].join(' • ');

        ticker.setAttribute('aria-label', summary);
        ticker.querySelectorAll('.legend-ticker-item').forEach((item) => {
            item.textContent = summary;
        });
    }

    attachCompletedLevelMetrics();

    if (typeof champagneBtn !== 'undefined' && champagneBtn) {
        champagneBtn.addEventListener('click', () => {
            requestAnimationFrame(buildLegendSummary);
        });
    }
})();
