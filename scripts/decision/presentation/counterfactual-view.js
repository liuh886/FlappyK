/**
 * FlappyK Counterfactual View — compact labeled comparison.
 * Owner: scripts/decision/presentation/counterfactual-view.js
 * P1 will replace this with Decision Summary ≤3 lines; keep API stable.
 */
(function exposeCounterfactualView(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKCounterfactualView = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    function formatPercent(value) {
        if (!Number.isFinite(Number(value))) return '---%';
        const num = Number(value) * 100;
        return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
    }

    function render(payload) {
        const card = typeof document !== 'undefined' ? document.getElementById('profit-card') : null;
        if (!card) return null;
        const report = payload.report;
        const cf = payload.counterfactuals;
        if (!cf) return null;

        const wrapper = document.createElement('div');
        wrapper.className = 'decision-counterfactuals-wrap';

        const title = document.createElement('div');
        title.className = 'decision-cf-title';
        title.textContent = 'COUNTERFACTUALS — LABELED PARALLEL UNIVERSES';

        const bar = document.createElement('div');
        bar.className = 'decision-counterfactuals';

        const items = [
            { label: 'YOU', value: report.playerReturn, kind: 'you' },
            { label: 'MARKET', value: report.marketReturn, kind: 'market' },
            { label: 'HOLD', value: cf.buyAndHold.return, kind: 'hold' },
        ];
        if (cf.firstEntryHold?.applicable) {
            items.push({ label: 'FIRST BUY HOLD', value: cf.firstEntryHold.return, kind: 'first' });
        }

        items.forEach((item) => {
            const row = document.createElement('div');
            row.className = `decision-cf-row decision-cf-row--${item.kind}`;
            const label = document.createElement('span');
            label.className = 'decision-cf-label';
            label.textContent = item.label;
            const value = document.createElement('strong');
            value.className = 'decision-cf-value';
            value.textContent = formatPercent(item.value);
            if (item.value > 0) value.classList.add('positive');
            else if (item.value < 0) value.classList.add('negative');
            row.append(label, value);
            bar.appendChild(row);
        });

        wrapper.append(title, bar);

        const verdicts = card.querySelector('.decision-verdicts');
        if (verdicts) verdicts.after(wrapper);
        else {
            const details = card.querySelector('.card-details');
            if (details) card.insertBefore(wrapper, details);
            else card.appendChild(wrapper);
        }
        return wrapper;
    }

    function renderSummary(payload) {
        // P1: compact Decision Summary ≤3 lines — YOU/HOLD + BIGGEST MOMENT (engine-owned)
        const card = typeof document !== 'undefined' ? document.getElementById('profit-card') : null;
        if (!card) return null;
        const report = payload.report;
        const cf = payload.counterfactuals;
        if (!report || !cf) return null;

        const wrap = document.createElement('div');
        wrap.className = 'decision-summary';

        const row = document.createElement('div');
        row.className = 'decision-summary-row';

        const you = document.createElement('span');
        you.className = 'decision-summary-item decision-summary-item--you';
        you.innerHTML = `YOU <strong class="${report.playerReturn >= 0 ? 'positive' : 'negative'}">${formatPercent(report.playerReturn)}</strong>`;

        const hold = document.createElement('span');
        hold.className = 'decision-summary-item decision-summary-item--hold';
        hold.innerHTML = `HOLD <strong>${formatPercent(cf.buyAndHold.return)}</strong>`;

        const vs = document.createElement('span');
        vs.className = 'decision-summary-vs';
        // Gap is derived from engine fact: hold - you == -excessReturn (traceable, not view logic beyond formatting)
        const gap = cf.buyAndHold.return - report.playerReturn;
        vs.textContent = gap > 0 ? `HOLD +${(gap * 100).toFixed(1)}% ahead` : gap < 0 ? `YOU +${(-gap * 100).toFixed(1)}% ahead` : 'EVEN';

        row.append(you, vs, hold);

        const moment = document.createElement('div');
        moment.className = 'decision-summary-moment';
        const hm = report.highlightMoment;
        if (hm && hm.type === 'SOLD_AFTER') {
            moment.textContent = `BIGGEST MOMENT · SOLD DAY ${String(hm.day + 1).padStart(3, '0')} · AFTER ${formatPercent(hm.value)}`;
        } else if (hm && hm.type === 'MARKET_DD') {
            moment.textContent = `BIGGEST MOMENT · MARKET DD ${formatPercent(-hm.value)} · YOU ${formatPercent(report.excessReturn)} EXCESS`;
        } else if (hm && hm.type === 'FEE_DRAG') {
            moment.textContent = `BIGGEST MOMENT · ${report.tradeCount} TRADES · FEE ${formatPercent(-hm.value)}`;
        } else if (hm) {
            moment.textContent = `MOMENT · ${hm.type} ${formatPercent(hm.value)}`;
        } else {
            moment.textContent = `MOMENT · ${report.tradeCount} TRADES · FEE ${formatPercent(-report.feeDrag)}`;
        }

        wrap.append(row, moment);

        const verdicts = card.querySelector('.decision-verdicts');
        if (verdicts) verdicts.after(wrap);
        else {
            const details = card.querySelector('.card-details');
            if (details) card.insertBefore(wrap, details);
            else card.appendChild(wrap);
        }
        return wrap;
    }

    function clear() {
        if (typeof document === 'undefined') return;
        document.querySelectorAll('.decision-counterfactuals-wrap, .decision-summary').forEach((el) => el.remove());
    }

    return { render, renderSummary, clear, formatPercent };
});
