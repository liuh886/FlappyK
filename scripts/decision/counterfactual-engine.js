/**
 * FlappyK Counterfactual Engine — pure parallel-universe simulations.
 * Owner: scripts/decision/counterfactual-engine.js
 * All curves are labeled, fee-free where specified, and never presented as advice.
 */
(function exposeCounterfactualEngine(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKCounterfactuals = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const VERSION = 1;
    const TRADE_AMOUNT = 1000;
    const FEE = 1;

    function closesFromData(currentData) {
        if (!Array.isArray(currentData) || currentData.length === 0) throw new TypeError('currentData is required');
        return currentData.map((row) => {
            if (row && typeof row === 'object' && 'close' in row) return Number(row.close);
            return Number(row);
        });
    }

    function simulate(input) {
        if (!input || typeof input !== 'object') throw new TypeError('simulate requires an options object');
        const currentData = input.currentData;
        const actions = Array.isArray(input.actions) ? input.actions : (Array.isArray(input.timeline?.actions) ? input.timeline.actions : []);
        const levelStartCash = Number(input.levelStartCash ?? input.startCash);
        if (!Number.isFinite(levelStartCash) || levelStartCash <= 0) throw new RangeError('levelStartCash must be > 0');
        const closes = closesFromData(currentData);
        if (closes.length < 2) throw new TypeError('currentData must have at least 2 closes');
        const startPrice = closes[0];
        const finalPrice = closes[closes.length - 1];
        if (!Number.isFinite(startPrice) || startPrice <= 0) throw new RangeError('startPrice must be > 0');

        // Buy & Hold: 100% exposure from day 0, fee-free, normalized to levelStartCash
        const buyAndHoldEquity = closes.map((close) => levelStartCash * (close / startPrice));
        const buyAndHoldReturn = finalPrice / startPrice - 1;
        const buyAndHoldFinalCash = buyAndHoldEquity[buyAndHoldEquity.length - 1];

        // No Trade: flat
        const noTradeEquity = new Array(closes.length).fill(levelStartCash);
        const noTradeReturn = 0;

        // First Entry Hold: if there is at least one buy, spend TRADE_AMOUNT+fee at first buy price then hold remainder in cash
        // We model: at first buy day, buy TRADE_AMOUNT/price shares, cash reduces by TRADE_AMOUNT+FEE, then hold.
        // Equity = cashRemaining + shares * close[i]
        let firstEntryHoldEquity = null;
        let firstEntryHoldReturn = 0;
        let firstEntryHoldFinalCash = levelStartCash;
        let applicable = false;

        let firstBuy = null;
        for (const act of actions) {
            if (act && act.type === 'buy') {
                firstBuy = act;
                break;
            }
        }
        if (firstBuy) {
            const firstBuyPrice = Number(firstBuy.price ?? closes[Number(firstBuy.day) ?? 0]);
            const firstBuyDay = Number(firstBuy.day);
            if (Number.isFinite(firstBuyPrice) && firstBuyPrice > 0 && Number.isFinite(firstBuyDay) && firstBuyDay >= 0 && firstBuyDay < closes.length) {
                applicable = true;
                const shares = TRADE_AMOUNT / firstBuyPrice;
                const cashRemaining = levelStartCash - (TRADE_AMOUNT + FEE);
                // If insufficient cash (should not happen as levelStartCash is 10000), clamp
                const effectiveCashRemaining = Math.max(0, cashRemaining);
                const effectiveShares = cashRemaining >= 0 ? shares : levelStartCash / firstBuyPrice; // fallback
                firstEntryHoldEquity = closes.map((close, idx) => {
                    if (idx < firstBuyDay) return levelStartCash;
                    return effectiveCashRemaining + effectiveShares * close;
                });
                firstEntryHoldFinalCash = firstEntryHoldEquity[firstEntryHoldEquity.length - 1];
                firstEntryHoldReturn = firstEntryHoldFinalCash / levelStartCash - 1;
            }
        }

        // If no buys, firstEntryHold is not applicable — keep null
        if (!applicable) {
            firstEntryHoldEquity = null;
            firstEntryHoldReturn = 0;
            firstEntryHoldFinalCash = levelStartCash;
        }

        // Player equity reference is not computed here; caller provides DecisionReport.equityCurve
        // But we include playerEquity as null to indicate caller should use report
        const playerEquity = input.equityCurve || input.playerEquity || null;

        const result = Object.freeze({
            version: VERSION,
            buyAndHold: Object.freeze({
                return: buyAndHoldReturn,
                excessVsMarket: 0,
                finalCash: buyAndHoldFinalCash,
                label: 'BUY_AND_HOLD_FROM_DAY_0',
            }),
            firstEntryHold: Object.freeze({
                return: firstEntryHoldReturn,
                excessVsMarket: firstEntryHoldReturn - buyAndHoldReturn,
                finalCash: firstEntryHoldFinalCash,
                label: 'FIRST_ENTRY_THEN_HOLD',
                applicable,
            }),
            noTrade: Object.freeze({
                return: noTradeReturn,
                finalCash: levelStartCash,
                label: 'NO_TRADE',
            }),
            curves: Object.freeze({
                buyAndHoldEquity: Object.freeze([...buyAndHoldEquity]),
                firstEntryHoldEquity: firstEntryHoldEquity ? Object.freeze([...firstEntryHoldEquity]) : null,
                noTradeEquity: Object.freeze([...noTradeEquity]),
                playerEquity: playerEquity ? Object.freeze([...playerEquity]) : null,
            }),
        });

        return result;
    }

    return {
        VERSION,
        simulate,
    };
});
