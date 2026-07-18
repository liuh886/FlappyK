(() => {
    'use strict';

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
