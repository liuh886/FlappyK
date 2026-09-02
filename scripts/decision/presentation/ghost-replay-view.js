/**
 * FlappyK Ghost Replay View — 5-8s equity ghost, YOU vs MARKET HOLD.
 * Owner: scripts/decision/presentation/ghost-replay-view.js
 * No decision logic; only draws payload.report + payload.counterfactuals.
 * Respects prefers-reduced-motion. Hard rects + palette tokens only.
 */
(function exposeGhostReplayView(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKGhostReplayView = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const GHOST_DURATION_MS = 6500;

    function prefersReducedMotion() {
        return typeof window !== 'undefined' && window.matchMedia
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false;
    }

    function cssToken(name, fallback) {
        if (typeof getComputedStyle === 'undefined') return fallback;
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    }

    function palette() {
        return {
            bg: cssToken('--game-bg', '#06080c'),
            surface: cssToken('--game-surface', '#0b1118'),
            border: cssToken('--game-border', '#2a3946'),
            borderStrong: cssToken('--game-border-strong', '#607180'),
            text: cssToken('--game-text', '#f5f9fc'),
            muted: cssToken('--game-muted', '#a7b4c2'),
            accent: cssToken('--game-accent', '#ffd84d'),
            system: cssToken('--game-system', '#73e6f2'),
            green: cssToken('--game-green', '#66e38f'),
            red: cssToken('--game-red', '#ff6d77'),
        };
    }

    function formatPercent(value) {
        if (!Number.isFinite(Number(value))) return '---%';
        const num = Number(value) * 100;
        return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
    }

    function drawFrame(ctx, width, height, payload, progress) {
        const colors = palette();
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);
        if (!payload?.report) return;

        const report = payload.report;
        const closes = report.closes;
        const equity = report.equityCurve;
        const bh = payload.counterfactuals?.curves?.buyAndHoldEquity;
        const firstHold = payload.counterfactuals?.curves?.firstEntryHoldEquity;

        const padL = 48, padR = 16, padT = 48, padB = 48;
        const left = padL, right = width - padR, top = padT, bottom = height - padB;
        const W = Math.max(1, right - left), H = Math.max(1, bottom - top);

        // Grid
        ctx.save();
        ctx.strokeStyle = colors.border;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { const y = top + (H * i) / 4 + 0.5; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); }
        for (let i = 1; i < 6; i++) { const x = left + (W * i) / 6 + 0.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); }
        ctx.restore();

        // Border + day progress bar (thin white-bordered strip like HUD)
        ctx.save();
        ctx.strokeStyle = colors.borderStrong;
        ctx.lineWidth = 2;
        ctx.strokeRect(left + 0.5, top + 0.5, W, H);
        // progress strip at very top of plot
        const progW = Math.floor(W * Math.min(1, progress));
        ctx.fillStyle = '#fff';
        ctx.fillRect(left, top - 6, W, 4);
        ctx.fillStyle = colors.accent;
        ctx.fillRect(left, top - 6, progW, 4);
        ctx.restore();

        const visible = Math.max(1, Math.floor(closes.length * Math.min(1, progress + 0.02)));
        // Equity range across visible
        let minEq = report.startCash, maxEq = report.startCash;
        for (let i = 0; i < visible; i++) {
            const v = equity[i];
            if (Number.isFinite(v)) { if (v < minEq) minEq = v; if (v > maxEq) maxEq = v; }
            if (bh && Number.isFinite(bh[i])) { if (bh[i] < minEq) minEq = bh[i]; if (bh[i] > maxEq) maxEq = bh[i]; }
            if (firstHold && Number.isFinite(firstHold[i])) { if (firstHold[i] < minEq) minEq = firstHold[i]; if (firstHold[i] > maxEq) maxEq = firstHold[i]; }
        }
        const pad = (maxEq - minEq) * 0.12 || Math.max(50, report.startCash * 0.01);
        minEq -= pad; maxEq += pad;
        const range = Math.max(0.0001, maxEq - minEq);
        const eqY = (v) => bottom - ((v - minEq) / range) * H;
        const xForDay = (d) => left + (d / Math.max(1, closes.length - 1)) * W;

        function line(data, color, width, dash, alpha = 1) {
            if (!data) return;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.globalAlpha = alpha;
            if (dash) ctx.setLineDash(dash);
            ctx.beginPath();
            let started = false;
            for (let i = 0; i < visible; i++) {
                const v = data[i];
                if (!Number.isFinite(v)) continue;
                const x = xForDay(i), y = eqY(v);
                if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Ghosts: MARKET HOLD dashed system, FIRST HOLD dotted accent, YOU solid text
        line(bh, colors.system, 2, [6, 4], 0.95);
        if (firstHold) line(firstHold, colors.accent, 2, [3, 3], 0.9);
        line(equity, colors.text, 3, null, 1);

        // Trade markers — hard-edged triangles, snap to pixel
        if (Array.isArray(report.actions)) {
            report.actions.forEach((act) => {
                if (act.day >= visible) return;
                const x = Math.round(xForDay(act.day));
                const y = Math.round(eqY(equity[act.day] ?? report.startCash));
                ctx.save();
                ctx.fillStyle = act.type === 'buy' ? colors.green : colors.red;
                ctx.strokeStyle = colors.bg;
                ctx.lineWidth = 2;
                const s = 7;
                ctx.beginPath();
                if (act.type === 'buy') {
                    ctx.moveTo(x, y - s); ctx.lineTo(x - s, y + s); ctx.lineTo(x + s, y + s);
                } else {
                    ctx.moveTo(x, y + s); ctx.lineTo(x - s, y - s); ctx.lineTo(x + s, y - s);
                }
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            });
        }

        // Current day cursor — vertical hard line + pixel dot on YOU
        if (visible > 0) {
            const cx = Math.round(xForDay(visible - 1));
            const cy = Math.round(eqY(equity[visible - 1] ?? report.startCash));
            ctx.save();
            ctx.strokeStyle = colors.muted;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath(); ctx.moveTo(cx + 0.5, top); ctx.lineTo(cx + 0.5, bottom); ctx.stroke();
            ctx.restore();
            ctx.save();
            ctx.fillStyle = colors.text;
            ctx.fillRect(cx - 3, cy - 3, 6, 6);
            ctx.strokeStyle = colors.bg;
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - 3, cy - 3, 6, 6);
            ctx.restore();
        }

        // Top labels
        ctx.save();
        ctx.font = '700 10px "Pixelify Sans", monospace';
        ctx.fillStyle = colors.muted;
        ctx.textAlign = 'left';
        ctx.fillText('EQUITY GHOST', left, top - 14);
        ctx.textAlign = 'right';
        ctx.fillText(`DAY ${String(visible).padStart(3, '0')} / 250`, right, top - 14);
        ctx.restore();

        // Bottom legend + final compare when complete
        ctx.save();
        ctx.font = '700 9px "Pixelify Sans", monospace';
        const legend = [
            { c: colors.text, l: 'YOU' },
            { c: colors.system, l: 'HOLD' },
        ];
        if (firstHold) legend.push({ c: colors.accent, l: 'FIRST BUY' });
        let lx = left;
        legend.forEach((item) => {
            ctx.fillStyle = item.c; ctx.fillRect(lx, bottom + 12, 10, 10);
            ctx.fillStyle = colors.text; ctx.fillText(item.l, lx + 14, bottom + 20);
            lx += ctx.measureText(item.l).width + 34;
        });
        ctx.restore();

        if (progress >= 1) {
            // Final compare — large fact numbers, no advice
            const youP = formatPercent(report.playerReturn);
            const holdP = formatPercent(payload.counterfactuals?.buyAndHold?.return ?? report.marketReturn);
            const gap = (payload.counterfactuals?.buyAndHold?.return ?? 0) - report.playerReturn;
            const gapText = gap > 0 ? `HOLD +${(gap * 100).toFixed(1)}% ahead` : gap < 0 ? `YOU +${(-gap * 100).toFixed(1)}% ahead` : 'EVEN';
            const centerX = Math.round(width / 2);
            const lineY = bottom + 38;
            ctx.save();
            ctx.textAlign = 'center';
            // Hard shadow + foreground for YOU/HOLD line
            ctx.font = '700 11px "Press Start 2P", monospace';
            ctx.fillStyle = '#000';
            ctx.fillText(`YOU ${youP}  ·  HOLD ${holdP}`, centerX + 2, lineY + 2);
            ctx.fillStyle = colors.text;
            ctx.fillText(`YOU ${youP}  ·  HOLD ${holdP}`, centerX, lineY);
            // Gap line with its own shadow
            ctx.font = '700 9px "Pixelify Sans", monospace';
            ctx.fillStyle = '#000';
            ctx.fillText(gapText, centerX + 1, bottom + 54 + 1);
            ctx.fillStyle = colors.muted;
            ctx.fillText(gapText, centerX, bottom + 54);
            ctx.restore();
        }
    }

    function open(payload, options = {}) {
        if (!payload?.report) return null;
        const existing = typeof document !== 'undefined' ? document.getElementById('ghost-overlay') : null;
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
        const sub = document.createElement('span');
        sub.textContent = `${(payload.market || '').toUpperCase()} · ${payload.asset || ''} · ${payload.report.periodStart || ''} → ${payload.report.periodEnd || ''}`;
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'ghost-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', 'Close ghost replay');
        closeBtn.addEventListener('click', () => cleanup());
        header.append(title, sub, closeBtn);

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
        closeBtn2.addEventListener('click', () => cleanup());

        panel.append(header, canvas, controls);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        const ctx = canvas.getContext('2d');
        let raf = null, start = null, ro = null;

        function size() {
            const rect = panel.getBoundingClientRect();
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            const w = Math.max(320, Math.min(860, rect.width - 32));
            // Responsive height: fit inside viewport, especially 360px landscape (≈320px usable)
            const viewportH = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800;
            let headerH = 48, controlsH = 52;
            try {
                headerH = header.getBoundingClientRect().height || 48;
                controlsH = controls.getBoundingClientRect().height || 52;
            } catch {}
            const chrome = 32; // overlay padding + panel borders
            const availableH = viewportH - headerH - controlsH - chrome - 16;
            const h = Math.max(220, Math.min(400, Math.floor(availableH), Math.floor(viewportH * 0.58)));
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return { w, h };
        }

        function frame(ts) {
            if (start === null) start = ts;
            const elapsed = ts - start;
            const p = prefersReducedMotion() ? 1 : Math.min(1, elapsed / GHOST_DURATION_MS);
            const { w, h } = size();
            drawFrame(ctx, w, h, payload, p);
            if (p < 1 && !prefersReducedMotion()) raf = requestAnimationFrame(frame);
        }

        function cleanup() {
            if (raf) cancelAnimationFrame(raf);
            try { ro?.disconnect(); } catch {}
            overlay.remove();
            document.removeEventListener('keydown', onKey);
        }
        function onKey(e) { if (e.key === 'Escape') cleanup(); }

        // initial
        const { w, h } = size();
        drawFrame(ctx, w, h, payload, prefersReducedMotion() ? 1 : 0);
        if (!prefersReducedMotion()) raf = requestAnimationFrame(frame);

        replayBtn.addEventListener('click', () => {
            if (raf) cancelAnimationFrame(raf);
            start = null;
            raf = requestAnimationFrame(frame);
        });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });
        document.addEventListener('keydown', onKey);

        try {
            ro = new ResizeObserver(() => {
                if (!overlay.isConnected) return;
                const { w: nw, h: nh } = size();
                drawFrame(ctx, nw, nh, payload, prefersReducedMotion() ? 1 : 1);
            });
            ro.observe(panel);
        } catch {}

        overlay._cleanup = cleanup;
        return overlay;
    }

    return { open, drawFrame, GHOST_DURATION_MS };
});
