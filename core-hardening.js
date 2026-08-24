(() => {
    'use strict';

    const controller = window.FlappyKGameController;

    const hardenedSettleState = {
        completedLevel: 1,
        wasCustomChallenge: false,
    };

    controller?.on('level-will-settle', () => {
        hardenedSettleState.completedLevel = level;
        hardenedSettleState.wasCustomChallenge = levelDisp.textContent === 'CUSTOM';
    });

    controller?.on('level-did-settle', () => {
        const card = document.getElementById('profit-card');
        const title = document.getElementById('card-title');
        if (!card || !title) return;

        if (hardenedSettleState.wasCustomChallenge) {
            card.dataset.resultMode = 'custom';
            delete card.dataset.completedLevel;
            return;
        }

        card.dataset.resultMode = 'normal';
        card.dataset.completedLevel = String(hardenedSettleState.completedLevel);
        title.textContent = 'PROFIT CARD';
    });

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
