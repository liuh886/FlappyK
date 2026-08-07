from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    file_path = ROOT / path
    text = file_path.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Missing expected block in {path}: {old[:80]!r}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


def replace_all(path: str, old: str, new: str, *, required: bool = True) -> int:
    file_path = ROOT / path
    text = file_path.read_text(encoding='utf-8')
    count = text.count(old)
    if required and count == 0:
        raise RuntimeError(f'Missing expected text in {path}: {old[:80]!r}')
    if count:
        file_path.write_text(text.replace(old, new), encoding='utf-8')
    return count


# The home must fully leave the rendering tree when gameplay starts.
replace_once(
    'home-market.css',
    """html body #start-screen.arcade-home {
    padding: 0;
    overflow: hidden;
    background: #050a11;
}
""",
    """html body #start-screen.arcade-home {
    padding: 0;
    overflow: hidden;
    background: #050a11;
}

html body #start-screen.arcade-home:not(.active) {
    display: none !important;
}

.home-market-sr-copy {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
}
""",
)

# Keep the primary action dominant and allocate the four live metrics by content need.
replace_once(
    'home-market.css',
    """    font-size: 20px;
    font-weight: 800;
""",
    """    font-size: 22px;
    font-weight: 800;
""",
)
replace_all(
    'home-market.css',
    'grid-template-columns: repeat(4, minmax(0, 1fr)) !important;',
    'grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.82fr) minmax(0, 0.9fr) minmax(0, 1.13fr) !important;',
)
replace_once(
    'home-market.css',
    """    html body #start-screen.arcade-home #daily-run-btn,
    html body #start-screen.arcade-home #leaderboard-open-btn {
        min-height: 36px;
        font-size: 10px;
    }
""",
    """    html body #start-screen.arcade-home #daily-run-btn,
    html body #start-screen.arcade-home #leaderboard-open-btn {
        min-height: 44px;
        font-size: 10px;
    }

    html body #home-utility-bar #language-toggle-btn,
    html body #home-utility-bar .hao-account-trigger,
    html body #home-utility-bar .membership-launcher {
        min-height: 40px !important;
        height: 40px !important;
    }
""",
)

# Friend challenges own the dynamic primary-action label while an invite is active.
replace_once(
    'scripts/home-market.js',
    """        document.querySelectorAll('[data-home-copy]').forEach((element) => {
            const key = element.dataset.homeCopy;
            if (text[key]) element.textContent = text[key];
        });
""",
    """        document.querySelectorAll('[data-home-copy]').forEach((element) => {
            const key = element.dataset.homeCopy;
            const challengeOwnsPrimaryAction = key === 'play'
                && Boolean(document.getElementById('friend-challenge-invite'));
            if (!challengeOwnsPrimaryAction && text[key]) element.textContent = text[key];
        });
""",
)

# Explicit/manual weather feedback must not be overwritten by the live observer during its hold.
replace_once(
    'scripts/market-weather.js',
    """    function applyMetrics(metrics, options = {}) {
        if (options.silent) clearWeatherEvent();
        const state = classifyWeather(metrics);
""",
    """    function applyMetrics(metrics, options = {}) {
        if (options.source === 'live' && clockNow() < explicitWeatherUntil) {
            return requestedWeather;
        }
        if (options.silent) clearWeatherEvent();
        const state = classifyWeather(metrics);
""",
)

# Browser contracts follow the new static home ownership and four-resource HUD.
replace_all('tests/e2e/market-weather.spec.js', '.home-console-kicker', '.home-market-kicker')
replace_all(
    'tests/e2e/market-weather.spec.js',
    "HIDDEN MARKET · PRESS PLAY",
    "LIVE DEMO · USE ↑ / ↓",
)
replace_all('tests/e2e/i18n.spec.js', '#start-screen > p', '.home-market-tagline')
replace_all('tests/e2e/pwa.spec.js', '#start-screen > p', '.home-market-tagline')
replace_once(
    'tests/e2e/pwa.spec.js',
    """  expect(typography.introSize).toBe('17px');
  expect(Number.parseFloat(typography.introLineHeight)).toBeGreaterThanOrEqual(28);
""",
    """  expect(Number.parseFloat(typography.introSize)).toBeGreaterThanOrEqual(18);
  expect(Number.parseFloat(typography.introLineHeight)).toBeGreaterThanOrEqual(21);
""",
)
replace_all('tests/e2e/web-composition.spec.js', 'expect(layout.statsColumns).toBe(3);', 'expect(layout.statsColumns).toBe(4);')
replace_all('tests/e2e/web-composition.spec.js', 'expect(positions.statsColumns).toBe(3);', 'expect(positions.statsColumns).toBe(4);')
replace_once(
    'tests/e2e/home-market.spec.js',
    """  await expect(home).not.toHaveClass(/active/);
  await expect(page.locator('#game-hud-rail')).toBeVisible();
""",
    """  await expect(home).not.toHaveClass(/active/);
  await expect(home).toBeHidden();
  await expect(page.locator('#game-hud-rail')).toBeVisible();
""",
)

# Static contracts assert the tuned resource allocation rather than the superseded equal columns.
old_columns = 'grid-template-columns: repeat(4, minmax(0, 1fr))'
new_columns = 'grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.82fr) minmax(0, 0.9fr) minmax(0, 1.13fr)'
for contract in (ROOT / 'tests').glob('*.test.js'):
    text = contract.read_text(encoding='utf-8')
    if old_columns in text:
        contract.write_text(text.replace(old_columns, new_columns), encoding='utf-8')

# Changed offline assets advance the shell as one integrated release.
replace_all('sw.js', 'flappyk-app-v21', 'flappyk-app-v22')
replace_all('sw.js', 'flappyk-runtime-v21', 'flappyk-runtime-v22')
for contract in (ROOT / 'tests').glob('*.test.js'):
    text = contract.read_text(encoding='utf-8')
    updated = text.replace('flappyk-app-v21', 'flappyk-app-v22')\
        .replace('flappyk-runtime-v21', 'flappyk-runtime-v22')\
        .replace('PWA v21', 'PWA v22')\
        .replace('and v21 offline', 'and v22 offline')
    if updated != text:
        contract.write_text(updated, encoding='utf-8')

# Self-delete: the final branch contains product code and tests only.
(ROOT / '.github/workflows/apply-home-integration-fixes.yml').unlink()
Path(__file__).unlink()
