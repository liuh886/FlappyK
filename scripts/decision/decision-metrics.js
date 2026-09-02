/**
 * FlappyK Decision Metrics — pure FACT computation.
 * Owner: scripts/decision/decision-metrics.js
 * Input: { currentData, actions, totalHistory, levelStartCash, finalCash?, startPrice?, finalPrice?, level, currentMarket, currentAsset, settlement? }
 * Output: DecisionReport (see docs/DECISION_ENGINE_V01.md:4.1)
 * Must remain pure, deterministic, no DOM / I/O.
 */
(function exposeDecisionMetrics(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKDecisionMetrics = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const VERSION = 1;
    const TRADE_AMOUNT = 1000;
    const FEE = 1;
    const DAYS = 250;

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function closesFromData(currentData) {
        if (!Array.isArray(currentData) || currentData.length === 0) return [];
        return currentData.map((row) => {
            if (row && typeof row === 'object' && 'close' in row) return Number(row.close);
            return Number(row);
        });
    }

    function replayShares(currentData, actions) {
        // Replay trades to derive shares per day, mirroring game.js handleBuy/handleSell logic.
        const closes = closesFromData(currentData);
        const sharesPerDay = new Array(closes.length).fill(0);
        let shares = 0;
        let cash = null; // not needed for exposure, only shares
        // We do not need cash replay for exposure; holding = shares>0
        // But for fee logic we also replay cash? Not needed.
        // Simpler: holding if shares > 0 after applying actions sorted by day
        const sorted = Array.isArray(actions) ? [...actions].sort((a, b) => (a.day || 0) - (b.day || 0)) : [];
        let actionIndex = 0;
        for (let day = 0; day < closes.length; day += 1) {
            while (actionIndex < sorted.length && sorted[actionIndex].day === day) {
                const act = sorted[actionIndex];
                const price = Number(act.price ?? closes[day]);
                if (act.type === 'buy' && Number.isFinite(price) && price > 0) {
                    shares += TRADE_AMOUNT / price;
                } else if (act.type === 'sell' && Number.isFinite(price) && price > 0) {
                    const assetValue = shares * price;
                    if (assetValue >= TRADE_AMOUNT - 0.01) {
                        shares -= TRADE_AMOUNT / price;
                        if (shares < 0) shares = 0;
                    } else if (assetValue > FEE) {
                        shares = 0;
                    }
                }
                actionIndex += 1;
            }
            // handle actions with day beyond close length? ignore
            sharesPerDay[day] = shares;
        }
        // Handle any remaining actions beyond window (should not happen)
        while (actionIndex < sorted.length) {
            const act = sorted[actionIndex];
            const price = Number(act.price);
            if (act.type === 'buy' && Number.isFinite(price) && price > 0) shares += TRADE_AMOUNT / price;
            else if (act.type === 'sell') shares = Math.max(0, shares - TRADE_AMOUNT / (Number.isFinite(price) && price > 0 ? price : 1));
            actionIndex += 1;
        }
        return sharesPerDay;
    }

    function computeMaxDrawdown(totalHistory) {
        if (!Array.isArray(totalHistory) || totalHistory.length === 0) return { maxDrawdown: 0, maxDrawdownDay: null };
        let peak = totalHistory[0];
        let peakIndex = 0;
        let maxDD = 0;
        let troughDay = null;
        for (let i = 0; i < totalHistory.length; i += 1) {
            const value = Number(totalHistory[i]);
            if (!Number.isFinite(value)) continue;
            if (value > peak) {
                peak = value;
                peakIndex = i;
            }
            const dd = peak > 0 ? (peak - value) / peak : 0;
            if (dd > maxDD) {
                maxDD = dd;
                troughDay = i;
            }
        }
        return { maxDrawdown: maxDD, maxDrawdownDay: troughDay };
    }

    function analyzeRun(input) {
        if (!input || typeof input !== 'object') throw new TypeError('analyzeRun requires an options object');

        const currentData = input.currentData;
        const actions = Array.isArray(input.actions) ? input.actions : [];
        const totalHistory = Array.isArray(input.totalHistory) ? input.totalHistory : [];
        const levelStartCash = Number(input.levelStartCash);
        const level = Number(input.level ?? input.completedLevel ?? 1);
        const currentMarket = String(input.currentMarket || input.market || 'crypto');
        const currentAsset = String(input.currentAsset || input.asset || 'UNKNOWN');

        if (!Array.isArray(currentData) || currentData.length === 0) throw new TypeError('currentData must be a non-empty array');
        if (!Number.isFinite(levelStartCash) || levelStartCash <= 0) throw new RangeError('levelStartCash must be > 0');

        const closes = closesFromData(currentData);
        if (closes.length < 2) throw new TypeError('currentData must contain at least 2 closes');
        const startPrice = Number.isFinite(Number(input.startPrice)) ? Number(input.startPrice) : Number(closes[0]);
        const finalPrice = Number.isFinite(Number(input.finalPrice)) ? Number(input.finalPrice) : Number(closes[closes.length - 1]);
        const finalCash = Number.isFinite(Number(input.finalCash ?? input.projectedCash)) ? Number(input.finalCash ?? input.projectedCash) : (totalHistory.length ? Number(totalHistory[totalHistory.length - 1]) : levelStartCash);

        if (!Number.isFinite(startPrice) || startPrice <= 0) throw new RangeError('startPrice must be > 0');
        if (!Number.isFinite(finalPrice) || !Number.isFinite(finalCash)) throw new TypeError('finalPrice and finalCash must be finite numbers');

        // Authoritative returns — same formula as market-pass-rule.js
        const settlement = input.settlement || {};
        let playerReturn = Number.isFinite(Number(settlement.playerReturn)) ? Number(settlement.playerReturn) : (finalCash - levelStartCash) / levelStartCash;
        let marketReturn = Number.isFinite(Number(settlement.marketReturn)) ? Number(settlement.marketReturn) : (finalPrice - startPrice) / startPrice;
        let excessReturn = Number.isFinite(Number(settlement.excessReturn)) ? Number(settlement.excessReturn) : playerReturn - marketReturn;
        let isSuccess = typeof settlement.isSuccess === 'boolean' ? settlement.isSuccess : excessReturn > 0;
        // If caller did not provide settlement but provided explicit playerReturn etc via top-level, respect those
        if (Number.isFinite(Number(input.playerReturn))) playerReturn = Number(input.playerReturn);
        if (Number.isFinite(Number(input.marketReturn))) marketReturn = Number(input.marketReturn);
        if (Number.isFinite(Number(input.excessReturn))) excessReturn = Number(input.excessReturn);
        if (typeof input.isSuccess === 'boolean') isSuccess = input.isSuccess;

        // Trade counts
        let tradeCount = 0;
        let buyCount = 0;
        let sellCount = 0;
        let avgEntryPrice = null;
        let avgExitPrice = null;
        let firstBuyDay = null;
        let lastSellDay = null;
        let lastBuyDay = null;
        let sumBuyPrice = 0;
        let sumSellPrice = 0;

        for (const act of actions) {
            if (!act || (act.type !== 'buy' && act.type !== 'sell')) continue;
            tradeCount += 1;
            if (act.type === 'buy') {
                buyCount += 1;
                sumBuyPrice += Number(act.price) || 0;
                if (firstBuyDay === null) firstBuyDay = Number(act.day);
                lastBuyDay = Number(act.day);
            } else {
                sellCount += 1;
                sumSellPrice += Number(act.price) || 0;
                lastSellDay = Number(act.day);
            }
        }
        if (buyCount > 0) avgEntryPrice = sumBuyPrice / buyCount;
        if (sellCount > 0) avgExitPrice = sumSellPrice / sellCount;

        const feeDrag = (tradeCount * FEE) / levelStartCash;
        const turnover = ((buyCount + sellCount) * TRADE_AMOUNT) / levelStartCash;

        const { maxDrawdown, maxDrawdownDay } = computeMaxDrawdown(totalHistory);
        // Market drawdown (from closes) - independent of player actions
        let marketMaxDrawdown = 0;
        {
            let peak = closes[0];
            for (let i = 1; i < closes.length; i += 1) {
                if (closes[i] > peak) peak = closes[i];
                const dd = peak > 0 ? (peak - closes[i]) / peak : 0;
                if (dd > marketMaxDrawdown) marketMaxDrawdown = dd;
            }
        }

        // Exposure: replay shares
        const sharesPerDay = replayShares(currentData, actions);
        let holdingDays = 0;
        let longestHoldDays = 0;
        let currentStreak = 0;
        for (let d = 0; d < sharesPerDay.length; d += 1) {
            if (sharesPerDay[d] > 1e-9) {
                holdingDays += 1;
                currentStreak += 1;
                if (currentStreak > longestHoldDays) longestHoldDays = currentStreak;
            } else {
                currentStreak = 0;
            }
        }
        const totalDays = closes.length || DAYS;
        const marketExposure = totalDays > 0 ? holdingDays / totalDays : 0;
        const cashExposure = 1 - marketExposure;

        let timeInCashAfterLastSell = 0;
        if (lastSellDay !== null && Number.isFinite(lastSellDay)) {
            timeInCashAfterLastSell = Math.max(0, totalDays - 1 - lastSellDay);
            // If still holding after last sell, that sell was not fully closing? Use replay to check final shares
            const finalShares = sharesPerDay[sharesPerDay.length - 1] || 0;
            if (finalShares > 1e-9) {
                // actually still exposed, so time in cash after last sell is less
                // compute days where shares==0 after lastSellDay
                let cashDaysAfter = 0;
                for (let d = lastSellDay + 1; d < sharesPerDay.length; d += 1) {
                    if (sharesPerDay[d] <= 1e-9) cashDaysAfter += 1;
                    else break;
                }
                timeInCashAfterLastSell = cashDaysAfter;
            }
        } else if (tradeCount === 0) {
            timeInCashAfterLastSell = 0;
        }

        // Consequence facts
        let returnAfterFirstSell = null;
        let returnAfterLastSell = null;
        let maxFavorableAfterLastSell = null;
        let maxAdverseAfterLastBuy = null;
        let missedUpside = null;
        let avoidedDownside = null;

        if (firstBuyDay !== null) {
            // Not needed for firstSell, but for completeness
        }
        // Find first sell price
        let priceAtFirstSell = null;
        let priceAtLastSell = null;
        let priceAtLastBuy = null;
        for (const act of actions) {
            if (act.type === 'sell' && priceAtFirstSell === null) priceAtFirstSell = Number(act.price);
            if (act.type === 'sell') priceAtLastSell = Number(act.price);
            if (act.type === 'buy') priceAtLastBuy = Number(act.price);
        }
        if (priceAtFirstSell !== null && Number.isFinite(priceAtFirstSell) && priceAtFirstSell > 0) {
            returnAfterFirstSell = (finalPrice - priceAtFirstSell) / priceAtFirstSell;
        }
        if (priceAtLastSell !== null && Number.isFinite(priceAtLastSell) && priceAtLastSell > 0) {
            returnAfterLastSell = (finalPrice - priceAtLastSell) / priceAtLastSell;
            // max favorable after last sell
            if (lastSellDay !== null && lastSellDay < closes.length - 1) {
                let maxClose = -Infinity;
                for (let d = lastSellDay + 1; d < closes.length; d += 1) {
                    if (closes[d] > maxClose) maxClose = closes[d];
                }
                if (Number.isFinite(maxClose) && maxClose > 0) {
                    maxFavorableAfterLastSell = maxClose / priceAtLastSell - 1;
                    missedUpside = Math.max(0, maxFavorableAfterLastSell);
                    // avoided downside: if market fell after sell
                    let minClose = Infinity;
                    for (let d = lastSellDay + 1; d < closes.length; d += 1) {
                        if (closes[d] < minClose) minClose = closes[d];
                    }
                    if (Number.isFinite(minClose)) {
                        const minReturn = minClose / priceAtLastSell - 1;
                        avoidedDownside = Math.max(0, -Math.min(0, minReturn));
                        // also if final is down, avoidedDownside reflects that
                        if (returnAfterLastSell !== null && returnAfterLastSell < 0) {
                            avoidedDownside = Math.max(avoidedDownside, -returnAfterLastSell);
                        }
                    }
                }
            } else {
                maxFavorableAfterLastSell = 0;
                missedUpside = 0;
                avoidedDownside = 0;
            }
        }
        if (priceAtLastBuy !== null && Number.isFinite(priceAtLastBuy) && priceAtLastBuy > 0 && lastBuyDay !== null && lastBuyDay < closes.length - 1) {
            let minClose = Infinity;
            for (let d = lastBuyDay + 1; d < closes.length; d += 1) {
                if (closes[d] < minClose) minClose = closes[d];
            }
            if (Number.isFinite(minClose)) {
                maxAdverseAfterLastBuy = minClose / priceAtLastBuy - 1;
            }
        }

        // Best possible single buy+sell (oracle, theoretical)
        let bestPossibleTrade = 0;
        {
            let minPrice = closes[0];
            let best = 0;
            for (let i = 1; i < closes.length; i += 1) {
                const ret = closes[i] / minPrice - 1;
                if (ret > best) best = ret;
                if (closes[i] < minPrice) minPrice = closes[i];
            }
            bestPossibleTrade = best;
        }

        const buyAndHoldReturn = marketReturn;

        // Build equityCurve: use totalHistory padded to 250 if needed
        let equityCurve = Array.isArray(totalHistory) ? [...totalHistory] : [];
        // Pad if shorter than closes: fill with finalCash
        while (equityCurve.length < closes.length) {
            equityCurve.push(equityCurve.length ? equityCurve[equityCurve.length - 1] : levelStartCash);
        }
        if (equityCurve.length > closes.length) equityCurve = equityCurve.slice(0, closes.length);

        const periodStart = currentData[0] && currentData[0].date ? String(currentData[0].date) : '';
        const periodEnd = currentData[currentData.length - 1] && currentData[currentData.length - 1].date ? String(currentData[currentData.length - 1].date) : '';

        const report = Object.freeze({
            version: VERSION,
            level: Number(level),
            market: currentMarket,
            asset: currentAsset,
            periodStart,
            periodEnd,
            days: closes.length,
            startCash: levelStartCash,
            finalCash,
            startPrice,
            finalPrice,
            playerReturn,
            marketReturn,
            excessReturn,
            isSuccess,
            tradeCount,
            buyCount,
            sellCount,
            feeDrag,
            turnover,
            maxDrawdown,
            maxDrawdownDay,
            marketMaxDrawdown,
            marketExposure,
            cashExposure,
            longestHoldDays,
            avgEntryPrice,
            avgExitPrice,
            firstBuyDay,
            lastSellDay,
            timeInCashAfterLastSell,
            returnAfterFirstSell,
            returnAfterLastSell,
            maxFavorableAfterLastSell,
            maxAdverseAfterLastBuy,
            missedUpside,
            avoidedDownside,
            bestPossibleTrade,
            buyAndHoldReturn,
            closes: Object.freeze([...closes]),
            equityCurve: Object.freeze([...equityCurve]),
            actions: Object.freeze(actions.map((a) => Object.freeze({ type: a.type, day: Number(a.day), price: Number(a.price) }))),
        });

        return report;
    }

    return {
        VERSION,
        analyzeRun,
        _private: {
            replayShares,
            computeMaxDrawdown,
        },
    };
});
