(() => {
    'use strict';

    const saveCardButton = document.getElementById('save-card-btn');
    const saveLegendButton = document.getElementById('champagne-save-btn');
    const champagneButton = document.getElementById('champagne-btn');
    const mobileViewport = window.matchMedia('(max-width: 768px)');
    const preparedShares = new WeakMap();

    function normalizeLegendCurrency(root) {
        if (!root) return;

        root.querySelectorAll('.card-details p').forEach((row) => {
            const highlight = row.querySelector('.highlight');
            const labelNode = highlight && highlight.previousSibling;

            if (!highlight
                || !highlight.textContent.trim().startsWith('$')
                || !labelNode
                || labelNode.nodeType !== Node.TEXT_NODE) {
                return;
            }

            labelNode.textContent = labelNode.textContent.replace(/\$\s*$/, '');
        });
    }

    function stripIds(root) {
        root.removeAttribute('id');
        root.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    }

    async function waitForCaptureLayout() {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    function createCaptureSurface(source, mode) {
        const stage = document.createElement('div');
        stage.className = 'card-export-stage';
        stage.setAttribute('aria-hidden', 'true');

        const surface = document.createElement('div');
        surface.className = `card-export-surface card-export-surface--${mode}`;

        if (mode === 'legend' && mobileViewport.matches) {
            surface.classList.add('card-export-surface--mobile-legend');
        }

        const clone = source.cloneNode(true);
        stripIds(clone);
        clone.classList.add('card-export-clone');
        if (mode === 'legend') normalizeLegendCurrency(clone);

        surface.appendChild(clone);
        stage.appendChild(surface);
        document.body.appendChild(stage);

        return { stage, surface };
    }

    async function renderCapture(source, mode) {
        if (typeof window.html2canvas !== 'function') {
            throw new Error('html2canvas is not available');
        }

        const { stage, surface } = createCaptureSurface(source, mode);

        try {
            await waitForCaptureLayout();

            const width = Math.ceil(surface.scrollWidth);
            const height = Math.ceil(surface.scrollHeight);

            return await window.html2canvas(surface, {
                backgroundColor: mode === 'legend' ? '#0d1117' : null,
                scale: 2,
                useCORS: true,
                allowTaint: false,
                logging: false,
                imageTimeout: 15000,
                removeContainer: true,
                scrollX: 0,
                scrollY: 0,
                width,
                height,
                windowWidth: Math.max(document.documentElement.clientWidth, width),
                windowHeight: Math.max(document.documentElement.clientHeight, height)
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

    function createShareFile(blob, filename) {
        const prefersNativeShare = mobileViewport.matches || navigator.maxTouchPoints > 0;

        if (!prefersNativeShare
            || typeof File !== 'function'
            || typeof navigator.share !== 'function'
            || typeof navigator.canShare !== 'function') {
            return null;
        }

        const file = new File([blob], filename, { type: 'image/png' });

        try {
            return navigator.canShare({ files: [file] }) ? file : null;
        } catch (error) {
            console.warn('File sharing capability check failed.', error);
            return null;
        }
    }

    function restoreButton(button) {
        button.disabled = false;
        button.textContent = button.dataset.exportOriginalLabel || button.textContent;
        delete button.dataset.exportBusy;
        delete button.dataset.exportOriginalLabel;
        preparedShares.delete(button);
    }

    async function sharePrepared(button, prepared) {
        button.disabled = true;
        button.textContent = 'SHARING...';

        try {
            // This call occurs before the first await so it is tied directly to
            // the user's second tap on browsers with strict activation rules.
            const sharePromise = navigator.share({
                title: prepared.title,
                text: 'Flappy K result',
                files: [prepared.file]
            });
            await sharePromise;
        } catch (error) {
            if (!error || error.name !== 'AbortError') {
                console.warn('Native share failed; falling back to download.', error);
                downloadBlob(prepared.file, prepared.file.name);
            }
        } finally {
            restoreButton(button);
        }
    }

    async function shareOrDownload(button, blob, filename, title) {
        const file = createShareFile(blob, filename);

        if (!file) {
            downloadBlob(blob, filename);
            return;
        }

        try {
            await navigator.share({
                title,
                text: 'Flappy K result',
                files: [file]
            });
        } catch (error) {
            if (error && error.name === 'AbortError') return;

            if (error && error.name === 'NotAllowedError') {
                preparedShares.set(button, { file, title });
                button.disabled = false;
                button.textContent = 'TAP TO SHARE';
                return;
            }

            console.warn('Native share failed; falling back to download.', error);
            downloadBlob(blob, filename);
        }
    }

    async function withBusyButton(button, busyLabel, task) {
        if (!button || button.dataset.exportBusy === 'true') return;

        button.dataset.exportOriginalLabel = button.textContent;
        button.dataset.exportBusy = 'true';
        button.disabled = true;
        button.textContent = busyLabel;

        try {
            await task();
        } catch (error) {
            console.error('Card export failed:', error);
            window.alert('The result image could not be generated. Please try again.');
        } finally {
            if (!preparedShares.has(button)) restoreButton(button);
            else delete button.dataset.exportBusy;
        }
    }

    function getProfitCardFilename(card) {
        if (card.dataset.resultMode === 'custom') {
            return 'FlappyK_Custom_ProfitCard.png';
        }

        const completedLevel = card.dataset.completedLevel || 'Result';
        return `FlappyK_ProfitCard_Level${completedLevel}.png`;
    }

    function installExportHandler(button, task) {
        if (!button) return;

        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            const prepared = preparedShares.get(button);
            if (prepared) {
                sharePrepared(button, prepared);
                return;
            }

            task();
        }, true);
    }

    installExportHandler(saveCardButton, () => {
        withBusyButton(saveCardButton, 'GENERATING...', async () => {
            const card = document.getElementById('profit-card');
            if (!card) throw new Error('Profit card element was not found');

            const filename = getProfitCardFilename(card);
            const canvas = await renderCapture(card, 'single');
            const blob = await canvasToBlob(canvas);
            await shareOrDownload(saveCardButton, blob, filename, 'Flappy K Profit Card');
        });
    });

    if (champagneButton) {
        champagneButton.addEventListener('click', () => {
            requestAnimationFrame(() => normalizeLegendCurrency(
                document.getElementById('champagne-export-area')
            ));
        });
    }

    installExportHandler(saveLegendButton, () => {
        withBusyButton(saveLegendButton, 'GENERATING...', async () => {
            const legend = document.getElementById('champagne-export-area');
            if (!legend || legend.children.length === 0) {
                throw new Error('Legend cards have not been rendered');
            }

            const filename = 'FlappyK_Legend_Cards.png';
            const canvas = await renderCapture(legend, 'legend');
            const blob = await canvasToBlob(canvas);
            await shareOrDownload(saveLegendButton, blob, filename, 'Flappy K Legend Cards');
        });
    });
})();
