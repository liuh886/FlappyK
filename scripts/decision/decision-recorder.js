/**
 * FlappyK Decision Recorder — glue between Market Engine and Decision Engine.
 * Owner: scripts/decision/decision-recorder.js
 * Subscribes to FlappyKGameController hooks, builds timeline, emits flappyk:decision-ready.
 * Fail-open: any error is caught and logged, never blocks settlement.
 */
(function installDecisionRecorder() {
    'use strict';

    const controller = typeof window !== 'undefined' ? window.FlappyKGameController : null;
    const events = typeof window !== 'undefined' ? window.FlappyKEvents : null;
    if (!controller || !events) {
        // Fail open: controller not ready (e.g. tests or blocked). No hard error.
        return;
    }

    let timeline = null;

    function resetTimeline(level, market, asset, data) {
        const closes = Array.isArray(data) ? data.map((row) => (row && typeof row === 'object' ? Number(row.close) : Number(row))) : [];
        timeline = {
            level,
            market,
            asset,
            currentData: Array.isArray(data) ? [...data] : [],
            closes: [...closes],
            actions: [],
            totalHistory: [],
            levelStartCash: null,
            startPrice: closes.length ? closes[0] : null,
            finalPrice: null,
        };
    }

    function ensureTimeline() {
        if (!timeline) {
            timeline = {
                level: 1,
                market: 'crypto',
                asset: 'UNKNOWN',
                currentData: [],
                closes: [],
                actions: [],
                totalHistory: [],
                levelStartCash: null,
                startPrice: null,
                finalPrice: null,
            };
        }
        return timeline;
    }

    // Hook: data-resolved — authoritative market window for the level
    try {
        controller.on('data-resolved', (detail) => {
            try {
                const { level, market, asset, data } = detail || {};
                resetTimeline(Number(level) || 1, String(market || 'crypto'), String(asset || 'UNKNOWN'), data);
            } catch (e) {
                console.warn('FlappyK decision recorder data-resolved failed', e);
            }
        });
    } catch (e) {
        console.warn('FlappyK decision recorder could not subscribe to data-resolved', e);
    }

    // Hook: level-will-start — capture levelStartCash before trades begin
    try {
        controller.on('level-will-start', (detail) => {
            try {
                const t = ensureTimeline();
                // levelStartCash is cash before the level starts; FlappyKGame.getState() holds it
                const state = window.FlappyKGame?.getState?.();
                if (state && Number.isFinite(Number(state.cash))) {
                    t.levelStartCash = Number(state.cash);
                } else if (detail && Number.isFinite(Number(detail.levelStartCash))) {
                    t.levelStartCash = Number(detail.levelStartCash);
                }
                // Also reset actions/totalHistory for new level
                t.actions = [];
                t.totalHistory = [];
                if (detail && Number(detail.level)) t.level = Number(detail.level);
            } catch (e) {
                console.warn('FlappyK decision recorder level-will-start failed', e);
            }
        });
    } catch (e) {}

    // Fallback: also listen to FLAPPYK_EVENT for level-will-start via window events
    // (controller already emits via FlappyKEvents, but keep hook as primary)

    // Hook: tick — capture equity
    try {
        controller.on('tick', (detail) => {
            try {
                const t = ensureTimeline();
                if (detail && Number.isFinite(Number(detail.day)) && Number.isFinite(Number(detail.total))) {
                    const day = Number(detail.day);
                    // Ensure array length
                    while (t.totalHistory.length <= day) t.totalHistory.push(null);
                    t.totalHistory[day] = Number(detail.total);
                }
            } catch (e) {
                console.warn('FlappyK decision recorder tick failed', e);
            }
        });
    } catch (e) {}

    // Hook: trade — capture action
    try {
        controller.on('trade', (detail) => {
            try {
                const t = ensureTimeline();
                if (detail && (detail.type === 'buy' || detail.type === 'sell')) {
                    t.actions.push({ type: detail.type, day: Number(detail.day), price: Number(detail.price) });
                }
            } catch (e) {
                console.warn('FlappyK decision recorder trade failed', e);
            }
        });
    } catch (e) {}

    // Hook: level-did-settle — compute and emit decision-ready
    try {
        controller.on('level-did-settle', (detail) => {
            try {
                const t = ensureTimeline();
                if (!t || !t.currentData || t.currentData.length === 0) return;

                // Enrich timeline with final cash/prices from settlement
                const levelStartCash = t.levelStartCash !== null ? t.levelStartCash : (window.FlappyKGame?.getState?.().cash ?? 10000);
                const startPrice = t.startPrice !== null ? t.startPrice : (t.closes[0] ?? null);
                const finalPrice = detail && Number.isFinite(Number(detail.finalPrice)) ? Number(detail.finalPrice) : (t.closes[t.closes.length - 1] ?? null);
                // Fallback finalPrice from currentData last close if not in detail
                const fallbackFinalPrice = t.closes.length ? t.closes[t.closes.length - 1] : finalPrice;
                const effectiveFinalPrice = Number.isFinite(finalPrice) ? finalPrice : fallbackFinalPrice;
                const finalCash = detail && Number.isFinite(Number(detail.projectedCash)) ? Number(detail.projectedCash) : (t.totalHistory.length ? t.totalHistory[t.totalHistory.length - 1] : levelStartCash);

                // If totalHistory is sparse (nulls), fill from t.totalHistory where available
                // totalHistory from ticks may have gaps if day 0 not recorded; ensure levelStartCash at index 0
                let totalHistory = [...t.totalHistory];
                if (totalHistory.length === 0) totalHistory = [levelStartCash];
                // Fill nulls with previous
                for (let i = 0; i < totalHistory.length; i += 1) {
                    if (!Number.isFinite(totalHistory[i])) totalHistory[i] = i > 0 ? totalHistory[i - 1] : levelStartCash;
                }
                // Pad to 250 if shorter
                while (totalHistory.length < t.closes.length) {
                    totalHistory.push(totalHistory[totalHistory.length - 1]);
                }

                // Compute decision artifacts via pure modules
                const metricsApi = window.FlappyKDecisionMetrics;
                const regimeApi = window.FlappyKMarketRegime;
                const cfApi = window.FlappyKCounterfactuals;
                const insightApi = window.FlappyKInsightEngine;
                const storageApi = window.FlappyKDecisionStorage;
                const masteryApi = window.FlappyKMastery;

                if (!metricsApi || !regimeApi || !cfApi || !insightApi) {
                    console.warn('FlappyK decision modules not ready', { metricsApi: !!metricsApi, regimeApi: !!regimeApi, cfApi: !!cfApi, insightApi: !!insightApi });
                    return;
                }

                const report = metricsApi.analyzeRun({
                    currentData: t.currentData,
                    actions: [...t.actions],
                    totalHistory: [...totalHistory],
                    levelStartCash,
                    finalCash,
                    startPrice,
                    finalPrice: effectiveFinalPrice,
                    level: detail?.completedLevel ?? t.level,
                    currentMarket: detail?.market ?? t.market,
                    currentAsset: detail?.asset ?? t.asset,
                    playerReturn: detail?.playerReturn,
                    marketReturn: detail?.marketReturn,
                    excessReturn: detail?.excessReturn,
                    isSuccess: detail?.isSuccess,
                });

                const counterfactuals = cfApi.simulate({
                    currentData: t.currentData,
                    actions: [...t.actions],
                    levelStartCash,
                    equityCurve: [...report.equityCurve],
                });

                const regime = regimeApi.classifyMarket([...report.closes]);

                const verdicts = insightApi.deriveVerdicts(report, counterfactuals, regime);

                // Persist report
                try {
                    storageApi?.saveReport?.(report);
                } catch (e) {
                    console.warn('FlappyK decision report persist failed', e);
                }

                // Mastery: load, reduce, save (fail-open)
                try {
                    const prevMastery = storageApi?.loadMastery?.(masteryApi?.emptyMastery?.()) || masteryApi?.emptyMastery?.();
                    const nextMastery = masteryApi?.reduceMastery?.(prevMastery, report);
                    if (nextMastery) storageApi?.saveMastery?.(nextMastery);
                } catch (e) {
                    console.warn('FlappyK mastery update failed', e);
                }

                // Emit decision-ready for UI layers (ghost, insights)
                try {
                    const eventDetail = { report, counterfactuals, regime, verdicts, level: report.level, market: report.market, asset: report.asset };
                    // Emit via both channels for compatibility
                    if (window.FlappyKEvents?.emit) window.FlappyKEvents.emit('flappyk:decision-ready', eventDetail);
                    window.dispatchEvent(new CustomEvent('flappyk:decision-ready', { detail: eventDetail }));
                    // Also emit controller hook? Use events bus
                    if (controller && controller._emit) controller._emit('decision-ready', eventDetail);
                } catch (e) {
                    console.warn('FlappyK decision-ready emit failed', e);
                }

                // Reset timeline for next level (keep last report? New data-resolved will reset)
                // Do not clear timeline entirely to allow ghost to read it; it will be overwritten on next data-resolved

            } catch (e) {
                console.warn('FlappyK decision recorder level-did-settle failed', e);
            }
        });
    } catch (e) {
        console.warn('FlappyK decision recorder could not subscribe to level-did-settle', e);
    }

    // Expose for testing / debugging
    if (typeof window !== 'undefined') {
        window.FlappyKDecisionRecorder = {
            _getTimeline: () => timeline ? { ...timeline, actions: [...timeline.actions], totalHistory: [...timeline.totalHistory] } : null,
            _reset: () => { timeline = null; },
        };
    }
})();
