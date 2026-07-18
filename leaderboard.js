(() => {
    'use strict';

    const REPOSITORY = 'liuh886/FlappyK';
    const GAME_VERSION = '0.1.0';
    const LEADERBOARD_LIMIT = 10;
    const LEADERBOARD_URL = `https://raw.githubusercontent.com/${REPOSITORY}/master/data/leaderboard.json`;
    const ISSUE_URL = `https://github.com/${REPOSITORY}/issues/new`;

    const startScreen = document.getElementById('start-screen');
    const openButton = document.getElementById('leaderboard-open-btn');
    const closeButton = document.getElementById('leaderboard-close-btn');
    const leaderboardScreen = document.getElementById('leaderboard-screen');
    const leaderboardRows = document.getElementById('leaderboard-rows');
    const leaderboardStatus = document.getElementById('leaderboard-status');
    const submitButton = document.getElementById('leaderboard-submit-btn');
    const submitStatus = document.getElementById('leaderboard-submit-status');

    let cachedEntries = [];
    let activeScore = null;

    const formatPercent = (value) =>
        `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;

    function parseReturn(value) {
        const parsed = Number.parseFloat(String(value || '').replace('%', ''));
        return Number.isFinite(parsed) ? parsed / 100 : 0;
    }

    function compareScores(left, right) {
        const excessDifference = Number(right.excess) - Number(left.excess);
        if (Math.abs(excessDifference) > 1e-9) return excessDifference;
        return Number(right.totalReturn) - Number(left.totalReturn);
    }

    function normalizeEntries(payload) {
        const entries = Array.isArray(payload) ? payload : payload?.entries;
        if (!Array.isArray(entries)) return [];

        return entries
            .filter((entry) => entry && typeof entry.player === 'string')
            .map((entry) => ({
                ...entry,
                excess: Number(entry.excess),
                totalReturn: Number(entry.totalReturn),
            }))
            .filter((entry) => Number.isFinite(entry.excess))
            .sort(compareScores)
            .slice(0, LEADERBOARD_LIMIT);
    }

    async function loadLeaderboard() {
        const response = await fetch(`${LEADERBOARD_URL}?t=${Date.now()}`, {
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Leaderboard request failed with ${response.status}`);
        }

        cachedEntries = normalizeEntries(await response.json());
        return cachedEntries;
    }

    function clearRows() {
        while (leaderboardRows?.firstChild) {
            leaderboardRows.firstChild.remove();
        }
    }

    function renderLeaderboard(entries) {
        if (!leaderboardRows || !leaderboardStatus) return;

        clearRows();

        if (entries.length === 0) {
            leaderboardStatus.textContent = 'NO SCORES YET · BE THE FIRST';
            return;
        }

        entries.forEach((entry, index) => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';

            const rank = document.createElement('span');
            rank.className = 'leaderboard-rank';
            rank.textContent = `#${index + 1}`;

            const player = document.createElement('a');
            player.className = 'leaderboard-player';
            player.textContent = `@${entry.player}`;
            player.href = entry.issueUrl || `https://github.com/${encodeURIComponent(entry.player)}`;
            player.target = '_blank';
            player.rel = 'noopener noreferrer';

            const excess = document.createElement('span');
            excess.className = 'leaderboard-excess';
            excess.textContent = formatPercent(entry.excess);

            row.append(rank, player, excess);
            leaderboardRows.appendChild(row);
        });

        leaderboardStatus.textContent = 'RANKED BY TOTAL EXCESS · ONE BEST SCORE PER PLAYER';
    }

    async function showLeaderboard() {
        startScreen?.classList.remove('active');
        leaderboardScreen?.classList.add('active');
        if (leaderboardStatus) leaderboardStatus.textContent = 'LOADING TOP 10...';

        try {
            renderLeaderboard(await loadLeaderboard());
        } catch (error) {
            console.warn('FlappyK leaderboard could not be loaded:', error);
            clearRows();
            if (leaderboardStatus) {
                leaderboardStatus.textContent = 'LEADERBOARD TEMPORARILY UNAVAILABLE';
            }
        }
    }

    function hideLeaderboard() {
        leaderboardScreen?.classList.remove('active');
        startScreen?.classList.add('active');
        openButton?.focus();
    }

    function calculateLegendScore() {
        if (!Array.isArray(collectedCards) || collectedCards.length !== 3) return null;

        let benchmarkGrowth = 1;
        const levels = collectedCards.map((card, index) => {
            const levelReturn = Number.isFinite(card.levelReturn)
                ? card.levelReturn
                : parseReturn(card.levelRetStr);
            const excessReturn = Number.isFinite(card.excessReturn)
                ? card.excessReturn
                : parseReturn(card.excessRetStr);
            const marketReturn = Number.isFinite(card.marketReturn)
                ? card.marketReturn
                : levelReturn - excessReturn;

            benchmarkGrowth *= (1 + marketReturn);

            return {
                level: index + 1,
                asset: String(card.asset || 'UNKNOWN').replace(/[\r\n|]/g, ' ').slice(0, 48),
                period: String(card.periodStr || 'UNKNOWN').replace(/[\r\n|]/g, ' ').slice(0, 64),
                excess: excessReturn * 100,
            };
        });

        const totalReturn = Number(finalReturn) * 100;
        const totalExcess = (Number(finalReturn) - (benchmarkGrowth - 1)) * 100;

        if (!Number.isFinite(totalReturn) || !Number.isFinite(totalExcess)) return null;

        return {
            excess: totalExcess,
            totalReturn,
            levels,
        };
    }

    function qualifiesForTop10(score, entries) {
        if (!Array.isArray(entries) || entries.length < LEADERBOARD_LIMIT) return true;
        return compareScores(score, entries[entries.length - 1]) < 0;
    }

    function setSubmissionState(score, entries, leaderboardAvailable) {
        if (!submitButton || !submitStatus) return;

        activeScore = score;

        if (!score) {
            submitButton.style.display = 'none';
            submitStatus.textContent = '';
            return;
        }

        const qualifies = !leaderboardAvailable || qualifiesForTop10(score, entries);
        submitButton.style.display = qualifies ? 'inline-block' : 'none';

        if (!leaderboardAvailable) {
            submitButton.textContent = 'SUBMIT SCORE';
            submitStatus.textContent = `${formatPercent(score.excess)} EXCESS · GITHUB WILL VERIFY TOP 10`;
            return;
        }

        if (qualifies) {
            const cutoff = entries.length < LEADERBOARD_LIMIT
                ? 'OPEN SLOT'
                : `${formatPercent(entries[entries.length - 1].excess)} CUT`;
            submitButton.textContent = 'SUBMIT TOP 10';
            submitStatus.textContent = `${formatPercent(score.excess)} EXCESS · ${cutoff}`;
        } else {
            submitStatus.textContent = `${formatPercent(score.excess)} EXCESS · TOP 10 CUT ${formatPercent(entries[entries.length - 1].excess)}`;
        }
    }

    async function prepareScoreSubmission() {
        const score = calculateLegendScore();
        if (!score) {
            setSubmissionState(null, [], false);
            return;
        }

        if (submitStatus) submitStatus.textContent = 'CHECKING TOP 10...';

        try {
            const entries = await loadLeaderboard();
            setSubmissionState(score, entries, true);
        } catch (error) {
            console.warn('Top 10 pre-check failed:', error);
            setSubmissionState(score, cachedEntries, false);
        }
    }

    function buildSubmissionUrl(score) {
        const title = `[FLAPPYK SCORE] ${formatPercent(score.excess)} EXCESS`;
        const levelLines = score.levels
            .map((item) => `- LEVEL ${item.level}: ${item.asset} | ${item.period} | ${formatPercent(item.excess)} EXCESS`)
            .join('\n');
        const body = [
            `<!-- FLAPPYK_SCORE_V1 EXCESS=${score.excess.toFixed(6)} TOTAL_RETURN=${score.totalReturn.toFixed(6)} GAME_VERSION=${GAME_VERSION} -->`,
            '',
            '## FlappyK Top 10 submission',
            '',
            `**TOTAL EXCESS:** ${formatPercent(score.excess)}`,
            `**TOTAL RETURN:** ${formatPercent(score.totalReturn)}`,
            '',
            levelLines,
            '',
            'This score was generated by FlappyK. Please submit this prefilled issue without editing the hidden score block.',
        ].join('\n');

        const query = new URLSearchParams({ title, body });
        return `${ISSUE_URL}?${query.toString()}`;
    }

    function submitScore() {
        if (!activeScore) return;

        const url = buildSubmissionUrl(activeScore);
        const opened = window.open(url, '_blank', 'noopener');
        if (!opened) window.location.href = url;

        if (submitButton) submitButton.textContent = 'GITHUB OPENED';
        if (submitStatus) {
            submitStatus.textContent = 'CONFIRM THE PREFILLED ISSUE · ONLY FINAL TOP 10 SCORES ARE STORED';
        }
    }

    openButton?.addEventListener('click', showLeaderboard);
    closeButton?.addEventListener('click', hideLeaderboard);
    submitButton?.addEventListener('click', submitScore);

    if (typeof champagneBtn !== 'undefined' && champagneBtn) {
        champagneBtn.addEventListener('click', () => {
            requestAnimationFrame(prepareScoreSubmission);
        });
    }

    loadLeaderboard().catch(() => {
        cachedEntries = [];
    });
})();
