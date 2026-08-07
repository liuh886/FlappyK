from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HOME_START = "/* Home: one full-viewport scene with a clear primary action hierarchy. */"
STRUCTURAL_START = "/* Structural rules previously injected from JavaScript. Visual HUD language stays in style.css. */"
MOBILE_START = "@media (max-width: 720px), (pointer: coarse) {"
REDUCED_START = "@media (prefers-reduced-motion: reduce) {"

NEW_HOME = r'''/* Home: console-first menu hierarchy inspired by modern family-friendly game UIs. */
html[data-ui-state='home'] body {
    align-items: stretch;
    justify-content: stretch;
}

html[data-ui-state='home'] #game-container.arcade-weather-ready {
    width: 100vw;
    max-width: none;
    height: 100dvh;
    min-height: 100vh;
    border: 0;
    border-radius: 0;
    background: #071b35;
    box-shadow: none;
}

html[data-ui-state='home'] #game-container::after { opacity: 0; }

#start-screen.arcade-home {
    inset: 0;
    align-items: stretch;
    padding: 0;
    overflow: hidden;
    background: transparent;
}

:root {
    --menu-radius-sm: 10px;
    --menu-radius: 14px;
    --menu-radius-lg: 18px;
    --menu-panel: rgba(7, 24, 50, 0.9);
    --menu-panel-soft: rgba(8, 30, 58, 0.78);
    --menu-line: rgba(206, 231, 255, 0.68);
    --menu-shadow: 0 6px 0 rgba(2, 11, 25, 0.72);
    --menu-shadow-small: 0 4px 0 rgba(2, 11, 25, 0.68);
}

.home-console-bezel {
    position: relative;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: transparent;
}

.home-console-topline {
    position: relative;
    z-index: 12;
    display: flex;
    min-height: 64px;
    min-width: 0;
    align-items: center;
    gap: var(--space-3);
    padding:
        max(14px, env(safe-area-inset-top))
        clamp(20px, 3.2vw, 48px)
        10px;
    border-bottom: 1px solid rgba(143, 196, 236, 0.18);
    background: linear-gradient(180deg, rgba(3, 16, 34, 0.96), rgba(3, 16, 34, 0.78));
    color: var(--pixel-muted);
}

.home-console-brand {
    min-width: 0;
    overflow: hidden;
    color: #f4f9ff;
    font-family: var(--pixel-font-display);
    font-size: 9px;
    line-height: 1;
    letter-spacing: 0.055em;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.home-console-lamps {
    display: flex;
    flex: 0 0 auto;
    gap: 7px;
}

.home-console-lamps span {
    width: 7px;
    height: 7px;
    border: 1px solid rgba(1, 10, 20, 0.78);
    border-radius: 2px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.home-console-lamps span:first-child { background: var(--pixel-green); }
.home-console-lamps span:nth-child(2) { background: var(--pixel-yellow); }
.home-console-lamps span:last-child { background: var(--pixel-cyan); }

.home-console-topline > .home-utility-bar[data-arcade-placement='console'] {
    position: static !important;
    inset: auto !important;
    z-index: auto;
    display: flex;
    flex: 0 0 auto;
    gap: 6px !important;
    max-width: none !important;
    margin-left: auto;
    padding: 5px !important;
    overflow: visible !important;
    border: 1px solid rgba(130, 176, 214, 0.45) !important;
    border-radius: var(--menu-radius) !important;
    background: rgba(5, 20, 42, 0.88) !important;
    box-shadow: 0 3px 0 rgba(1, 8, 18, 0.62) !important;
    clip-path: none !important;
    backdrop-filter: none !important;
}

.home-utility-bar #language-toggle-btn,
.home-utility-bar .membership-launcher {
    min-height: 36px !important;
    height: 36px !important;
    margin: 0 !important;
    padding-inline: 11px !important;
    border: 1px solid rgba(137, 180, 216, 0.52) !important;
    border-radius: var(--menu-radius-sm) !important;
    background: #0b2748 !important;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
    color: #edf7ff !important;
}

.home-utility-bar #language-toggle-btn:hover,
.home-utility-bar .membership-launcher:hover {
    border-color: #9ad8ff !important;
    background: #12365d !important;
    transform: translateY(-1px);
}

.membership-launcher-tier { border-radius: 6px !important; }

.home-console-screen {
    position: relative;
    display: flex;
    min-height: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: clamp(16px, 2.5vh, 28px) clamp(18px, 5vw, 72px) clamp(12px, 2vh, 22px);
    overflow: hidden;
    background:
        radial-gradient(circle at 50% 9%, rgba(115, 214, 255, 0.24), transparent 33%),
        linear-gradient(180deg, rgba(5, 45, 83, 0.06), rgba(5, 24, 48, 0.58)),
        linear-gradient(180deg, #2582c3 0%, #17639b 46%, #0d3559 100%);
}

.home-console-screen::before,
.home-console-screen::after {
    position: absolute;
    content: '';
    pointer-events: none;
}

.home-console-screen::before {
    inset: auto 0 0;
    height: 45%;
    background:
        linear-gradient(135deg, transparent 27%, rgba(20, 79, 111, 0.58) 27% 49%, transparent 49%) 0 0 / 250px 100%,
        linear-gradient(45deg, transparent 31%, rgba(9, 43, 72, 0.82) 31% 59%, transparent 59%) 96px 0 / 330px 100%;
    opacity: 0.76;
}

.home-console-screen::after {
    inset: 0;
    background:
        linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px) 0 0 / 4px 4px,
        radial-gradient(circle at 12% 30%, rgba(94, 224, 250, 0.08), transparent 18%),
        radial-gradient(circle at 87% 45%, rgba(70, 224, 138, 0.09), transparent 20%);
    opacity: 0.7;
}

.home-console-screen > * {
    position: relative;
    z-index: 1;
}

.home-console-kicker {
    margin-bottom: 10px;
    padding: 6px 11px 5px;
    border: 1px solid rgba(188, 226, 255, 0.58);
    border-radius: 8px;
    background: rgba(5, 30, 55, 0.72);
    box-shadow: 0 2px 0 rgba(2, 13, 27, 0.55);
    color: #dff4ff;
    font-family: var(--pixel-font-display);
    font-size: 8px;
    line-height: 1.2;
    letter-spacing: 0.07em;
}

#start-screen.arcade-home #game-title {
    margin: 0 0 12px;
    color: #fff1a8;
    font-size: clamp(48px, 6vw, 72px);
    line-height: 1.1;
    letter-spacing: 0.025em;
    text-shadow:
        0 4px 0 #9a7021,
        4px 7px 0 rgba(4, 26, 48, 0.72);
}

.home-console-screen > p,
#start-screen.arcade-home > .home-console-bezel p {
    max-width: 650px;
    margin: 0 0 2px;
    color: #f3f9ff;
    font-family: var(--pixel-font-ui);
    font-size: clamp(15px, 1.45vw, 18px);
    font-weight: 500;
    line-height: 1.26;
    text-align: center;
    text-shadow: 1px 1px 0 rgba(3, 14, 28, 0.62);
}

.home-primary-actions {
    width: min(540px, 92%);
    margin-top: clamp(15px, 2vh, 20px);
}

.home-primary-actions #start-btn,
.daily-mode-card,
.local-records-summary,
.home-secondary-actions button,
#pwa-install-btn {
    clip-path: none;
}

.home-primary-actions #start-btn {
    width: 100%;
    min-height: 78px;
    margin: 0;
    padding: 13px 24px;
    border: 3px solid #dffff0;
    border-radius: var(--menu-radius-lg) !important;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.2), transparent 32%),
        linear-gradient(180deg, #55e88f, #27bf69);
    box-shadow:
        0 7px 0 #08733d,
        0 12px 24px rgba(2, 16, 31, 0.28),
        inset 0 -2px 0 rgba(4, 94, 48, 0.35);
    color: #052a17;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.055em;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.38);
    transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
}

.home-primary-actions #start-btn:hover {
    filter: brightness(1.06) saturate(1.04);
    transform: translateY(-2px);
    box-shadow:
        0 9px 0 #08733d,
        0 15px 28px rgba(2, 16, 31, 0.3),
        inset 0 -2px 0 rgba(4, 94, 48, 0.35);
}

.home-primary-actions #start-btn:active {
    transform: translateY(5px);
    box-shadow:
        0 2px 0 #08733d,
        0 7px 14px rgba(2, 16, 31, 0.26);
}

.home-play-icon {
    display: inline-grid;
    width: 34px;
    height: 34px;
    margin-right: 12px;
    place-items: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.78);
    color: #179a50;
    font-size: 16px;
    text-shadow: none;
    vertical-align: middle;
}

.local-records-summary {
    display: flex;
    width: min(500px, 88%);
    min-height: 42px;
    margin: 15px 0 0;
    padding: 8px 18px;
    align-items: center;
    justify-content: center;
    gap: 28px;
    border: 1px solid rgba(170, 211, 244, 0.44);
    border-radius: 13px !important;
    background: rgba(4, 24, 48, 0.76);
    box-shadow: 0 3px 0 rgba(2, 12, 26, 0.58);
    color: #c9dcf0;
    font-size: 13px;
}

.local-records-summary strong { color: var(--pixel-yellow); }

.home-mode-stack {
    display: grid;
    width: min(760px, 94%);
    gap: 10px;
    margin-top: 10px;
    justify-items: center;
}

.daily-mode-card {
    display: grid;
    grid-template-areas:
        'copy action'
        'summary action';
    grid-template-columns: minmax(0, 1fr) minmax(190px, 0.38fr);
    width: 100%;
    min-height: 102px;
    gap: 7px 22px;
    padding: 16px 18px;
    align-items: center;
    border: 2px solid rgba(194, 177, 255, 0.72);
    border-radius: var(--menu-radius-lg) !important;
    background:
        linear-gradient(180deg, rgba(139, 107, 236, 0.11), transparent 42%),
        rgba(9, 24, 54, 0.9);
    box-shadow:
        0 5px 0 #2f255b,
        0 10px 22px rgba(2, 12, 26, 0.24);
}

.daily-mode-copy {
    grid-area: copy;
    display: grid;
    gap: 5px;
    min-width: 0;
    text-align: left;
}

.daily-mode-copy strong {
    color: #c9b9ff;
    font-family: var(--pixel-font-display);
    font-size: 10px;
    line-height: 1.3;
}

.daily-mode-copy strong::before {
    margin-right: 8px;
    color: var(--pixel-purple);
    content: '◆';
}

.daily-mode-copy span {
    color: var(--pixel-text);
    font-size: 16px;
    line-height: 1.18;
}

.daily-mode-card .daily-run-summary {
    grid-area: summary;
    justify-self: start;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    color: #a89bd8;
    font-size: 10px;
    opacity: 0.9;
}

.daily-mode-card .daily-run-summary > strong,
.daily-mode-card .daily-run-summary > span { display: none; }

.daily-mode-card #daily-run-btn {
    grid-area: action;
    min-width: 190px;
    min-height: 58px;
    margin: 0;
    padding: 10px 18px;
    border: 2px solid #ded4ff;
    border-radius: 15px !important;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.18), transparent 34%),
        linear-gradient(180deg, #8f70eb, #6648c4);
    box-shadow: 0 5px 0 #3a2878;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
}

.daily-mode-card #daily-run-btn::after {
    margin-left: 10px;
    content: '›';
    font-size: 1.45em;
    line-height: 0;
}

.daily-mode-card #daily-run-btn:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
    box-shadow: 0 6px 0 #3a2878;
}

.daily-mode-card #daily-run-btn:active {
    transform: translateY(4px);
    box-shadow: 0 1px 0 #3a2878;
}

.home-secondary-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
}

.home-secondary-actions button,
#pwa-install-btn {
    min-height: 46px;
    margin-top: 0;
    padding: 9px 16px;
    border: 1px solid rgba(144, 192, 229, 0.6);
    border-radius: var(--menu-radius) !important;
    background: #08284a;
    box-shadow: 0 4px 0 rgba(2, 14, 31, 0.68);
    color: #e6f5ff;
    font-size: 13px;
    font-weight: 600;
    transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease;
}

#leaderboard-open-btn::before {
    margin-right: 8px;
    color: var(--pixel-yellow);
    content: '★';
}

#leaderboard-open-btn::after {
    margin-left: 9px;
    content: '›';
    font-size: 1.3em;
}

.home-secondary-actions button:hover,
#pwa-install-btn:hover {
    border-color: #8fd8ff;
    background: #0d365f;
    color: #fff;
    transform: translateY(-1px);
}

.home-secondary-actions button:active,
#pwa-install-btn:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 rgba(2, 14, 31, 0.68);
}

#start-screen.arcade-home .start-data-ticker {
    max-width: min(540px, 88%);
    margin-top: 8px;
    opacity: 0.42;
}

.home-console-footer {
    position: relative;
    z-index: 12;
    display: flex;
    min-height: 72px;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding:
        8px
        clamp(18px, 3.5vw, 44px)
        max(10px, env(safe-area-inset-bottom));
    border-top: 1px solid rgba(139, 190, 229, 0.2);
    background: rgba(3, 15, 31, 0.92);
    color: #8294a7;
}

.home-console-speaker,
.home-console-legend {
    position: relative;
    display: grid;
    width: min(220px, 35vw);
    min-height: 46px;
    place-items: center;
    border: 1px solid rgba(150, 196, 228, 0.58);
    background: #071f3a;
    box-shadow: 0 4px 0 rgba(1, 9, 20, 0.7);
    font-family: var(--pixel-font-ui);
    font-size: 0;
    font-weight: 700;
    letter-spacing: 0.04em;
}

.home-console-speaker {
    border-radius: 16px 0 0 16px;
    background: linear-gradient(180deg, #3fd37d, #1aa95b);
    color: #062b18;
}

.home-console-legend {
    border-left: 0;
    border-radius: 0 16px 16px 0;
    background: linear-gradient(180deg, #ff7d69, #d84c3c);
    color: #fff;
}

.home-console-speaker span { display: none; }

.home-console-speaker::before,
.home-console-legend::before {
    font-size: 15px;
    text-shadow: 0 1px 0 rgba(255,255,255,0.22);
}

.home-console-speaker::before { content: '↑  BUY $1K'; }
.home-console-legend::before { content: '↓  SELL $1K'; }
'''

NEW_RESPONSIVE = r'''@media (max-width: 720px), (pointer: coarse) {
    body::before { opacity: 0.12; }

    #game-hud-rail {
        top: max(6px, env(safe-area-inset-top));
        right: max(6px, env(safe-area-inset-right));
        left: max(6px, env(safe-area-inset-left));
        grid-template-areas:
            'performance controls'
            'weather progress';
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-rows: auto auto;
    }

    #game-hud-rail .stats-box[data-composition='returns-only'] { grid-area: performance; }
    #game-hud-rail #game-top-controls { grid-area: controls; }
    #game-hud-rail .weather-status { grid-area: weather; }
    #game-hud-rail .run-progress-panel { grid-area: progress; }

    html[data-ui-state='home'] #game-container.arcade-weather-ready {
        height: 100dvh;
        min-height: 0;
    }

    .home-console-topline {
        min-height: 54px;
        gap: 6px;
        padding:
            max(8px, env(safe-area-inset-top))
            max(9px, env(safe-area-inset-right))
            6px
            max(9px, env(safe-area-inset-left));
    }

    .home-console-brand {
        max-width: 136px;
        font-size: 7px;
    }

    .home-console-lamps { display: none; }

    .home-console-topline > .home-utility-bar[data-arcade-placement='console'] {
        padding: 3px !important;
        border-radius: 12px !important;
    }

    .home-utility-bar #language-toggle-btn,
    .home-utility-bar .membership-launcher {
        min-height: 40px !important;
        height: 40px !important;
        padding-inline: 8px !important;
        border-radius: 9px !important;
    }

    .home-console-screen {
        padding: 10px 12px 8px;
        justify-content: center;
    }

    .home-console-kicker {
        margin-bottom: 7px;
        padding: 4px 7px;
        font-size: 7px;
    }

    #start-screen.arcade-home #game-title {
        margin-bottom: 8px;
        font-size: clamp(31px, 10.8vw, 43px);
        text-shadow: 0 3px 0 #9a7021, 3px 5px 0 rgba(4, 26, 48, 0.72);
    }

    .home-console-screen > p,
    #start-screen.arcade-home > .home-console-bezel p {
        font-size: 12px;
        line-height: 1.2;
    }

    .home-primary-actions {
        width: min(330px, 94%);
        margin-top: 11px;
    }

    .home-primary-actions #start-btn {
        min-height: 54px;
        padding: 9px 14px;
        border-width: 2px;
        border-radius: 15px !important;
        box-shadow: 0 5px 0 #08733d;
        font-size: 18px;
    }

    .home-play-icon {
        width: 26px;
        height: 26px;
        margin-right: 8px;
        font-size: 12px;
    }

    .local-records-summary,
    .home-mode-stack {
        width: min(430px, 94%);
    }

    .local-records-summary {
        min-height: 34px;
        margin-top: 8px;
        padding: 5px 10px;
        gap: 16px;
        border-radius: 10px !important;
        font-size: 11px;
    }

    .home-mode-stack {
        gap: 6px;
        margin-top: 6px;
    }

    .daily-mode-card {
        grid-template-areas:
            'copy action'
            'summary action';
        grid-template-columns: minmax(0, 1fr) 126px;
        min-height: 78px;
        gap: 4px 8px;
        padding: 9px 10px;
        border-radius: 14px !important;
        box-shadow: 0 4px 0 #2f255b;
    }

    .daily-mode-copy { gap: 3px; }
    .daily-mode-copy strong { font-size: 7px; }
    .daily-mode-copy span { font-size: 12px; line-height: 1.12; }
    .daily-mode-card .daily-run-summary { font-size: 8px; }

    .daily-mode-card #daily-run-btn {
        min-width: 126px;
        min-height: 48px;
        padding: 7px 8px;
        border-radius: 12px !important;
        box-shadow: 0 4px 0 #3a2878;
        font-size: 12px;
    }

    .home-secondary-actions button,
    #pwa-install-btn {
        min-height: 42px;
        padding: 7px 11px;
        border-radius: 12px !important;
        font-size: 12px;
    }

    #start-screen.arcade-home .start-data-ticker { margin-top: 6px; }

    .home-console-footer {
        min-height: 58px;
        padding:
            6px
            max(10px, env(safe-area-inset-right))
            max(8px, env(safe-area-inset-bottom))
            max(10px, env(safe-area-inset-left));
    }

    .home-console-speaker,
    .home-console-legend {
        width: min(160px, 43vw);
        min-height: 40px;
    }

    .home-console-speaker::before,
    .home-console-legend::before { font-size: 12px; }

    #mobile-controls .mobile-trade-primary { font-size: 14px; }
    .mobile-speed-control .speed-readout { font-size: 14px; }

    .game-coachmark {
        bottom: calc(98px + env(safe-area-inset-bottom));
        padding: 10px;
    }

    .game-coachmark-copy strong { font-size: 7px; }
    .game-coachmark-copy span { font-size: 14px; }
    #settlement-screen .profit-card { padding: 16px; }
    .settlement-excess-summary { font-size: 36px; }
    .settlement-comparison-row {
        grid-template-columns: 54px minmax(0, 1fr) 74px;
        font-size: 11px;
    }
}

@media (max-width: 390px) {
    .home-console-brand { max-width: 92px; }

    .home-utility-bar #language-toggle-btn {
        min-width: 42px !important;
        padding-inline: 6px !important;
    }

    .home-utility-bar .membership-launcher {
        max-width: 92px;
        padding-inline: 7px !important;
    }
}

@media (max-width: 430px) and (max-height: 700px),
       (orientation: landscape) and (max-height: 500px) {
    .home-console-topline {
        min-height: 46px;
        padding-top: max(5px, env(safe-area-inset-top));
    }

    .home-console-screen { padding: 6px 10px; }

    .home-console-kicker,
    .home-console-footer,
    #start-screen.arcade-home .start-data-ticker { display: none; }

    #start-screen.arcade-home #game-title {
        margin-bottom: 4px;
        font-size: clamp(25px, 8.5vw, 32px);
    }

    .home-console-screen > p,
    #start-screen.arcade-home > .home-console-bezel p {
        font-size: 10px;
        line-height: 1.15;
    }

    .home-primary-actions { margin-top: 7px; }

    .home-primary-actions #start-btn {
        min-height: 48px;
        font-size: 16px;
    }

    .local-records-summary {
        margin-top: 4px;
        padding-block: 4px;
    }

    .home-mode-stack { margin-top: 4px; }

    .daily-mode-card {
        min-height: 68px;
        padding: 6px 8px;
    }

    .daily-mode-card #daily-run-btn {
        min-height: 44px;
    }
}
'''

css_path = ROOT / 'premium-ui-refinement.css'
css = css_path.read_text()
start = css.index(HOME_START)
structural = css.index(STRUCTURAL_START)
css = css[:start] + NEW_HOME + '\n\n' + css[structural:]
mobile = css.index(MOBILE_START)
reduced = css.index(REDUCED_START)
css = css[:mobile] + NEW_RESPONSIVE + '\n\n' + css[reduced:]
css_path.write_text(css)

story_path = ROOT / 'home-story.css'
story = story_path.read_text()
arrow_start = story.index('#start-screen .home-story-arrow {')
arrow_end = story.index('\n}\n\n#start-screen .home-story-arrow:hover', arrow_start) + 2
arrow = story[arrow_start:arrow_end]
arrow = arrow.replace('border-radius: 0;', 'border-radius: 14px;')
arrow = arrow.replace('background: rgba(12, 19, 31, 0.94);', 'background: linear-gradient(180deg, #123a68, #082846);')
arrow = arrow.replace('box-shadow: 4px 4px 0 var(--pixel-shadow);', 'box-shadow: 0 4px 0 rgba(2, 12, 26, 0.72);')
story = story[:arrow_start] + arrow + story[arrow_end:]
story_path.write_text(story)

# Lock the new intended menu geometry instead of the previous square-button contract.
replacements = {
    'tests/e2e/web-composition.spec.js': [("expect(homeTypography.playRadius).toBe('0px');", "expect(homeTypography.playRadius).toBe('18px');")],
    'tests/e2e/home-story.spec.js': [("expect(layout.arrowRadius).toBe('0px');", "expect(layout.arrowRadius).toBe('14px');")],
    'tests/pwa.test.js': [("assert.ok(pixelStyles.includes('min-height: 64px'));", "assert.ok(pixelStyles.includes('min-height: 78px'));\nassert.ok(pixelStyles.includes('--menu-radius-lg: 18px'));\nassert.ok(pixelStyles.includes('.home-console-speaker::before'));\nassert.ok(pixelStyles.includes(\"'copy action'\"));")],
    'tests/web-composition-contract.test.js': [("  'min-height: 64px',\n  'font-size: 22px',\n  'min-height: 44px',\n  'font-size: 16px',\n  'box-shadow: var(--pixel-shadow-small) !important',", "  '--menu-radius-lg: 18px',\n  'min-height: 78px',\n  'font-size: 22px',\n  \"'copy action'\",\n  '.home-console-speaker::before',\n  'border-radius: var(--menu-radius-lg) !important',")],
}

for relative, pairs in replacements.items():
    path = ROOT / relative
    source = path.read_text()
    for old, new in pairs:
        if old not in source:
            raise RuntimeError(f'missing expected contract in {relative}: {old}')
        source = source.replace(old, new, 1)
    path.write_text(source)

# Force installed PWAs to refresh the curated home in one clean cache epoch.
sw_path = ROOT / 'sw.js'
sw = sw_path.read_text().replace('flappyk-app-v24', 'flappyk-app-v25').replace('flappyk-runtime-v24', 'flappyk-runtime-v25')
sw_path.write_text(sw)
for path in (ROOT / 'tests').rglob('*.js'):
    source = path.read_text()
    updated = source.replace('flappyk-app-v24', 'flappyk-app-v25').replace('flappyk-runtime-v24', 'flappyk-runtime-v25').replace('PWA v24', 'PWA v25').replace('v24 contracts', 'v25 contracts')
    if updated != source:
        path.write_text(updated)

print('Applied console-first home menu, rounded side navigation, contract updates, and PWA v25 cache epoch.')
