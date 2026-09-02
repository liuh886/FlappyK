/**
 * FlappyK Ghost Replay — settlement overlay.
 * Owner: scripts/decision/ghost-overlay.js
 * Listens to flappyk:decision-ready, injects verdicts + GHOST REPLAY.
 * Fail-open, respects prefers-reduced-motion.
 */
(function installGhostOverlay() {
    'use strict';

    const GHOST_DURATION_MS = 6500;
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    let lastPayload = null;

    function getSettlementElements() {
        const card = document.getElementById('profit-card');
        const actions = document.querySelector('.settlement-actions');
        const marketIdentity = card?.querySelector('.settlement-market-identity');
        return { card, actions, marketIdentity };
    }

    function formatPercent(value) {
        if (!Number.isFinite(Number(value))) return '---%';
        const num = Number(value) * 100;
        return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
    }

    function clearDecisionLayer() {
        document.querySelectorAll('.decision-verdicts, .decision-counterfactuals, #ghost-replay-btn, #ghost-overlay').forEach((el) => el.remove());
    }

    function verdictCopy(id, payload) {
        const t = window.FlappyKI18n?.t || ((v) => v);
        const report = payload.report;
        switch (id) {
            case 'PAPER_HANDS':
                return {
                    title: t('PAPER HANDS'),
                    body: `SOLD DAY ${report.lastSellDay !== null ? String(report.lastSellDay + 1).padStart(3, '0') : '---'} · AFTER ${formatPercent(report.returnAfterLastSell)}`,
                    sub: `IF HELD FROM FIRST BUY: ${formatPercent(payload.counterfactuals.firstEntryHold.return)}`,
                };
            case 'DODGED_THE_CRASH':
                return {
                    title: t('DODGED THE CRASH'),
                    body: `MARKET ${formatPercent(report.marketReturn)} · YOU ${formatPercent(report.playerReturn)}`,
                    sub: `DEFENSE ${formatPercent(report.excessReturn)}`,
                };
            case 'MISSED_THE_DIP':
                return {
                    title: t('MISSED THE DIP'),
                    body: `BOTTOM → +${formatPercent(report.marketReturn).replace('+','')} · YOU STAYED IN CASH`,
                    sub: `MAX DD ${formatPercent(-report.maxDrawdown)}`,
                };
            case 'OVERTRADER':
                return {
                    title: t('OVERTRADER'),
                    body: `${report.tradeCount} TRADES · $${report.tradeCount * 1} FEES`,
                    sub: `EXCESS ${formatPercent(report.excessReturn)}`,
                };
            case 'DIAMOND_HANDS_LEVEL':
                return {
                    title: t('DIAMOND HANDS'),
                    body: `HELD ${report.longestHoldDays} DAYS`,
                    sub: `${report.tradeCount} TRADES`,
                };
            default:
                return { title: id, body: '', sub: '' };
        }
    }

    function renderVerdicts(payload) {
        const { card } = getSettlementElements();
        if (!card || !payload.verdicts || payload.verdicts.length === 0) return;

        const container = document.createElement('div');
        container.className = 'decision-verdicts';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');

        payload.verdicts.forEach((verdict) => {
            const verdictId = verdict.id || verdict;
            const copy = verdictCopy(verdictId, payload);
            const el = document.createElement('div');
            el.className = `decision-verdict decision-verdict--${verdictId.toLowerCase()}`;
            el.dataset.verdict = verdictId;

            const title = document.createElement('strong');
            title.className = 'decision-verdict-title';
            title.textContent = copy.title;

            const body = document.createElement('span');
            body.className = 'decision-verdict-body';
            body.textContent = copy.body;

            const sub = document.createElement('small');
            sub.className = 'decision-verdict-sub';
            sub.textContent = copy.sub;

            el.append(title, body, sub);
            container.appendChild(el);
        });

        // Insert before card-details
        const details = card.querySelector('.card-details');
        if (details) card.insertBefore(container, details);
        else card.appendChild(container);
    }

    function renderCounterfactualBar(payload) {
        const { card } = getSettlementElements();
        if (!card) return;
        const report = payload.report;
        const cf = payload.counterfactuals;
        if (!cf) return;

        const bar = document.createElement('div');
        bar.className = 'decision-counterfactuals';

        const items = [
            { label: 'YOU', value: report.playerReturn, kind: 'you' },
            { label: 'MARKET', value: report.marketReturn, kind: 'market' },
            { label: 'HOLD', value: cf.buyAndHold.return, kind: 'hold' },
        ];
        if (cf.firstEntryHold.applicable) {
            items.push({ label: 'FIRST BUY HOLD', value: cf.firstEntryHold.return, kind: 'first' });
        }

        items.forEach((item) => {
            const row = document.createElement('div');
            row.className = `decision-cf-row decision-cf-row--${item.kind}`;
            const label = document.createElement('span');
            label.className = 'decision-cf-label';
            label.textContent = item.label;
            const value = document.createElement('strong');
            value.className = 'decision-cf-value';
            value.textContent = formatPercent(item.value);
            if (item.value > 0) value.classList.add('positive');
            else if (item.value < 0) value.classList.add('negative');
            row.append(label, value);
            bar.appendChild(row);
        });

        const title = document.createElement('div');
        title.className = 'decision-cf-title';
        title.textContent = 'COUNTERFACTUALS — LABELED PARALLEL UNIVERSES';

        const wrapper = document.createElement('div');
        wrapper.className = 'decision-counterfactuals-wrap';
        wrapper.append(title, bar);

        const verdicts = card.querySelector('.decision-verdicts');
        if (verdicts) verdicts.after(wrapper);
        else card.appendChild(wrapper);
    }

    function ensureGhostButton() {
        const { actions } = getSettlementElements();
        if (!actions) return null;
        if (document.getElementById('ghost-replay-btn')) return document.getElementById('ghost-replay-btn');
        const btn = document.createElement('button');
        btn.id = 'ghost-replay-btn';
        btn.type = 'button';
        btn.textContent = 'GHOST REPLAY';
        btn.setAttribute('aria-label', 'Replay market ghost');
        btn.addEventListener('click', () => openGhostOverlay(lastPayload));
        actions.appendChild(btn);
        return btn;
    }

    function drawGhostFrame(ctx, width, height, payload, progress) {
        const colors = {
            bg: getComputedStyle(document.documentElement).getPropertyValue('--game-bg').trim() || '#06080c',
            surface: getComputedStyle(document.documentElement).getPropertyValue('--game-surface').trim() || '#0b1118',
            border: getComputedStyle(document.documentElement).getPropertyValue('--game-border').trim() || '#2a3946',
            borderStrong: getComputedStyle(document.documentElement).getPropertyValue('--game-border-strong').trim() || '#607180',
            text: getComputedStyle(document.documentElement).getPropertyValue('--game-text').trim() || '#f5f9fc',
            muted: getComputedStyle(document.documentElement).getPropertyValue('--game-muted').trim() || '#a7b4c2',
            accent: getComputedStyle(document.documentElement).getPropertyValue('--game-accent').trim() || '#ffd84d',
            system: getComputedStyle(document.documentElement).getPropertyValue('--game-system').trim() || '#73e6f2',
            green: getComputedStyle(document.documentElement).getPropertyValue('--game-green').trim() || '#66e38f',
            red: getComputedStyle(document.documentElement).getPropertyValue('--game-red').trim() || '#ff6d77',
        };

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        if (!payload || !payload.report) return;

        const report = payload.report;
        const closes = report.closes;
        const equity = report.equityCurve;
        const bh = payload.counterfactuals?.curves?.buyAndHoldEquity;
        const firstHold = payload.counterfactuals?.curves?.firstEntryHoldEquity;

        const paddingLeft = 48;
        const paddingRight = 16;
        const paddingTop = 48;
        const paddingBottom = 36;
        const plotLeft = paddingLeft;
        const plotRight = width - paddingRight;
        const plotTop = paddingTop;
        const plotBottom = height - paddingBottom;
        const plotWidth = Math.max(1, plotRight - plotLeft);
        const plotHeight = Math.max(1, plotBottom - plotTop);

        // Background grid
        ctx.save();
        ctx.strokeStyle = colors.border;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i += 1) {
            const y = plotTop + (plotHeight * i) / 4 + 0.5;
            ctx.beginPath(); ctx.moveTo(plotLeft, y); ctx.lineTo(plotRight, y); ctx.stroke();
        }
        for (let i = 1; i < 6; i += 1) {
            const x = plotLeft + (plotWidth * i) / 6 + 0.5;
            ctx.beginPath(); ctx.moveTo(x, plotTop); ctx.lineTo(x, plotBottom); ctx.stroke();
        }
        ctx.restore();

        // Border
        ctx.save();
        ctx.strokeStyle = colors.borderStrong;
        ctx.lineWidth = 2;
        ctx.strokeRect(plotLeft + 0.5, plotTop + 0.5, plotWidth, plotHeight);
        ctx.restore();

        // Compute price/equity ranges
        const visibleCount = Math.max(1, Math.floor(closes.length * Math.min(1, progress + 0.02)));
        let minPrice = Infinity; let maxPrice = -Infinity;
        for (let i = 0; i < visibleCount; i += 1) {
            if (closes[i] < minPrice) minPrice = closes[i];
            if (closes[i] > maxPrice) maxPrice = closes[i];
        }
        const pricePad = (maxPrice - minPrice) * 0.1 || 1;
        minPrice -= pricePad; maxPrice += pricePad;
        const priceRange = Math.max(0.0001, maxPrice - minPrice);
        const priceY = (v) => plotBottom - ((v - minPrice) / priceRange) * plotHeight;

        let minEquity = report.startCash; let maxEquity = report.startCash;
        for (let i = 0; i < visibleCount; i += 1) {
            const v = equity[i];
            if (Number.isFinite(v)) {
                if (v < minEquity) minEquity = v;
                if (v > maxEquity) maxEquity = v;
            }
            if (bh && Number.isFinite(bh[i])) {
                if (bh[i] < minEquity) minEquity = bh[i];
                if (bh[i] > maxEquity) maxEquity = bh[i];
            }
        }
        const eqPad = (maxEquity - minEquity) * 0.12 || Math.max(50, report.startCash * 0.01);
        minEquity -= eqPad; maxEquity += eqPad;
        const eqRange = Math.max(0.0001, maxEquity - minEquity);
        const eqY = (v) => plotBottom - ((v - minEquity) / eqRange) * plotHeight;

        const xForDay = (day) => plotLeft + (day / Math.max(1, closes.length - 1)) * plotWidth;

        // Draw MARKET (closes normalized to equity scale for comparison? Actually draw as price ghost dashed)
        // We'll draw market as dashed system line on price scale, and equity lines on equity scale — both share same plot for simplicity
        // Instead, draw market ghost as closes mapped via priceY blended into equity plot by normalizing to startCash
        // Simpler: draw three equity curves: YOU, BUY_AND_HOLD, FIRST_ENTRY_HOLD — all in equity space

        function drawEquityLine(data, color, width, dash) {
            if (!data) return;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineJoin = 'miter';
            ctx.lineCap = 'butt';
            if (dash) ctx.setLineDash(dash);
            ctx.beginPath();
            let started = false;
            for (let i = 0; i < visibleCount; i += 1) {
                const v = data[i];
                if (!Number.isFinite(v)) continue;
                const x = xForDay(i);
                const y = eqY(v);
                if (!started) { ctx.moveTo(x, y); started = true; }
                else { ctx.lineTo(x, y); }
            }
            ctx.stroke();
            ctx.restore();
        }

        drawEquityLine(bh, colors.system, 2, [6, 4]);
        if (firstHold) drawEquityLine(firstHold, colors.accent, 2, [3, 3]);
        drawEquityLine(equity, colors.text, 3, null);

        // Trade markers
        if (Array.isArray(report.actions)) {
            report.actions.forEach((act) => {
                if (act.day >= visibleCount) return;
                const x = xForDay(act.day);
                // Find y from equity at that day or price
                const y = eqY(equity[act.day] ?? report.startCash);
                ctx.save();
                const color = act.type === 'buy' ? colors.green : colors.red;
                ctx.fillStyle = color;
                ctx.strokeStyle = colors.bg;
                ctx.lineWidth = 2;
                const size = 7;
                if (act.type === 'buy') {
                    // Triangle up
                    ctx.beginPath();
                    ctx.moveTo(x, y - size);
                    ctx.lineTo(x - size, y + size);
                    ctx.lineTo(x + size, y + size);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                } else {
                    // Triangle down
                    ctx.beginPath();
                    ctx.moveTo(x, y + size);
                    ctx.lineTo(x - size, y - size);
                    ctx.lineTo(x + size, y - size);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
            });
        }

        // Labels
        ctx.save();
        ctx.font = '700 10px "Pixelify Sans", monospace';
        ctx.fillStyle = colors.muted;
        ctx.textAlign = 'left';
        ctx.fillText('EQUITY', plotLeft, plotTop - 12);
        ctx.textAlign = 'right';
        ctx.fillText(`DAY ${String(visibleCount).padStart(3,'0')} / 250`, plotRight, plotTop - 12);
        ctx.restore();

        // Legend
        ctx.save();
        ctx.font = '700 9px "Pixelify Sans", monospace';
        const legend = [
            { color: colors.text, label: 'YOU' },
            { color: colors.system, label: 'MARKET HOLD' },
        ];
        if (firstHold) legend.push({ color: colors.accent, label: 'FIRST BUY HOLD' });
        let lx = plotLeft;
        legend.forEach((item) => {
            ctx.fillStyle = item.color;
            ctx.fillRect(lx, plotBottom + 12, 10, 10);
            ctx.fillStyle = colors.text;
            ctx.fillText(item.label, lx + 14, plotBottom + 20);
            lx += ctx.measureText(item.label).width + 34;
        });
        ctx.restore();
    }

    function openGhostOverlay(payload) {
        if (!payload) return;
        // Respect reduced motion: show static full frame, no animation
        const existing = document.getElementById('ghost-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'ghost-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Ghost replay');

        const panel = document.createElement('div');
        panel.className = 'ghost-panel';

        const header = document.createElement('div');
        header.className = 'ghost-header';
        const title = document.createElement('strong');
        title.textContent = 'GHOST REPLAY';
        const subtitle = document.createElement('span');
        subtitle.textContent = `${payload.market?.toUpperCase() || ''} · ${payload.asset || ''} · ${payload.report.periodStart || ''} → ${payload.report.periodEnd || ''}`;
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'ghost-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', 'Close ghost replay');
        closeBtn.addEventListener('click', () => overlay.remove());

        header.append(title, subtitle, closeBtn);

        const canvas = document.createElement('canvas');
        canvas.className = 'ghost-canvas';
        const controls = document.createElement('div');
        controls.className = 'ghost-controls';
        const replayBtn = document.createElement('button');
        replayBtn.type = 'button';
        replayBtn.textContent = 'REPLAY';
        const closeBtn2 = document.createElement('button');
        closeBtn2.type = 'button';
        closeBtn2.textContent = 'CLOSE';
        closeBtn2.className = 'secondary-btn';
        controls.append(replayBtn, closeBtn2);
        closeBtn2.addEventListener('click', () => overlay.remove());

        panel.append(header, canvas, controls);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        const ctx = canvas.getContext('2d');
        function resize() {
            const rect = panel.getBoundingClientRect();
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            const w = Math.max(320, Math.min(820, rect.width - 32));
            const h = 380;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return { w, h };
        }

        let animationId = null;
        let startTime = null;

        function renderLoop(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = prefersReducedMotion ? 1 : Math.min(1, elapsed / GHOST_DURATION_MS);
            const { w, h } = resize();
            drawGhostFrame(ctx, w, h, payload, progress);
            if (progress < 1 && !prefersReducedMotion) {
                animationId = requestAnimationFrame(renderLoop);
            }
        }

        // Initial draw
        const { w, h } = resize();
        drawGhostFrame(ctx, w, h, payload, prefersReducedMotion ? 1 : 0);
        if (!prefersReducedMotion) {
            startTime = null;
            animationId = requestAnimationFrame(renderLoop);
        }

        replayBtn.addEventListener('click', () => {
            if (animationId) cancelAnimationFrame(animationId);
            startTime = null;
            animationId = requestAnimationFrame(renderLoop);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', esc);
            }
        });

        // Handle resize
        const ro = new ResizeObserver(() => {
            if (!overlay.isConnected) return;
            const { w: nw, h: nh } = resize();
            // redraw current frame static
            drawGhostFrame(ctx, nw, nh, payload, prefersReducedMotion ? 1 : 1);
        });
        try { ro.observe(panel); } catch (_) {}

        overlay._cleanup = () => {
            if (animationId) cancelAnimationFrame(animationId);
            try { ro.disconnect(); } catch (_) {}
        };
    }

    function handleDecisionReady(event) {
        const detail = event.detail || {};
        const report = detail.report;
        if (!report || report.version !== 1) return;
        lastPayload = detail;
        clearDecisionLayer();
        try { renderVerdicts(detail); } catch (e) { console.warn('ghost verdict render failed', e); }
        try { renderCounterfactualBar(detail); } catch (e) { console.warn('ghost counterfactual render failed', e); }
        try { ensureGhostButton(); } catch (e) { console.warn('ghost button inject failed', e); }
    }

    // Listen on both window and FlappyKEvents
    window.addEventListener('flappyk:decision-ready', handleDecisionReady);
    if (window.FlappyKEvents?.on) {
        try { window.FlappyKEvents.on('flappyk:decision-ready', handleDecisionReady); } catch (_) {}
    }

    // Clear on new level start / game reset
    function clearOnNewRun() { clearDecisionLayer(); lastPayload = null; }
    window.addEventListener('flappyk:level-will-start', clearOnNewRun);
    window.addEventListener('flappyk:game-reset', clearOnNewRun);
    if (window.FlappyKEvents?.on) {
        try { window.FlappyKEvents.on('flappyk:level-will-start', clearOnNewRun); } catch (_) {}
        try { window.FlappyKEvents.on('flappyk:game-reset', clearOnNewRun); } catch (_) {}
    }

    // Expose for testing
    if (typeof window !== 'undefined') {
        window.FlappyKGhostOverlay = {
            _handleDecisionReady: handleDecisionReady,
            _open: openGhostOverlay,
            _clear: clearDecisionLayer,
        };
    }
})();
