from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def path(name: str) -> Path:
    return ROOT / name


def replace_once(name: str, old: str, new: str) -> None:
    file = path(name)
    text = file.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"expected patch anchor missing: {name}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


def split_snapshot() -> None:
    source_file = path("data.js")
    source = source_file.read_text(encoding="utf-8")
    marker = "const stockData = "
    if marker not in source:
        raise RuntimeError("data.js does not define stockData")
    payload = source.split(marker, 1)[1].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    all_data = json.loads(payload)

    output_dir = path("data/markets")
    output_dir.mkdir(parents=True, exist_ok=True)
    for market in ("crypto", "ashare", "usstock"):
        rows = all_data.get(market)
        if not isinstance(rows, dict) or not rows:
            raise RuntimeError(f"current snapshot has no {market} data")
        (output_dir / f"{market}.json").write_text(
            json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
    source_file.unlink()


def write_loader() -> None:
    path("data-loader.js").write_text(
        """const stockData = { crypto: {}, ashare: {}, usstock: {} };\n\n"
        "(() => {\n"
        "    'use strict';\n\n"
        "    const MARKETS = Object.freeze(['crypto', 'ashare', 'usstock']);\n"
        "    const pending = new Map();\n"
        "    const loaded = new Set();\n\n"
        "    function marketForLevel(level) {\n"
        "        if (Number(level) === 1) return 'crypto';\n"
        "        if (Number(level) === 2) return 'ashare';\n"
        "        return 'usstock';\n"
        "    }\n\n"
        "    async function loadMarket(market) {\n"
        "        if (!MARKETS.includes(market)) throw new Error(`Unknown market: ${market}`);\n"
        "        if (loaded.has(market)) return stockData[market];\n"
        "        if (pending.has(market)) return pending.get(market);\n\n"
        "        const request = fetch(`./data/markets/${market}.json`, { cache: 'force-cache' })\n"
        "            .then(async (response) => {\n"
        "                if (!response.ok) throw new Error(`${market} data request failed with ${response.status}`);\n"
        "                const payload = await response.json();\n"
        "                if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {\n"
        "                    throw new Error(`${market} data payload is invalid`);\n"
        "                }\n"
        "                Object.assign(stockData[market], payload);\n"
        "                loaded.add(market);\n"
        "                document.dispatchEvent(new CustomEvent('flappyk:data-updated', {\n"
        "                    detail: { market, assets: Object.keys(payload).length },\n"
        "                }));\n"
        "                return stockData[market];\n"
        "            })\n"
        "            .finally(() => pending.delete(market));\n\n"
        "        pending.set(market, request);\n"
        "        return request;\n"
        "    }\n\n"
        "    function loadMarkets(markets) {\n"
        "        return Promise.all([...new Set(markets)].map(loadMarket));\n"
        "    }\n\n"
        "    window.FlappyKData = Object.freeze({\n"
        "        markets: () => [...MARKETS],\n"
        "        marketForLevel,\n"
        "        isLoaded: (market) => loaded.has(market),\n"
        "        loadMarket,\n"
        "        loadMarkets,\n"
        "    });\n"
        "})();\n""",
        encoding="utf-8",
    )


def patch_generator() -> None:
    replace_once(
        "fetch_all_data.py",
        "from datetime import datetime, timezone\n",
        "from datetime import datetime, timezone\nfrom pathlib import Path\n",
    )
    file = path("fetch_all_data.py")
    text = file.read_text(encoding="utf-8")
    start = text.find('\nwith open("data.js", "w", encoding="utf-8") as output:')
    if start < 0:
        raise RuntimeError("fetch_all_data.py output block missing")
    text = text[:start] + """

output_dir = Path("data/markets")
output_dir.mkdir(parents=True, exist_ok=True)
for market, payload in all_data.items():
    (output_dir / f"{market}.json").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\\n",
        encoding="utf-8",
    )
(output_dir / "meta.json").write_text(
    json.dumps(metadata, ensure_ascii=False, indent=2) + "\\n",
    encoding="utf-8",
)

print("Done! Adjusted data and metadata written to data/markets/")
"""
    file.write_text(text, encoding="utf-8")


def patch_fonts_and_boot() -> None:
    file = path("index.html")
    text = file.read_text(encoding="utf-8")
    canonical = '    <link rel="canonical" href="https://liuh886.github.io/FlappyK/">\n'
    if canonical not in text:
        raise RuntimeError("canonical link missing")
    text = text.replace(
        canonical,
        canonical
        + '    <link rel="preconnect" href="https://fonts.googleapis.com">\n'
        + '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n',
        1,
    )
    text = text.replace(
        '    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">',
        '    <link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&family=Press+Start+2P&family=ZCOOL+QingKe+HuangYou&display=swap" rel="stylesheet">',
        1,
    )
    text = text.replace(
        '    <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js"',
        '    <script defer src="https://static.cloudflareinsights.com/beacon.min.js"',
        1,
    )
    text = text.replace('    <script src="data.js"></script>', '    <script src="data-loader.js"></script>', 1)
    file.write_text(text, encoding="utf-8")

    for css_name in ("premium-ui.css", "i18n.css"):
        css_file = path(css_name)
        css = css_file.read_text(encoding="utf-8")
        css, count = re.subn(
            r"^@import url\('https://fonts\.googleapis\.com/[^\n]+\);\n\n?",
            "",
            css,
            count=1,
        )
        if count != 1:
            raise RuntimeError(f"Google Fonts @import missing in {css_name}")
        css_file.write_text(css, encoding="utf-8")


def patch_canvas() -> None:
    replace_once(
        "game.js",
        """function resizeCanvas() {
    gameContainer.style.width = '100vw';
    gameContainer.style.height = '100dvh';
    gameContainer.style.border = 'none';
    gameContainer.style.boxShadow = 'none';

    const fallbackHeight = window.matchMedia("(max-width: 768px)").matches
        ? window.innerHeight * 0.6
        : window.innerHeight;

    canvas.width = canvas.clientWidth || window.innerWidth;
    canvas.height = canvas.clientHeight || fallbackHeight;

    if (typeof isPlaying !== 'undefined' && isPlaying) draw();
}
""",
        """let canvasCssWidth = 1;
let canvasCssHeight = 1;

function resizeCanvas() {
    gameContainer.style.width = '100vw';
    gameContainer.style.height = '100dvh';
    gameContainer.style.border = 'none';
    gameContainer.style.boxShadow = 'none';

    const fallbackHeight = window.matchMedia("(max-width: 768px)").matches
        ? window.innerHeight * 0.6
        : window.innerHeight;
    const cssWidth = Math.max(1, Math.round(canvas.clientWidth || window.innerWidth));
    const cssHeight = Math.max(1, Math.round(canvas.clientHeight || fallbackHeight));
    const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);

    canvasCssWidth = cssWidth;
    canvasCssHeight = cssHeight;
    const backingWidth = Math.round(cssWidth * dpr);
    const backingHeight = Math.round(cssHeight * dpr);
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (typeof isPlaying !== 'undefined' && isPlaying) draw();
}
""",
    )
    replace_once(
        "game.js",
        "window.addEventListener('resize', resizeCanvas);\nsetTimeout(resizeCanvas, 100);\n\n// Set initial size\nresizeCanvas();",
        "window.addEventListener('resize', resizeCanvas, { passive: true });\nwindow.addEventListener('orientationchange', resizeCanvas, { passive: true });\nnew ResizeObserver(resizeCanvas).observe(canvas);\n\n// Set initial size\nresizeCanvas();",
    )
    game_file = path("game.js")
    game = game_file.read_text(encoding="utf-8")
    head, marker, tail = game.partition("function draw() {")
    if not marker:
        raise RuntimeError("draw function missing")
    tail = tail.replace("canvas.width", "canvasCssWidth").replace("canvas.height", "canvasCssHeight")
    game_file.write_text(head + marker + tail, encoding="utf-8")

    refinement_file = path("scripts/premium-ui-refinement.js")
    refinement = refinement_file.read_text(encoding="utf-8")
    refinement = refinement.replace("    const canvasElement = document.getElementById('game-canvas');\n", "")
    refinement, count = re.subn(
        r"\n    function syncCanvasLayout\(\) \{.*?\n    \}\n\n    function syncComposition",
        "\n    function syncComposition",
        refinement,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("syncCanvasLayout block missing")
    refinement = refinement.replace("        syncCanvasLayout();\n", "")
    refinement = re.sub(
        r"\n    if \(canvasElement\) \{\n        new MutationObserver\(scheduleComposition\)\.observe\(canvasElement, \{.*?\n    \}\n",
        "\n",
        refinement,
        count=1,
        flags=re.S,
    )
    refinement = refinement.replace("        syncCanvasLayout,\n", "")
    refinement_file.write_text(refinement, encoding="utf-8")


def patch_game_loading() -> None:
    replace_once(
        "game.js",
        "// Initial Speed UI Sync\nspeedBtn.innerText = `${speedMultiplier}x [←/→]`;\n",
        """// Initial Speed UI Sync
speedBtn.innerText = `${speedMultiplier}x [←/→]`;

async function ensureLevelMarketData(levelNumber = level) {
    const dataApi = window.FlappyKData;
    if (!dataApi) throw new Error('Market data loader is unavailable');
    await dataApi.loadMarket(dataApi.marketForLevel(levelNumber));
}

function reportMarketLoadFailure(error) {
    console.error('FlappyK market data load failed:', error);
    window.alert('Market data could not be loaded. Check your connection and try again.');
}
""",
    )
    replace_once(
        "game.js",
        """startBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    initAudio();
    startLevel();
});""",
        """startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    try {
        await ensureLevelMarketData();
        startScreen.classList.remove('active');
        initAudio();
        startLevel();
    } catch (error) {
        reportMarketLoadFailure(error);
    } finally {
        startBtn.disabled = false;
    }
});""",
    )
    replace_once(
        "game.js",
        """nextBtn.addEventListener('click', () => {
    settlementScreen.classList.remove('active');
    startLevel();
});
restartBtn.addEventListener('click', () => {
    settlementScreen.classList.remove('active');
    level = 1;
    targetReturn = 0;
    collectedCards = [];
    startLevel();
});""",
        """nextBtn.addEventListener('click', async () => {
    nextBtn.disabled = true;
    try {
        await ensureLevelMarketData();
        settlementScreen.classList.remove('active');
        startLevel();
    } catch (error) {
        reportMarketLoadFailure(error);
    } finally {
        nextBtn.disabled = false;
    }
});
restartBtn.addEventListener('click', async () => {
    level = 1;
    targetReturn = 0;
    collectedCards = [];
    restartBtn.disabled = true;
    try {
        await ensureLevelMarketData(1);
        settlementScreen.classList.remove('active');
        startLevel();
    } catch (error) {
        reportMarketLoadFailure(error);
    } finally {
        restartBtn.disabled = false;
    }
});""",
    )
    replace_once(
        "game.js",
        """champagneRestartBtn.addEventListener('click', () => {
    champagneScreen.classList.remove('active');
    level = 1;
    targetReturn = 0;
    collectedCards = [];
    startLevel();
});""",
        """champagneRestartBtn.addEventListener('click', async () => {
    level = 1;
    targetReturn = 0;
    collectedCards = [];
    champagneRestartBtn.disabled = true;
    try {
        await ensureLevelMarketData(1);
        champagneScreen.classList.remove('active');
        startLevel();
    } catch (error) {
        reportMarketLoadFailure(error);
    } finally {
        champagneRestartBtn.disabled = false;
    }
});""",
    )
    replace_once(
        "game.js",
        """    // In case data failed to fetch, fallback
    if (!stockData[currentMarket] || Object.keys(stockData[currentMarket]).length === 0) {
        currentMarket = Object.keys(stockData).find(k => Object.keys(stockData[k]).length > 0);
    }
    
    const assets = Object.keys(stockData[currentMarket]);""",
        """    if (!stockData[currentMarket] || Object.keys(stockData[currentMarket]).length === 0) {
        throw new Error(`Market data is not loaded: ${currentMarket}`);
    }

    const assets = Object.keys(stockData[currentMarket]);""",
    )


def patch_custom() -> None:
    replace_once(
        "custom-challenge.js",
        """    function availableMarkets() {
        return Object.keys(marketLabels).filter((market) =>
            stockData[market] && Object.keys(stockData[market]).length > 0
        );
    }""",
        """    function availableMarkets() {
        return window.FlappyKData?.markets?.() || Object.keys(marketLabels);
    }""",
    )
    replace_once("custom-challenge.js", "\n        populateAssets();\n    }\n\n    function populateAssets() {", "\n    }\n\n    async function populateAssets() {")
    replace_once(
        "custom-challenge.js",
        """        const market = marketSelect.value;
        const previousValue = assetSelect.value;
        const assets = Object.keys(stockData[market] || {}).sort((a, b) => a.localeCompare(b));""",
        """        const market = marketSelect.value;
        const previousValue = assetSelect.value;
        await window.FlappyKData.loadMarket(market);
        const assets = Object.keys(stockData[market] || {}).sort((a, b) => a.localeCompare(b));""",
    )
    replace_once("custom-challenge.js", "    function openCustomSelector() {", "    async function openCustomSelector() {")
    replace_once(
        "custom-challenge.js",
        """        populateMarkets();

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

        customScreen.classList.add('active');""",
        """        populateMarkets();

        if (customState.market && availableMarkets().includes(customState.market)) {
            marketSelect.value = customState.market;
        }
        await populateAssets();
        if (customState.market && customState.asset && Object.prototype.hasOwnProperty.call(
            stockData[customState.market] || {},
            customState.asset
        )) {
            assetSelect.value = customState.asset;
        }

        customScreen.classList.add('active');""",
    )
    replace_once("custom-challenge.js", "    function startCustomChallenge({ reuseWindow = false } = {}) {", "    async function startCustomChallenge({ reuseWindow = false } = {}) {")
    replace_once(
        "custom-challenge.js",
        """        const market = marketSelect.value || customState.market;
        const asset = assetSelect.value || customState.asset;
        const data = stockData[market]?.[asset];""",
        """        const market = marketSelect.value || customState.market;
        const asset = assetSelect.value || customState.asset;
        await window.FlappyKData.loadMarket(market);
        const data = stockData[market]?.[asset];""",
    )
    file = path("custom-challenge.js")
    text = file.read_text(encoding="utf-8")
    text = text.replace("        openCustomSelector();\n        return true;", "        void openCustomSelector();\n        return true;")
    text = text.replace("            openCustomSelector();\n", "            void openCustomSelector();\n")
    text = text.replace("    marketSelect.addEventListener('change', populateAssets);", "    marketSelect.addEventListener('change', () => { void populateAssets(); });")
    text = text.replace("        startCustomChallenge({ reuseWindow: false });", "        void startCustomChallenge({ reuseWindow: false });")
    text = text.replace("        startCustomChallenge({ reuseWindow: true });", "        void startCustomChallenge({ reuseWindow: true });")
    text = text.replace("        openCustomSelector();\n    });", "        void openCustomSelector();\n    });")
    file.write_text(text, encoding="utf-8")


def patch_daily() -> None:
    replace_once(
        "daily-run.js",
        "        lastRecordedSignature: '',\n    };",
        "        lastRecordedSignature: '',\n        loading: false,\n        loadFailed: false,\n    };",
    )
    replace_once(
        "daily-run.js",
        "    state.descriptors = createDescriptors();\n",
        """    async function ensureDescriptors() {
        if (state.descriptors.length === 3) return true;
        state.loading = true;
        state.loadFailed = false;
        renderDailySummary();
        try {
            await window.FlappyKData.loadMarkets(window.FlappyKData.markets());
            state.descriptors = createDescriptors();
            state.loadFailed = state.descriptors.length !== 3;
        } catch (error) {
            console.warn('Daily Run market data could not be loaded.', error);
            state.descriptors = [];
            state.loadFailed = true;
        } finally {
            state.loading = false;
            renderDailySummary();
        }
        return state.descriptors.length === 3;
    }
""",
    )
    replace_once(
        "daily-run.js",
        """        dailyButton.disabled = state.descriptors.length !== 3;
        dailyButton.textContent = state.descriptors.length === 3
            ? Number.isFinite(Number(todayBest)) ? 'REPLAY DAILY' : 'DAILY RUN'
            : 'DAILY UNAVAILABLE';""",
        """        dailyButton.disabled = state.loading;
        dailyButton.textContent = state.loading
            ? 'LOADING…'
            : state.loadFailed
                ? 'DAILY UNAVAILABLE'
                : Number.isFinite(Number(todayBest)) ? 'REPLAY DAILY' : 'DAILY RUN';""",
    )
    replace_once("daily-run.js", "    function startDailyRun() {", "    async function startDailyRun() {")
    replace_once(
        "daily-run.js",
        """        if (state.descriptors.length !== 3) {
            window.alert('Today’s Daily Run is unavailable for the current market snapshot.');
            return;
        }

        state.active = true;""",
        """        if (!await ensureDescriptors()) {
            window.alert('Today’s Daily Run is unavailable for the current market snapshot.');
            return;
        }

        state.active = true;""",
    )
    replace_once("daily-run.js", "        startDailyRun();\n    }, { capture: true });", "        void startDailyRun();\n    }, { capture: true });")


def patch_friend() -> None:
    replace_once("friend-challenge.js", "    function loadInviteFromLocation() {", "    async function loadInviteFromLocation() {")
    replace_once(
        "friend-challenge.js",
        """        const payload = codec.decodeChallenge(token);
        if (!payload || !validateAgainstDataset(payload)) {
            state.invite = null;
            removeChallengeToken();
            clearInviteVisual();
            window.alert('This friend challenge is invalid or no longer matches the bundled market snapshot.');
            return;
        }

        state.invite = payload;""",
        """        const payload = codec.decodeChallenge(token);
        if (!payload || !codec.validateChallengeShape(payload)) {
            state.invite = null;
            removeChallengeToken();
            clearInviteVisual();
            window.alert('This friend challenge is invalid.');
            return;
        }

        if (startButton) startButton.disabled = true;
        try {
            await window.FlappyKData.loadMarkets(payload.g.map((descriptor) => descriptor.m));
        } catch (error) {
            console.warn('Friend challenge market data could not be loaded.', error);
            return;
        } finally {
            if (startButton) startButton.disabled = false;
        }
        if (!validateAgainstDataset(payload)) {
            state.invite = null;
            removeChallengeToken();
            clearInviteVisual();
            window.alert('This friend challenge no longer matches the market snapshot.');
            return;
        }

        state.invite = payload;""",
    )
    file = path("friend-challenge.js")
    text = file.read_text(encoding="utf-8")
    text = text.replace("        loadInviteFromLocation();\n    });", "        void loadInviteFromLocation();\n    });")
    text = text.replace("    loadInviteFromLocation();\n})();", "    void loadInviteFromLocation();\n})();")
    file.write_text(text, encoding="utf-8")


def patch_pwa_and_audit() -> None:
    replace_once("sw.js", "    './data.js',", "    './data-loader.js',")
    sw_file = path("sw.js")
    sw = sw_file.read_text(encoding="utf-8")
    if not sw.endswith("\n"):
        sw_file.write_text(sw + "\n", encoding="utf-8")

    audit_file = path("scripts/audit_bundled_data.py")
    audit = audit_file.read_text(encoding="utf-8")
    audit = audit.replace('DATA_FILE = Path(__file__).resolve().parents[1] / "data.js"', 'DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "markets"')
    start = audit.find("def load_stock_data()")
    end = audit.find("\ndef rows_by_date", start)
    if start < 0 or end < 0:
        raise RuntimeError("bundled data audit loader block missing")
    loader = '''def load_stock_data() -> dict[str, dict[str, list[dict[str, Any]]]]:
    data: dict[str, dict[str, list[dict[str, Any]]]] = {}
    for market in ("crypto", "ashare", "usstock"):
        market_path = DATA_DIR / f"{market}.json"
        payload = json.loads(market_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise RuntimeError(f"{market_path} does not contain a market object")
        data[market] = payload
    return data

'''
    audit_file.write_text(audit[:start] + loader + audit[end + 1 :], encoding="utf-8")


def patch_tests() -> None:
    file = path("tests/pwa.test.js")
    text = file.read_text(encoding="utf-8")
    text = text.replace(
        'assert.ok(pixelStyles.includes("family=Pixelify+Sans"));',
        '''assert.ok(indexSource.includes('rel="preconnect" href="https://fonts.googleapis.com"'));
assert.ok(indexSource.includes('rel="preconnect" href="https://fonts.gstatic.com" crossorigin'));
assert.ok(indexSource.includes('family=Pixelify+Sans'));
assert.ok(!pixelStyles.includes('@import url('));''',
        1,
    )
    text = text.replace(
        'assert.ok(serviceWorkerSource.includes("\'./data.js\'"));',
        '''assert.ok(serviceWorkerSource.includes("'./data-loader.js'"));
assert.ok(!serviceWorkerSource.includes("'./data.js'"));
assert.ok(!serviceWorkerSource.includes("'./data/markets/crypto.json'"));''',
        1,
    )
    file.write_text(text, encoding="utf-8")

    file = path("tests/i18n.test.js")
    text = file.read_text(encoding="utf-8")
    old = 'assert.ok(cssSource.startsWith("@import url(\'https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou"));'
    if old not in text:
        raise RuntimeError("i18n font import test anchor missing")
    text = text.replace(old, "assert.ok(indexSource.includes('family=ZCOOL+QingKe+HuangYou'));\nassert.ok(!cssSource.includes('@import url('));", 1)
    file.write_text(text, encoding="utf-8")

    file = path("tests/web-composition-contract.test.js")
    text = file.read_text(encoding="utf-8")
    text = text.replace("const hardeningJs = fs.readFileSync('core-hardening.js', 'utf8');", "const hardeningJs = fs.readFileSync('core-hardening.js', 'utf8');\nconst gameJs = fs.readFileSync('game.js', 'utf8');", 1)
    text = text.replace(
        "assert.ok(refinementJs.includes('canvasElement.clientWidth || window.innerWidth'));\nassert.ok(refinementJs.includes('canvasElement.clientHeight || window.innerHeight'));",
        "assert.ok(!refinementJs.includes('canvasElement.width ='));\nassert.ok(!refinementJs.includes('canvasElement.height ='));\nassert.ok(!refinementJs.includes('syncCanvasLayout'));\nassert.ok(gameJs.includes('window.devicePixelRatio'));\nassert.ok(gameJs.includes('ctx.setTransform(dpr, 0, 0, dpr, 0, 0)'));",
        1,
    )
    text = text.replace('  "family=Pixelify+Sans",\n', '', 1)
    file.write_text(text, encoding="utf-8")

    file = path("tests/e2e/pwa.spec.js")
    text = file.read_text(encoding="utf-8")
    start = text.find("test('PWA registers, controls the page, and reloads offline'")
    end = text.find("\ntest('install prompt exposes", start)
    if start < 0 or end < 0:
        raise RuntimeError("PWA offline e2e block missing")
    replacement = '''test('PWA runtime-caches a market chunk after first use and replays it offline', async ({ page, context }) => {
  await preparePage(page);
  await page.goto('/');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.webmanifest');
  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    return { scope: ready.scope, active: Boolean(ready.active) };
  });
  expect(registration.active).toBe(true);
  expect(registration.scope).toContain('127.0.0.1:8000/');

  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 20_000 }).toBe(true);
  expect(await page.evaluate(() => Object.keys(stockData.crypto || {}).length)).toBe(0);

  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Object.keys(stockData.crypto || {}).length)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => Array.isArray(currentData) ? currentData.length : 0)).toBe(250);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Array.isArray(currentData) ? currentData.length : 0)).toBe(250);
  await context.setOffline(false);
});
'''
    text = text[:start] + replacement + text[end:]
    text += '''

test('canvas backing store follows devicePixelRatio while gameplay coordinates stay in CSS pixels', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await preparePage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Array.isArray(currentData) ? currentData.length : 0)).toBe(250);
  const size = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      dpr: window.devicePixelRatio,
      cssWidth: Math.round(rect.width),
      cssHeight: Math.round(rect.height),
      backingWidth: canvas.width,
      backingHeight: canvas.height,
    };
  });
  expect(size.dpr).toBe(2);
  expect(size.backingWidth).toBe(Math.round(size.cssWidth * size.dpr));
  expect(size.backingHeight).toBe(Math.round(size.cssHeight * size.dpr));
  await context.close();
});
'''
    file.write_text(text, encoding="utf-8")

    validator = path("scripts/validate-static-contracts.mjs")
    text = validator.read_text(encoding="utf-8")
    anchor = "const analytics = readFileSync(join(root, 'analytics.js'), 'utf8');"
    if anchor not in text:
        raise RuntimeError("static validator anchor missing")
    addition = '''const dataLoader = readFileSync(join(root, 'data-loader.js'), 'utf8');
if (!index.includes('<script src="data-loader.js"></script>') || index.includes('<script src="data.js"></script>')) {
  throw new Error('FlappyK must boot through the lazy market data loader, not data.js.');
}
for (const market of ['crypto', 'ashare', 'usstock']) requireFile(`data/markets/${market}.json`);
if (!dataLoader.includes('window.FlappyKData') || !dataLoader.includes('loadMarket')) {
  throw new Error('Lazy market loader contract is missing.');
}
const gameSource = readFileSync(join(root, 'game.js'), 'utf8');
const refinementSource = readFileSync(join(root, 'scripts/premium-ui-refinement.js'), 'utf8');
const canvasWrites = [...gameSource.matchAll(/canvas\\.(?:width|height)\\s*=/g)].length
  + [...refinementSource.matchAll(/canvasElement\\.(?:width|height)\\s*=/g)].length;
if (canvasWrites !== 2 || refinementSource.includes('syncCanvasLayout')) {
  throw new Error(`Canvas backing store must have one owner in game.js; found ${canvasWrites} writes.`);
}
if (!gameSource.includes('window.devicePixelRatio') || !gameSource.includes('ctx.setTransform(dpr, 0, 0, dpr, 0, 0)')) {
  throw new Error('Canvas owner must scale its backing store for devicePixelRatio.');
}

'''
    validator.write_text(text.replace(anchor, addition + anchor, 1), encoding="utf-8")


def patch_docs_and_retire() -> None:
    file = path("README.md")
    text = file.read_text(encoding="utf-8")
    replacements = {
        "The market snapshot is stored locally in `data.js`.": "The market snapshot is stored as lazy market chunks under `data/markets/` and loaded through `data-loader.js`.",
        "the `html2canvas` CDN dependency, supplemental QQQ history, and the live leaderboard JSON.": "the `html2canvas` CDN dependency, Google Fonts, supplemental QQQ history, and the live leaderboard JSON.",
        "restores the three windows from the bundled `data.js` snapshot": "restores the three windows from the canonical market chunks",
        "`fetch_all_data.py` builds `data.js` from:": "`fetch_all_data.py` builds the market chunks under `data/markets/` from:",
        "Each newly generated `data.js` also records the generation time, yfinance version, and adjustment policy in `stockDataMeta`.": "Each refresh also writes generation time, yfinance version, and adjustment policy to `data/markets/meta.json`.",
        "- `data.js` — embedded historical market snapshot;": "- `data-loader.js` + `data/markets/*.json` — lazy historical market snapshot;",
        "It does not relicense `data.js`, generated market data,": "It does not relicense generated market data,",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    file.write_text(text, encoding="utf-8")
    path("fetch_data.py").unlink(missing_ok=True)
    path("fetch_binance.py").unlink(missing_ok=True)


def main() -> None:
    split_snapshot()
    write_loader()
    patch_generator()
    patch_fonts_and_boot()
    patch_canvas()
    patch_game_loading()
    patch_custom()
    patch_daily()
    patch_friend()
    patch_pwa_and_audit()
    patch_tests()
    patch_docs_and_retire()


if __name__ == "__main__":
    main()
