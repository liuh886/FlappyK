/**
 * FlappyK Verdict View — settlement fact cards.
 * Owner: scripts/decision/presentation/verdict-view.js
 * Pure presentation: renders whitelisted verdicts as FACT lines. No recomputation.
 */
(function exposeVerdictView(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKVerdictView = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    function formatPercent(value) {
        if (!Number.isFinite(Number(value))) return '---%';
        const num = Number(value) * 100;
        return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
    }

    function verdictCopy(id, payload) {
        const t = (typeof window !== 'undefined' && window.FlappyKI18n?.t) ? window.FlappyKI18n.t : (v) => v;
        const report = payload.report;
        switch (id) {
            case 'PAPER_HANDS':
                return {
                    title: t('PAPER HANDS'),
                    body: `SOLD DAY ${report.lastSellDay !== null ? String(report.lastSellDay + 1).padStart(3, '0') : '---'} · AFTER ${formatPercent(report.returnAfterLastSell)}`,
                    sub: `IF HELD FROM FIRST BUY: ${formatPercent(payload.counterfactuals?.firstEntryHold?.return)}`,
                };
            case 'DODGED_THE_CRASH':
                return {
                    title: t('DODGED THE CRASH'),
                    body: `MARKET ${formatPercent(report.marketReturn)} · YOU ${formatPercent(report.playerReturn)}`,
                    sub: `DEFENSE ${formatPercent(report.excessReturn)}`,
                };
            case 'MISSED_THE_DIP':
                return {
                    title: t('MISSED THE DIP'),
                    body: `BOTTOM → +${formatPercent(report.marketReturn).replace('+', '')} · YOU STAYED IN CASH`,
                    sub: `MAX DD ${formatPercent(-(report.marketMaxDrawdown ?? report.maxDrawdown))}`,
                };
            case 'OVERTRADER':
                return {
                    title: t('OVERTRADER'),
                    body: `${report.tradeCount} TRADES · $${report.tradeCount * 1} FEES`,
                    sub: `EXCESS ${formatPercent(report.excessReturn)}`,
                };
            case 'DIAMOND_HANDS_LEVEL':
                return {
                    title: t('DIAMOND HANDS'),
                    body: `HELD ${report.longestHoldDays} DAYS`,
                    sub: `${report.tradeCount} TRADES`,
                };
            default:
                return { title: id, body: '', sub: '' };
        }
    }

    function render(payload) {
        const card = typeof document !== 'undefined' ? document.getElementById('profit-card') : null;
        if (!card || !payload?.verdicts || payload.verdicts.length === 0) return null;

        const container = document.createElement('div');
        container.className = 'decision-verdicts';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');

        payload.verdicts.forEach((verdict) => {
            const verdictId = verdict.id || verdict;
            const copy = verdictCopy(verdictId, payload);
            const el = document.createElement('div');
            el.className = `decision-verdict decision-verdict--${String(verdictId).toLowerCase()}`;
            el.dataset.verdict = verdictId;

            const title = document.createElement('strong');
            title.className = 'decision-verdict-title';
            title.textContent = copy.title;

            const body = document.createElement('span');
            body.className = 'decision-verdict-body';
            body.textContent = copy.body;

            const sub = document.createElement('small');
            sub.className = 'decision-verdict-sub';
            sub.textContent = copy.sub;

            el.append(title, body, sub);
            container.appendChild(el);
        });

        const details = card.querySelector('.card-details');
        if (details) card.insertBefore(container, details);
        else card.appendChild(container);
        return container;
    }

    function clear() {
        if (typeof document === 'undefined') return;
        document.querySelectorAll('.decision-verdicts').forEach((el) => el.remove());
    }

    return { render, clear, verdictCopy, formatPercent };
});
