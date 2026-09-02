/**
 * FlappyK Ghost Overlay — thin orchestrator.
 * Owner: scripts/decision/ghost-overlay.js
 * Delegates to presentation/* : verdict-view, counterfactual-view, ghost-replay-view.
 * Keeps GHOST REPLAY button + prefers-reduced-motion contract (via presentation).
 */
(function installGhostOverlay() {
    'use strict';

    // GHOST REPLAY — prefers-reduced-motion is handled in presentation/ghost-replay-view.js
    let lastPayload = null;

    function getSettlementElements() {
        const card = document.getElementById('profit-card');
        const actions = document.querySelector('.settlement-actions');
        return { card, actions };
    }

    function clearDecisionLayer() {
        // Delegate to presentation clears but also ensure button/overlay removed
        try { window.FlappyKVerdictView?.clear?.(); } catch {}
        try { window.FlappyKCounterfactualView?.clear?.(); } catch {}
        if (typeof document !== 'undefined') {
            document.querySelectorAll('#ghost-replay-btn, #ghost-overlay, .decision-summary').forEach((el) => el.remove());
            // legacy selectors
            document.querySelectorAll('.decision-verdicts, .decision-counterfactuals-wrap').forEach((el) => el.remove());
        }
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
        btn.addEventListener('click', () => {
            try { window.FlappyKGhostReplayView?.open?.(lastPayload); } catch (e) { console.warn('ghost open failed', e); }
        });
        actions.appendChild(btn);
        return btn;
    }

    function handleDecisionReady(event) {
        const detail = event.detail || {};
        const report = detail.report;
        if (!report || report.version !== 1) return;
        lastPayload = detail;
        clearDecisionLayer();
        try { window.FlappyKVerdictView?.render?.(detail); } catch (e) { console.warn('verdict render failed', e); }
        try {
            // P1: compact Decision Summary ≤3 lines (YOU/HOLD + BIGGEST MOMENT)
            if (window.FlappyKCounterfactualView?.renderSummary) window.FlappyKCounterfactualView.renderSummary(detail);
            else window.FlappyKCounterfactualView?.render?.(detail);
        } catch (e) { console.warn('counterfactual render failed', e); }
        try { ensureGhostButton(); } catch (e) { console.warn('ghost button inject failed', e); }
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('flappyk:decision-ready', handleDecisionReady);
        if (window.FlappyKEvents?.on) {
            try { window.FlappyKEvents.on('flappyk:decision-ready', handleDecisionReady); } catch {}
        }
        const clearOnNewRun = () => { clearDecisionLayer(); lastPayload = null; };
        window.addEventListener('flappyk:level-will-start', clearOnNewRun);
        window.addEventListener('flappyk:game-reset', clearOnNewRun);
        if (window.FlappyKEvents?.on) {
            try { window.FlappyKEvents.on('flappyk:level-will-start', clearOnNewRun); } catch {}
            try { window.FlappyKEvents.on('flappyk:game-reset', clearOnNewRun); } catch {}
        }
        window.FlappyKGhostOverlay = {
            _handleDecisionReady: handleDecisionReady,
            _clear: clearDecisionLayer,
            _getPayload: () => lastPayload,
            // Keep contract string for static checks
            _contract: 'GHOST REPLAY prefers-reduced-motion',
        };
    }
})();
