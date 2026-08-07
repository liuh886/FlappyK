(() => {
    'use strict';

    const core = window.FlappyKIndicatorCore;
    if (!core) return;

    const WARMUP_DAYS = 35;

    function dateKey(row) {
        return String(row?.date || '').trim();
    }

    function resolvedSeries(playableData) {
        if (!Array.isArray(playableData) || !playableData.length) {
            return { series: [], offset: 0 };
        }

        const market = typeof currentMarket !== 'undefined' ? currentMarket : '';
        const asset = typeof currentAsset !== 'undefined' ? currentAsset : '';
        const fullSeries = typeof stockData !== 'undefined'
            ? stockData?.[market]?.[asset]
            : null;
        if (!Array.isArray(fullSeries) || fullSeries.length <= playableData.length) {
            return { series: playableData, offset: 0 };
        }

        const firstDate = dateKey(playableData[0]);
        const startIndex = fullSeries.findIndex((row) => dateKey(row) === firstDate);
        if (startIndex < 0) return { series: playableData, offset: 0 };

        const historyStart = Math.max(0, startIndex - WARMUP_DAYS);
        const historyEnd = Math.min(fullSeries.length, startIndex + playableData.length);
        return {
            series: fullSeries.slice(historyStart, historyEnd),
            offset: startIndex - historyStart,
        };
    }

    function align(playableData, calculate) {
        const resolved = resolvedSeries(playableData);
        const calculated = calculate(resolved.series);
        return playableData.map((_, index) => calculated[resolved.offset + index] || null);
    }

    window.FlappyKIndicatorCore = Object.freeze({
        ...core,
        WARMUP_DAYS,
        resolvedSeries,
        bollingerBands(data, period = 20, deviations = 2) {
            return align(data, (series) => core.bollingerBands(series, period, deviations));
        },
        macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
            return align(data, (series) => core.macd(series, fastPeriod, slowPeriod, signalPeriod));
        },
    });
})();
