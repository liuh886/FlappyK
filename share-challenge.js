(() => {
    'use strict';

    const SITE_URL = 'https://liuh886.github.io/FlappyK/';
    const challengeButton = document.getElementById('challenge-share-btn');
    const saveButton = document.getElementById('champagne-save-btn');
    const exportArea = document.getElementById('champagne-export-area');
    const mobileViewport = window.matchMedia('(max-width: 768px)');

    function parseReturn(value) {
        const parsed = Number.parseFloat(String(value || '').replace('%', ''));
        return Number.isFinite(parsed) ? parsed / 100 : 0;
    }

    function calculateLegendScore() {
        if (!Array.isArray(collectedCards) || collectedCards.length !== 3) return null;

        let benchmarkGrowth = 1;
        collectedCards.forEach((card) => {
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
        });

        const totalReturn = Number(finalReturn) * 100;
        const excess = (Number(finalReturn) - (benchmarkGrowth - 1)) * 100;
        return Number.isFinite(totalReturn) && Number.isFinite(excess)
            ? { totalReturn, excess }
            : null;
    }

    function formatPercent(value) {
        return `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
    }

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

    function addChallengeHeadline(root, score) {
        root.querySelector('.legend-share-cta')?.remove();
        const headline = document.createElement('div');
        headline.className = 'legend-share-cta';
        headline.innerHTML = [
            '<span>I TRADED 3 HIDDEN MARKETS</span>',
            `<strong>${formatPercent(score.excess)} EXCESS</strong>`,
            '<span>CAN YOU BEAT ME?</span>',
        ].join('');
        root.prepend(headline);
    }

    async function waitForLayout() {
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    async function renderLegend(score) {
        if (!exportArea || exportArea.children.length === 0) {
            throw new Error('Legend cards have not been rendered');
        }
        if (typeof window.html2canvas !== 'function') {
            throw new Error('html2canvas is not available');
        }

        const stage = document.createElement('div');
        stage.className = 'challenge-export-stage';
        stage.setAttribute('aria-hidden', 'true');

        const surface = document.createElement('div');
        surface.className = `challenge-export-surface${mobileViewport.matches ? ' challenge-export-surface--mobile' : ''}`;

        const clone = exportArea.cloneNode(true);
        stripIds(clone);
        normalizeLegendCurrency(clone);
        addChallengeHeadline(clone, score);
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
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('PNG generation returned an empty file'));
            }, 'image/png');
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

    async function copyFallback(text, url) {
        const payload = `${text}\n${url}`;
        try {
            await navigator.clipboard.writeText(payload);
            window.alert('Challenge text and link copied. The result image was also saved.');
        } catch (error) {
            window.prompt('Copy this challenge:', payload);
        }
    }

    async function shareChallenge(blob, score) {
        const scoreText = formatPercent(score.excess);
        const text = `I traded 3 hidden historical markets and finished with ${scoreText} Excess. Can you beat me?`;
        const url = window.FlappyKFriendChallenge?.buildChallengeUrl(score) || SITE_URL;
        const filename = `FlappyK_Challenge_${scoreText.replace(/[+%]/g, '').replace('-', 'minus-')}.png`;
        const file = typeof File === 'function'
            ? new File([blob], filename, { type: 'image/png' })
            : null;

        if (typeof navigator.share === 'function') {
            const payload = {
                title: 'FlappyK — Can You Beat a Hidden Market?',
                text,
                url,
            };
            if (file && typeof navigator.canShare === 'function') {
                try {
                    if (navigator.canShare({ files: [file] })) payload.files = [file];
                } catch (error) {
                    console.warn('File sharing capability check failed.', error);
                }
            }

            try {
                await navigator.share(payload);
                return;
            } catch (error) {
                if (error?.name === 'AbortError') return;
                console.warn('Native challenge share failed; using fallback.', error);
            }
        }

        downloadBlob(blob, filename);
        await copyFallback(text, url);
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
            console.error('Challenge share failed:', error);
            window.alert('The challenge could not be prepared. Please try again.');
        } finally {
            button.disabled = false;
            button.textContent = original;
            delete button.dataset.challengeBusy;
        }
    }

    challengeButton?.addEventListener('click', (event) => {
        event.preventDefault();
        withBusyButton(challengeButton, 'PREPARING...', async () => {
            const score = calculateLegendScore();
            if (!score) throw new Error('Completed three-game score is unavailable');
            const canvas = await renderLegend(score);
            const blob = await canvasToBlob(canvas);
            await shareChallenge(blob, score);
        });
    }, true);

    // Register before card-export.js so SAVE RESULT is always a direct download,
    // while single Profit Cards keep their existing native-share behavior.
    saveButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        withBusyButton(saveButton, 'SAVING...', async () => {
            const score = calculateLegendScore();
            if (!score) throw new Error('Completed three-game score is unavailable');
            const canvas = await renderLegend(score);
            const blob = await canvasToBlob(canvas);
            downloadBlob(blob, 'FlappyK_Legend_Challenge.png');
        });
    }, true);

    window.FlappyKShare = {
        calculateLegendScore,
        formatPercent,
    };
})();
