(function exposeMarketPassRule(root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.FlappyKMarketPassRule = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    function evaluate({ startCash, finalCash, startPrice, finalPrice }) {
        const values = { startCash, finalCash, startPrice, finalPrice };

        Object.entries(values).forEach(([name, value]) => {
            if (!Number.isFinite(value)) {
                throw new TypeError(`${name} must be a finite number`);
            }
        });

        if (startCash <= 0) throw new RangeError('startCash must be greater than zero');
        if (startPrice <= 0) throw new RangeError('startPrice must be greater than zero');

        const playerReturn = (finalCash - startCash) / startCash;
        const marketReturn = (finalPrice - startPrice) / startPrice;
        const excessReturn = playerReturn - marketReturn;

        return {
            playerReturn,
            marketReturn,
            excessReturn,
            isSuccess: excessReturn > 0,
        };
    }

    return { evaluate };
});
