/**
 * FlappyK Insight Engine — FACT -> game verdict (no recomputation, no advice).
 * Owner: scripts/decision/insight-engine.js
 * May only emit whitelisted VerdictIds with traceable thresholds.
 */
(function exposeInsightEngine(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKInsightEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const VERSION = 1;

    const VERDICTS = Object.freeze({
        PAPER_HANDS: 'PAPER_HANDS',
        MISSED_THE_DIP: 'MISSED_THE_DIP',
        DODGED_THE_CRASH: 'DODGED_THE_CRASH',
        OVERTRADER: 'OVERTRADER',
        DIAMOND_HANDS_LEVEL: 'DIAMOND_HANDS_LEVEL',
    });

    const PRIORITY = [
        VERDICTS.DODGED_THE_CRASH,
        VERDICTS.PAPER_HANDS,
        VERDICTS.MISSED_THE_DIP,
        VERDICTS.DIAMOND_HANDS_LEVEL,
        VERDICTS.OVERTRADER,
    ];

    function deriveVerdicts(report, counterfactuals, regime) {
        if (!report || typeof report !== 'object') throw new TypeError('report is required');
        // counterfactuals and regime are optional for some verdicts, but we validate whitelisting

        const candidates = [];

        // PAPER_HANDS: sold early — firstEntryHold would have beaten you by >15%
        // Trigger: firstEntryHold.return - playerReturn > 0.15 and lastSellDay != null
        if (report.lastSellDay !== null && Number.isFinite(report.lastSellDay)
            && counterfactuals && counterfactuals.firstEntryHold && counterfactuals.firstEntryHold.applicable) {
            const firstEntryReturn = Number(counterfactuals.firstEntryHold.return);
            const playerReturn = Number(report.playerReturn);
            if (Number.isFinite(firstEntryReturn) && Number.isFinite(playerReturn)) {
                const gap = firstEntryReturn - playerReturn;
                if (gap > 0.15) {
                    candidates.push({
                        id: VERDICTS.PAPER_HANDS,
                        priority: PRIORITY.indexOf(VERDICTS.PAPER_HANDS),
                        trace: {
                            reportField: 'playerReturn',
                            threshold: 0.15,
                            actual: gap,
                            related: {
                                firstEntryHoldReturn: firstEntryReturn,
                                playerReturn,
                                returnAfterLastSell: report.returnAfterLastSell,
                                missedUpside: report.missedUpside,
                            },
                        },
                        fact: {
                            soldDay: report.lastSellDay,
                            afterSellReturn: report.returnAfterLastSell,
                            missedUpside: report.missedUpside,
                        },
                    });
                }
            }
        }

        // MISSED_THE_DIP: large market DD but you stayed in cash during trough and market recovered
        // Uses marketMaxDrawdown (from closes) or regime.maxDrawdown, not player maxDrawdown.
        // Player staying in cash gives player maxDD ~0, so must check market.
        {
            const marketDD = Number.isFinite(report.marketMaxDrawdown) ? report.marketMaxDrawdown
                : Number.isFinite(regime?.maxDrawdown) ? regime.maxDrawdown
                : Number.isFinite(report.maxDrawdown) ? report.maxDrawdown : 0;
            if (marketDD > 0.20
                && Number(report.buyCount) === 0
                && Number(report.marketReturn) > 0) {
                candidates.push({
                    id: VERDICTS.MISSED_THE_DIP,
                    priority: PRIORITY.indexOf(VERDICTS.MISSED_THE_DIP),
                    trace: {
                        reportField: 'marketMaxDrawdown',
                        threshold: 0.20,
                        actual: marketDD,
                        related: {
                            buyCount: report.buyCount,
                            marketReturn: report.marketReturn,
                        },
                    },
                    fact: {
                        maxDrawdown: marketDD,
                        marketReturn: report.marketReturn,
                    },
                });
            }
        }

        // DODGED_THE_CRASH: you defended in a crash
        // Trigger: marketReturn < -0.20 and excessReturn >0.15
        if (Number.isFinite(report.marketReturn) && report.marketReturn < -0.20
            && Number.isFinite(report.excessReturn) && report.excessReturn > 0.15) {
            candidates.push({
                id: VERDICTS.DODGED_THE_CRASH,
                priority: PRIORITY.indexOf(VERDICTS.DODGED_THE_CRASH),
                trace: {
                    reportField: 'excessReturn',
                    threshold: 0.15,
                    actual: report.excessReturn,
                    related: {
                        marketReturn: report.marketReturn,
                        playerReturn: report.playerReturn,
                    },
                },
                fact: {
                    marketReturn: report.marketReturn,
                    playerReturn: report.playerReturn,
                    excessReturn: report.excessReturn,
                },
            });
        }

        // DIAMOND_HANDS_LEVEL: long hold with few trades
        // Trigger: longestHoldDays >=100 and tradeCount <=4
        if (Number.isFinite(report.longestHoldDays) && report.longestHoldDays >= 100
            && Number.isFinite(report.tradeCount) && report.tradeCount <= 4) {
            candidates.push({
                id: VERDICTS.DIAMOND_HANDS_LEVEL,
                priority: PRIORITY.indexOf(VERDICTS.DIAMOND_HANDS_LEVEL),
                trace: {
                    reportField: 'longestHoldDays',
                    threshold: 100,
                    actual: report.longestHoldDays,
                    related: {
                        tradeCount: report.tradeCount,
                    },
                },
                fact: {
                    longestHoldDays: report.longestHoldDays,
                    tradeCount: report.tradeCount,
                },
            });
        }

        // OVERTRADER: many trades
        // Trigger: tradeCount >=15
        if (Number.isFinite(report.tradeCount) && report.tradeCount >= 15) {
            candidates.push({
                id: VERDICTS.OVERTRADER,
                priority: PRIORITY.indexOf(VERDICTS.OVERTRADER),
                trace: {
                    reportField: 'tradeCount',
                    threshold: 15,
                    actual: report.tradeCount,
                    related: {
                        feeDrag: report.feeDrag,
                        excessReturn: report.excessReturn,
                    },
                },
                fact: {
                    tradeCount: report.tradeCount,
                    feeDrag: report.feeDrag,
                },
            });
        }

        // Sort by priority, take at most 2
        candidates.sort((a, b) => a.priority - b.priority);
        const selected = candidates.slice(0, 2).map((c) => Object.freeze({
            id: c.id,
            trace: Object.freeze({ ...c.trace, related: Object.freeze({ ...c.trace.related }) }),
            fact: Object.freeze({ ...c.fact }),
        }));

        return Object.freeze([...selected]);
    }

    return {
        VERSION,
        VERDICTS,
        deriveVerdicts,
    };
});
