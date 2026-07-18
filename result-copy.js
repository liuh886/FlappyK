(() => {
    'use strict';

    function normalizedResultTitle(value) {
        const text = String(value || '').trim();

        if (/^PROFIT CARD\b/.test(text)) {
            return text.replace(/^PROFIT CARD\b/, 'RESULT CARD');
        }

        if (text === 'CUSTOM CARD') {
            return 'CUSTOM RESULT';
        }

        return text;
    }

    function normalizeTitleElement(element) {
        if (!element) return;
        const normalized = normalizedResultTitle(element.textContent);
        if (normalized !== element.textContent) {
            element.textContent = normalized;
        }
    }

    const settlementTitle = document.getElementById('card-title');
    normalizeTitleElement(settlementTitle);

    if (settlementTitle) {
        new MutationObserver(() => normalizeTitleElement(settlementTitle))
            .observe(settlementTitle, { childList: true, characterData: true, subtree: true });
    }

    const legendArea = document.getElementById('champagne-export-area');

    function normalizeLegendTitles() {
        legendArea?.querySelectorAll('.profit-card h2').forEach(normalizeTitleElement);
    }

    normalizeLegendTitles();

    if (legendArea) {
        new MutationObserver(normalizeLegendTitles)
            .observe(legendArea, { childList: true, subtree: true });
    }
})();