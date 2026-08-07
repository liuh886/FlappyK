(() => {
    'use strict';

    function finiteClose(row) {
        const value = Number(row?.close ?? row);
        return Number.isFinite(value) ? value : null;
    }

    function closesFrom(data) {
        if (!Array.isArray(data)) return [];
        return data.map(finiteClose);
    }

    function simpleMovingAverage(values, period) {
        const output = Array(values.length).fill(null);
        if (!Number.isInteger(period) || period < 1) return output;
        let sum = 0;
        let valid = 0;
        for (let index = 0; index < values.length; index += 1) {
            const value = Number(values[index]);
            if (Number.isFinite(value)) {
                sum += value;
                valid += 1;
            }
            if (index >= period) {
                const removed = Number(values[index - period]);
                if (Number.isFinite(removed)) {
                    sum -= removed;
                    valid -= 1;
                }
            }
            if (index >= period - 1 && valid === period) output[index] = sum / period;
        }
        return output;
    }

    function exponentialMovingAverage(values, period) {
        const output = Array(values.length).fill(null);
        if (!Number.isInteger(period) || period < 1 || values.length < period) return output;
        const multiplier = 2 / (period + 1);
        let seedSum = 0;
        for (let index = 0; index < period; index += 1) {
            const value = Number(values[index]);
            if (!Number.isFinite(value)) return output;
            seedSum += value;
        }
        let previous = seedSum / period;
        output[period - 1] = previous;
        for (let index = period; index < values.length; index += 1) {
            const value = Number(values[index]);
            if (!Number.isFinite(value)) continue;
            previous = ((value - previous) * multiplier) + previous;
            output[index] = previous;
        }
        return output;
    }

    function bollingerBands(data, period = 20, deviations = 2) {
        const closes = closesFrom(data);
        const middle = simpleMovingAverage(closes, period);
        return closes.map((close, index) => {
            if (!Number.isFinite(close) || !Number.isFinite(middle[index])) return null;
            const start = index - period + 1;
            let variance = 0;
            for (let cursor = start; cursor <= index; cursor += 1) {
                variance += (closes[cursor] - middle[index]) ** 2;
            }
            const standardDeviation = Math.sqrt(variance / period);
            return Object.freeze({
                middle: middle[index],
                upper: middle[index] + (standardDeviation * deviations),
                lower: middle[index] - (standardDeviation * deviations),
            });
        });
    }

    function macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const closes = closesFrom(data);
        const fast = exponentialMovingAverage(closes, fastPeriod);
        const slow = exponentialMovingAverage(closes, slowPeriod);
        const line = closes.map((_, index) => (
            Number.isFinite(fast[index]) && Number.isFinite(slow[index])
                ? fast[index] - slow[index]
                : null
        ));
        const validLine = [];
        const validIndexes = [];
        line.forEach((value, index) => {
            if (Number.isFinite(value)) {
                validLine.push(value);
                validIndexes.push(index);
            }
        });
        const validSignal = exponentialMovingAverage(validLine, signalPeriod);
        const signal = Array(closes.length).fill(null);
        validIndexes.forEach((sourceIndex, index) => {
            signal[sourceIndex] = validSignal[index];
        });
        return closes.map((_, index) => {
            if (!Number.isFinite(line[index])) return null;
            const signalValue = signal[index];
            return Object.freeze({
                line: line[index],
                signal: Number.isFinite(signalValue) ? signalValue : null,
                histogram: Number.isFinite(signalValue) ? line[index] - signalValue : null,
            });
        });
    }

    const api = Object.freeze({
        closesFrom,
        simpleMovingAverage,
        exponentialMovingAverage,
        bollingerBands,
        macd,
    });

    window.FlappyKIndicatorCore = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
