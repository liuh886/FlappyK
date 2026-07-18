(() => {
    'use strict';

    const UNLOCK_CODE = 'QQQ';
    const marketLabels = {
        crypto: 'CRYPTO',
        ashare: 'A-SHARES',
        usstock: 'US STOCKS'
    };

    const customScreen = document.getElementById('custom-challenge-screen');
    const marketSelect = document.getElementById('custom-market-select');
    const assetSelect = document.getElementById('custom-asset-select');
    const customStartButton = document.getElementById('custom-start-btn');
    const customCancelButton = document.getElementById('custom-cancel-btn');
    const customResultActions = document.getElementById('custom-result-actions');
    const customRetryButton = document.getElementById('custom-retry-btn');
    const customChangeButton = document.getElementById('custom-change-btn');
    const gameTitle = document.getElementById('game-title');

    const customState = {
        active: false,
        unlocked: false,
        market: null,
        asset: null,
        startIndex: null
    };

    let codeBuffer = '';
    let lastCodeKeyAt = 0;
    let titleHoldTimer = null;

    function availableMarkets() {
        return Object.keys(marketLabels).filter((market) =>
            stockData[market] && Object.keys(stockData[market]).length > 0
        );
    }

    function populateMarkets() {
        const previousValue = marketSelect.value;
        marketSelect.innerHTML = '';

        availableMarkets().forEach((market) => {
            const option = document.createElement('option');
            option.value = market;
            option.textContent = marketLabels[market];
            marketSelect.appendChild(option);
        });

        if (previousValue && availableMarkets().includes(previousValue)) {
            marketSelect.value = previousValue;
        }

        populateAssets();
    }

    function populateAssets() {
        const market = marketSelect.value;
        const previousValue = assetSelect.value;
        const assets = Object.keys(stockData[market] || {}).sort((a, b) => a.localeCompare(b));

        assetSelect.innerHTML = '';

        assets.forEach((asset) => {
            const option = document.createElement('option');
            option.value = asset;
            option.textContent = asset;
            assetSelect.appendChild(option);
        });

        if (previousValue && assets.includes(previousValue)) {
            assetSelect.value = previousValue;
        }
    }

    function hideGameScreens() {
        startScreen.classList.remove('active');
        settlementScreen.classList.remove('active');
        customScreen.classList.remove('active');
    }

    function openCustomSelector() {
        if (isPlaying) return;

        customState.unlocked = true;
        hideGameScreens();
        populateMarkets();

        if (customState.market && availableMarkets().includes(customState.market)) {
            marketSelect.value = customState.market;
            populateAssets();

            if (customState.asset && Object.prototype.hasOwnProperty.call(
                stockData[customState.market] || {},
                customState.asset
            )) {
                assetSelect.value = customState.asset;
            }
        }

        customScreen.classList.add('active');
        marketSelect.focus();
    }

    function resetCoreState() {
        clearInterval(gameInterval);
        isPlaying = false;
        level = 1;
        targetReturn = 0;
        cash = INITIAL_CASH;
        shares = 0;
        totalHistory = [];
        actions = [];
        collectedCards = [];
        finalReturn = 0;
    }

    function hideCustomSettlementButtons() {
        customResultActions.style.display = 'none';
    }

    function startCustomChallenge({ reuseWindow = false } = {}) {
        const market = marketSelect.value || customState.market;
        const asset = assetSelect.value || customState.asset;
        const data = stockData[market]?.[asset];

        if (!data || data.length < DAYS_PER_LEVEL) {
            window.alert('This asset does not have enough data for a 250-day challenge.');
            return;
        }

        customState.active = true;
        customState.market = market;
        customState.asset = asset;

        if (!reuseWindow) {
            customState.startIndex = null;
        }

        resetCoreState();
        hideGameScreens();
        hideCustomSettlementButtons();
        startLevel();
    }

    function unlockFromCode(code) {
        if (String(code || '').trim().toUpperCase() !== UNLOCK_CODE) return false;
        openCustomSelector();
        return true;
    }

    function handleUnlockKey(event) {
        if (isPlaying || !startScreen.classList.contains('active')) return;
        if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;

        const now = Date.now();
        if (now - lastCodeKeyAt > 1500) codeBuffer = '';
        lastCodeKeyAt = now;

        codeBuffer = (codeBuffer + event.key.toUpperCase()).slice(-UNLOCK_CODE.length);

        if (codeBuffer === UNLOCK_CODE) {
            codeBuffer = '';
            openCustomSelector();
        }
    }

    function beginTitleHold(event) {
        if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
        window.clearTimeout(titleHoldTimer);

        titleHoldTimer = window.setTimeout(() => {
            const code = window.prompt('ACCESS CODE');
            unlockFromCode(code);
        }, 900);
    }

    function cancelTitleHold() {
        window.clearTimeout(titleHoldTimer);
        titleHoldTimer = null;
    }

    const originalPickRandomData = pickRandomData;
    pickRandomData = function customAwarePickRandomData() {
        if (!customState.active) {
            return originalPickRandomData();
        }

        currentMarket = customState.market;
        currentAsset = customState.asset;

        const data = stockData[currentMarket][currentAsset];
        const maxStart = Math.max(0, data.length - DAYS_PER_LEVEL);

        if (!Number.isInteger(customState.startIndex)
            || customState.startIndex < 0
            || customState.startIndex > maxStart) {
            customState.startIndex = Math.floor(Math.random() * (maxStart + 1));
        }

        return data.slice(customState.startIndex, customState.startIndex + DAYS_PER_LEVEL);
    };

    const originalStartLevel = startLevel;
    startLevel = function customAwareStartLevel() {
        originalStartLevel();

        if (customState.active) {
            levelDisp.innerText = 'Q';
            targetDisp.innerText = 'ANY PROFIT';
        }
    };

    const originalEndLevel = endLevel;
    endLevel = function customAwareEndLevel() {
        const wasCustom = customState.active;
        originalEndLevel();

        if (!wasCustom) return;

        document.getElementById('card-title').innerText = 'CUSTOM CARD';

        nextBtn.style.display = 'none';
        champagneBtn.style.display = 'none';
        restartBtn.style.display = 'none';
        saveBtn.style.display = 'block';
        customResultActions.style.display = 'flex';

        level = 1;
        targetReturn = 0;
        collectedCards = [];
    };

    marketSelect.addEventListener('change', populateAssets);

    customStartButton.addEventListener('click', () => {
        startCustomChallenge({ reuseWindow: false });
    });

    customCancelButton.addEventListener('click', () => {
        customScreen.classList.remove('active');
        startScreen.classList.add('active');
        startBtn.focus();
    });

    customRetryButton.addEventListener('click', () => {
        settlementScreen.classList.remove('active');
        startCustomChallenge({ reuseWindow: true });
    });

    customChangeButton.addEventListener('click', () => {
        settlementScreen.classList.remove('active');
        customState.active = false;
        customState.startIndex = null;
        resetCoreState();
        openCustomSelector();
    });

    document.addEventListener('keydown', handleUnlockKey);

    if (gameTitle) {
        gameTitle.addEventListener('pointerdown', beginTitleHold);
        gameTitle.addEventListener('pointerup', cancelTitleHold);
        gameTitle.addEventListener('pointercancel', cancelTitleHold);
        gameTitle.addEventListener('pointerleave', cancelTitleHold);
    }
})();
