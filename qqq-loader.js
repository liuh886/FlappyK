(() => {
    'use strict';

    const QQQ_NAME = 'QQQ';
    const QQQ_SOURCE_URL = 'https://raw.githubusercontent.com/jtang25/Stock-Market-Index-Daily-Return-Distribution-/refs/heads/main/QQQ.csv';
    const MINIMUM_ROWS = 250;

    function parseAdjustedOhlc(csvText) {
        return csvText
            .trim()
            .split(/\r?\n/)
            .slice(1)
            .map((line) => line.split(','))
            .filter((columns) => columns.length >= 6)
            .map(([date, open, high, low, close, adjustedClose]) => {
                const rawClose = Number(close);
                const adjusted = Number(adjustedClose);
                const factor = rawClose > 0 ? adjusted / rawClose : 1;

                return {
                    date,
                    open: Number(open) * factor,
                    high: Number(high) * factor,
                    low: Number(low) * factor,
                    close: adjusted,
                };
            })
            .filter((row) => row.date && [row.open, row.high, row.low, row.close].every(Number.isFinite));
    }

    function syncOpenSelector() {
        const marketSelect = document.getElementById('custom-market-select');
        const assetSelect = document.getElementById('custom-asset-select');

        if (!marketSelect || !assetSelect || marketSelect.value !== 'usstock') return;
        if (Array.from(assetSelect.options).some((option) => option.value === QQQ_NAME)) return;

        const option = document.createElement('option');
        option.value = QQQ_NAME;
        option.textContent = QQQ_NAME;
        assetSelect.appendChild(option);

        const sorted = Array.from(assetSelect.options)
            .sort((left, right) => left.textContent.localeCompare(right.textContent));
        assetSelect.replaceChildren(...sorted);
    }

    async function loadQQQData() {
        if (stockData.usstock?.[QQQ_NAME]?.length >= MINIMUM_ROWS) {
            syncOpenSelector();
            return stockData.usstock[QQQ_NAME];
        }

        const response = await fetch(QQQ_SOURCE_URL, { cache: 'force-cache' });
        if (!response.ok) {
            throw new Error(`QQQ data request failed with ${response.status}`);
        }

        const rows = parseAdjustedOhlc(await response.text());
        if (rows.length < MINIMUM_ROWS) {
            throw new Error(`QQQ data contains only ${rows.length} valid rows`);
        }

        stockData.usstock = stockData.usstock || {};
        stockData.usstock[QQQ_NAME] = rows;
        syncOpenSelector();

        document.dispatchEvent(new CustomEvent('flappyk:data-updated', {
            detail: { market: 'usstock', asset: QQQ_NAME, rows: rows.length },
        }));

        return rows;
    }

    document.getElementById('custom-market-select')
        ?.addEventListener('change', () => window.setTimeout(syncOpenSelector, 0));

    window.qqqDataReady = loadQQQData().catch((error) => {
        console.warn('FlappyK could not load supplemental QQQ data:', error);
        return null;
    });
})();