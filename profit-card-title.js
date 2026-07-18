(() => {
    'use strict';

    const normalizeProfitCardTitle = (element) => {
        if (!element) return;

        const text = String(element.textContent || '').trim();
        if (/^PROFIT CARD(?:\s*\(\d+\))?$/.test(text) && text !== 'PROFIT CARD') {
            element.textContent = 'PROFIT CARD';
        }
    };

    const settlementTitle = document.getElementById('card-title');
    normalizeProfitCardTitle(settlementTitle);

    if (settlementTitle) {
        new MutationObserver(() => normalizeProfitCardTitle(settlementTitle))
            .observe(settlementTitle, { childList: true, characterData: true, subtree: true });
    }

    const legendArea = document.getElementById('champagne-export-area');

    const normalizeLegendTitles = () => {
        legendArea?.querySelectorAll('.profit-card h2').forEach(normalizeProfitCardTitle);
    };

    normalizeLegendTitles();

    if (legendArea) {
        new MutationObserver(normalizeLegendTitles)
            .observe(legendArea, { childList: true, subtree: true });
    }
})();