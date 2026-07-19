(function installLegendScore(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKLegendScore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    'use strict';

    function parseReturn(value) {
        const parsed = Number.parseFloat(String(value || '').replace('%', ''));
        return Number.isFinite(parsed) ? parsed / 100 : 0;
    }

    function sanitizeText(value, limit) {
        return String(value || 'UNKNOWN')
            .replace(/[\r\n|]/g, ' ')
            .slice(0, limit);
    }

    function calculate(cards, cumulativeReturn) {
        if (!Array.isArray(cards) || cards.length !== 3) return null;

        let benchmarkGrowth = 1;
        const games = cards.map((card, index) => {
            const gameReturn = Number.isFinite(card?.levelReturn)
                ? card.levelReturn
                : parseReturn(card?.levelRetStr);
            const excessReturn = Number.isFinite(card?.excessReturn)
                ? card.excessReturn
                : parseReturn(card?.excessRetStr);
            const marketReturn = Number.isFinite(card?.marketReturn)
                ? card.marketReturn
                : gameReturn - excessReturn;

            if (![gameReturn, excessReturn, marketReturn].every(Number.isFinite)) return null;
            benchmarkGrowth *= (1 + marketReturn);

            return {
                game: index + 1,
                level: index + 1,
                asset: sanitizeText(card?.asset, 48),
                period: sanitizeText(card?.periodStr, 64),
                excess: excessReturn * 100,
                gameReturn: gameReturn * 100,
                marketReturn: marketReturn * 100,
            };
        });

        if (games.some((game) => !game)) return null;

        const totalReturn = Number(cumulativeReturn) * 100;
        const excess = (Number(cumulativeReturn) - (benchmarkGrowth - 1)) * 100;
        if (!Number.isFinite(totalReturn) || !Number.isFinite(excess)) return null;

        return {
            excess,
            totalExcess: excess,
            totalReturn,
            games,
            levels: games,
        };
    }

    function formatPercent(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '---%';
        return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
    }

    return {
        calculate,
        formatPercent,
        parseReturn,
    };
});
