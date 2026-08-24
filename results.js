// `game.js` still reads this legacy global when advancing to the next level.
// Keep it in sync with cumulative return until the game state is modularized.
var finalReturn = 0;

(() => {
    'use strict';

    window.FlappyKGameController?.on('level-did-settle', ({ projectedCash }) => {
        if (!Number.isFinite(Number(projectedCash))) return;
        finalReturn = (Number(projectedCash) - INITIAL_CASH) / INITIAL_CASH;
    });

    function polishLegendCards() {
        const cards = champagneExportArea.querySelectorAll('.profit-card');

        cards.forEach((card, index) => {
            const details = card.querySelector('.card-details');
            const cardData = collectedCards[index];

            if (details && cardData && !details.querySelector('.legend-market-return')) {
                const row = document.createElement('p');
                row.className = 'legend-market-return';
                row.append(
                    'MARKET RETURN: ',
                    Object.assign(document.createElement('span'), {
                        className: 'highlight',
                        textContent: cardData.marketRetStr || '---%',
                    }),
                );
                details.appendChild(row);
            }

            if (details && cardData && !details.querySelector('.legend-excess-return')) {
                const row = document.createElement('p');
                row.className = 'legend-excess-return';
                row.append(
                    'EXCESS: ',
                    Object.assign(document.createElement('span'), {
                        className: 'highlight',
                        textContent: cardData.excessRetStr || '---%',
                    }),
                );
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
