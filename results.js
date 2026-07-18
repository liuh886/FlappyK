// `game.js` still reads this legacy global when advancing to the next level.
// Keep it in sync with cumulative return until the game state is modularized.
var finalReturn = 0;

(() => {
    'use strict';

    const formatReturn = (value) =>
        `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;

    const originalStartLevel = startLevel;
    startLevel = function resultsAwareStartLevel() {
        originalStartLevel();
        targetDisp.innerText = level === 1
            ? 'ANY PROFIT'
            : `> ${(targetReturn * 100).toFixed(2)}%`;
    };

    const originalEndLevel = endLevel;
    endLevel = function resultsAwareEndLevel() {
        const completedLevel = level;
        const projectedCash = cash + (shares * currentPrice);
        const levelReturn = (projectedCash - levelStartCash) / levelStartCash;
        const startPrice = currentData[0].close;
        const marketReturn = (currentPrice - startPrice) / startPrice;
        const excessReturn = levelReturn - marketReturn;
        const excessRetStr = formatReturn(excessReturn);

        // Fix the undefined `finalReturn` reference used by the original function.
        finalReturn = (projectedCash - INITIAL_CASH) / INITIAL_CASH;

        originalEndLevel();

        const excessElement = document.getElementById('card-excess-return');
        if (excessElement) excessElement.innerText = excessRetStr;

        const statusElement = document.getElementById('card-status');
        if (statusElement) {
            statusElement.innerText = statusElement.classList.contains('card-positive')
                ? 'TARGET BEATEN!'
                : 'TARGET MISSED.';
        }

        const completedCard = collectedCards.find((card) => card.level === completedLevel);
        if (completedCard) completedCard.excessRetStr = excessRetStr;
    };

    function polishLegendCards() {
        const cards = champagneExportArea.querySelectorAll('.profit-card');

        cards.forEach((card, index) => {
            const details = card.querySelector('.card-details');
            const cardData = collectedCards[index];

            if (details && cardData && !details.querySelector('.legend-excess-return')) {
                const row = document.createElement('p');
                row.className = 'legend-excess-return';
                row.innerHTML = `EXCESS: <span class="highlight">${cardData.excessRetStr || '---%'}</span>`;
                details.appendChild(row);
            }

            card.querySelector('.status-msg')?.remove();

            const totalReturnLabel = card.querySelector('.big-return + div');
            if (totalReturnLabel) totalReturnLabel.textContent = 'TOTAL RETURN';
        });

        if (cards.length > 0 && !champagneExportArea.querySelector('.legend-watermark')) {
            const watermark = document.createElement('div');
            watermark.className = 'legend-watermark';
            watermark.textContent = 'FlappyK by zhihao';
            champagneExportArea.appendChild(watermark);
        }
    }

    const legendObserver = new MutationObserver(polishLegendCards);
    legendObserver.observe(champagneExportArea, { childList: true });
})();
