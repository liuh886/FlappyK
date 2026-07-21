(() => {
    'use strict';

    const SITE_URL = 'https://liuh886.github.io/FlappyK/';
    const scoreApi = window.FlappyKLegendScore;
    const challengeButton = document.getElementById('challenge-share-btn');
    const saveButton = document.getElementById('champagne-save-btn');
    const exportArea = document.getElementById('champagne-export-area');
    const mobileViewport = window.matchMedia('(max-width: 768px)');

    const calculateLegendScore = () => scoreApi?.calculate(collectedCards, finalReturn) || null;
    const formatPercent = (value) => scoreApi?.formatPercent(value)
        || `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;

    function stripIds(root) {
        root.removeAttribute('id');
        root.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    }

    function normalizeLegendCurrency(root) {
        root.querySelectorAll('.card-details p').forEach((row) => {
            const highlight = row.querySelector('.highlight');
            const labelNode = highlight && highlight.previousSibling;
            if (!highlight || !highlight.textContent.trim().startsWith('$')
                || !labelNode || labelNode.nodeType !== Node.TEXT_NODE) return;
            labelNode.textContent = labelNode.textContent.replace(/\$\s*$/, '');
        });
    }

    async function waitForLayout() {
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    async function renderLegend() {
        if (!exportArea || exportArea.children.length === 0) throw new Error('Legend cards have not been rendered');
        if (typeof window.html2canvas !== 'function') throw new Error('html2canvas is not available');

        const stage = document.createElement('div');
        stage.className = 'challenge-export-stage';
        stage.setAttribute('aria-hidden', 'true');

        const surface = document.createElement('div');
        surface.className = `challenge-export-surface${mobileViewport.matches ? ' challenge-export-surface--mobile' : ''}`;

        const clone = exportArea.cloneNode(true);
        stripIds(clone);
        normalizeLegendCurrency(clone);
        surface.appendChild(clone);
        stage.appendChild(surface);
        document.body.appendChild(stage);

        try {
            await waitForLayout();
            const width = Math.ceil(surface.scrollWidth);
            const height = Math.ceil(surface.scrollHeight);
            return await window.html2canvas(surface, {
                backgroundColor: '#0d1117',
                scale: 2,
                useCORS: true,
                allowTaint: false,
                logging: false,
                imageTimeout: 15000,
                scrollX: 0,
                scrollY: 0,
                width,
                height,
                windowWidth: Math.max(document.documentElement.clientWidth, width),
                windowHeight: Math.max(document.documentElement.clientHeight, height),
            });
        } finally {
            stage.remove();
        }
    }

    function canvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => blob
                ? resolve(blob)
                : reject(new Error('PNG generation returned an empty file')), 'image/png');
        });
    }

    function downloadBlob(blob, filename) {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    }

    function buildChallengeShare(score) {
        const scoreText = formatPercent(score.excess);
        const url = window.FlappyKFriendChallenge?.buildChallengeUrl(score) || SITE_URL;
        if (url === SITE_URL) throw new Error('Friend challenge URL is unavailable');

        return {
            url,
            shareData: {
                title: 'FlappyK — Friend Challenge',
                text: `I finished 3 hidden historical markets with ${scoreText} Excess. Can you beat me on the same markets?`,
                url,
            },
        };
    }

    async function copyChallengeLink(url) {
        try {
            await navigator.clipboard.writeText(url);
            window.alert('Challenge link copied. Send it to a friend to play the same 3 hidden markets.');
            return 'copied';
        } catch (error) {
            window.prompt('Copy this friend challenge link:', url);
            return 'prompted';
        }
    }

    async function shareChallengeLink(score) {
        const challenge = buildChallengeShare(score);

        if (typeof navigator.share === 'function') {
            try {
                await navigator.share(challenge.shareData);
                return 'shared';
            } catch (error) {
                if (error?.name === 'AbortError') return 'cancelled';
                console.warn('Native link sharing failed; copying the challenge URL.', error);
            }
        }

        return copyChallengeLink(challenge.url);
    }

    async function withBusyButton(button, busyLabel, task) {
        if (!button || button.dataset.challengeBusy === 'true') return;
        const original = button.textContent;
        button.dataset.challengeBusy = 'true';
        button.disabled = true;
        button.textContent = busyLabel;
        try {
            await task();
        } catch (error) {
            console.error('Challenge action failed:', error);
            window.alert('The challenge link could not be prepared. Please try again.');
        } finally {
            button.disabled = false;
            button.textContent = original;
            delete button.dataset.challengeBusy;
        }
    }

    challengeButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        withBusyButton(challengeButton, 'SHARING...', async () => {
            const score = calculateLegendScore();
            if (!score) throw new Error('Completed three-game score is unavailable');
            await shareChallengeLink(score);
        });
    }, true);

    saveButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        withBusyButton(saveButton, 'SAVING...', async () => {
            const score = calculateLegendScore();
            if (!score) throw new Error('Completed three-game score is unavailable');
            const blob = await canvasToBlob(await renderLegend());
            downloadBlob(blob, 'FlappyK_Legend_Result.png');
        });
    }, true);

    window.FlappyKShare = { calculateLegendScore, formatPercent };
})();