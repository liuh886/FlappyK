(() => {
    'use strict';

    const membership = window.FlappyKMembership;
    if (!membership?.isConfigured?.()) return;

    let normalizingLauncher = false;
    let launcherObserver = null;

    function isChinese() {
        return document.documentElement.dataset.flappykLanguage === 'zh'
            || document.documentElement.lang.toLowerCase().startsWith('zh');
    }

    function getCopy() {
        return isChinese()
            ? {
                utilityLabel: '语言与账户',
                accountLabel: '账户',
                guestKicker: '成绩保护',
                guestTitle: '登录后保留这次通关',
                guestCopy: '本次三市场成绩已暂存在这台设备中。现在登录，系统会把它同步到你的账户。',
                guestAction: '登录并保存成绩',
                signedInKicker: '账户同步',
                signedInTitle: '本次成绩已加入同步',
                signedInCopy: '成绩会与当前账户关联，本地记录也会继续保留。',
                signedInAction: '查看账户',
                errorKicker: '同步待处理',
                errorTitle: '成绩仍保存在本机',
                errorCopy: '账户服务暂时不可用。成绩不会立即丢失，稍后登录即可继续同步。',
                errorAction: '查看账户状态',
            }
            : {
                utilityLabel: 'Language and account',
                accountLabel: 'ACCOUNT',
                guestKicker: 'PROTECT THIS RUN',
                guestTitle: 'Sign in to keep this result',
                guestCopy: 'This three-market result is temporarily stored on this device. Sign in now to sync it to your account.',
                guestAction: 'SIGN IN & SAVE RESULT',
                signedInKicker: 'ACCOUNT SYNC',
                signedInTitle: 'This result is queued for sync',
                signedInCopy: 'The result will stay linked to your account while the local record remains available.',
                signedInAction: 'VIEW ACCOUNT',
                errorKicker: 'SYNC PENDING',
                errorTitle: 'Your result is still on this device',
                errorCopy: 'The account service is temporarily unavailable. Sign in again later to continue syncing.',
                errorAction: 'CHECK ACCOUNT STATUS',
            };
    }

    function installUtilityRefinementStyles() {
        if (document.getElementById('flappyk-account-utility-refinement')) return;
        const style = document.createElement('style');
        style.id = 'flappyk-account-utility-refinement';
        style.textContent = `
            .home-utility-bar {
                gap: 0;
                padding: 3px;
                border: 1px solid rgba(240, 246, 252, 0.42);
                border-radius: 999px;
                background: rgba(13, 17, 23, 0.9);
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
                backdrop-filter: blur(10px);
            }
            .home-utility-bar .membership-launcher,
            .home-utility-bar #language-toggle-btn {
                min-height: 32px;
                height: 32px;
                border: 0;
                background: transparent;
                box-shadow: none;
            }
            .home-utility-bar #language-toggle-btn {
                order: 1;
                min-width: 52px;
                border-radius: 999px 0 0 999px;
                border-right: 1px solid rgba(240, 246, 252, 0.2);
            }
            .home-utility-bar .membership-launcher {
                order: 2;
                min-width: 0;
                padding: 0 10px;
                border-radius: 0 999px 999px 0;
                gap: 7px;
            }
            .home-utility-bar .membership-launcher::before {
                display: none;
            }
            .membership-launcher-label {
                white-space: nowrap;
            }
            .membership-launcher-tier {
                display: inline-flex;
                min-height: 20px;
                padding: 2px 6px;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(240, 246, 252, 0.35);
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.08);
                color: #c9d1d9;
                font-size: 0.78em;
                line-height: 1;
                letter-spacing: 0.04em;
            }
            .membership-launcher-tier[hidden] {
                display: none;
            }
            .membership-launcher[data-tier='pro'] .membership-launcher-tier {
                border-color: rgba(241, 196, 15, 0.72);
                background: rgba(241, 196, 15, 0.14);
                color: #f1c40f;
            }
            .home-utility-bar .membership-launcher:hover,
            .home-utility-bar #language-toggle-btn:hover {
                border-color: transparent;
                background: rgba(255, 255, 255, 0.08);
            }
            @media (max-width: 768px) {
                .home-utility-bar {
                    padding: 2px;
                }
                .home-utility-bar #language-toggle-btn {
                    min-width: 44px;
                    height: 30px;
                    min-height: 30px;
                    padding-inline: 7px;
                }
                .home-utility-bar .membership-launcher {
                    height: 30px;
                    min-height: 30px;
                    padding-inline: 8px;
                    gap: 5px;
                    font-size: 11px;
                }
                .membership-launcher-tier {
                    min-height: 18px;
                    padding-inline: 5px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function normalizeLauncher() {
        const launcher = document.querySelector('.membership-launcher');
        if (!launcher || normalizingLauncher) return;

        const copy = getCopy();
        const state = membership.getState?.() || {};
        const signedIn = Boolean(state.user);
        const tier = state.isPro ? 'PRO' : signedIn ? 'FREE' : '';
        const currentLabel = launcher.querySelector('.membership-launcher-label')?.textContent || '';
        const currentTier = launcher.querySelector('.membership-launcher-tier')?.textContent || '';

        if (currentLabel === copy.accountLabel
            && currentTier === tier
            && launcher.dataset.accountState === (signedIn ? 'signed-in' : 'guest')) return;

        normalizingLauncher = true;
        const label = document.createElement('span');
        label.className = 'membership-launcher-label';
        label.textContent = copy.accountLabel;

        const tierBadge = document.createElement('span');
        tierBadge.className = 'membership-launcher-tier';
        tierBadge.textContent = tier;
        tierBadge.hidden = !tier;

        launcher.replaceChildren(label, tierBadge);
        launcher.dataset.accountState = signedIn ? 'signed-in' : 'guest';
        launcher.setAttribute('aria-label', tier
            ? `${copy.accountLabel} · ${tier}`
            : copy.accountLabel);
        normalizingLauncher = false;
    }

    function observeLauncher() {
        const launcher = document.querySelector('.membership-launcher');
        if (!launcher || launcherObserver) return;
        launcherObserver = new MutationObserver(normalizeLauncher);
        launcherObserver.observe(launcher, {
            attributes: true,
            attributeFilter: ['data-tier'],
            childList: true,
            characterData: true,
            subtree: true,
        });
    }

    function syncUtilityVisibility() {
        const utilityBar = document.getElementById('home-utility-bar');
        const gameControls = document.getElementById('game-top-controls');
        if (!utilityBar) return;
        const hidden = Boolean(gameControls && !gameControls.hidden);
        utilityBar.hidden = hidden;
        utilityBar.style.display = hidden ? 'none' : '';
    }

    function installUtilityBar() {
        const launcher = document.querySelector('.membership-launcher');
        const languageToggle = document.getElementById('language-toggle-btn');
        const host = document.getElementById('game-container') || document.body;
        if (!launcher) return false;

        let utilityBar = document.getElementById('home-utility-bar');
        if (!utilityBar) {
            utilityBar = document.createElement('div');
            utilityBar.id = 'home-utility-bar';
            utilityBar.className = 'home-utility-bar';
            utilityBar.setAttribute('role', 'group');
        }

        if (utilityBar.parentElement !== host) host.appendChild(utilityBar);
        utilityBar.setAttribute('aria-label', getCopy().utilityLabel);

        // Language is secondary; account remains the conventional right-most control.
        if (languageToggle) utilityBar.appendChild(languageToggle);
        utilityBar.appendChild(launcher);

        [launcher, languageToggle].filter(Boolean).forEach((control) => {
            control.style.boxSizing = 'border-box';
        });
        normalizeLauncher();
        observeLauncher();
        syncUtilityVisibility();
        return Boolean(languageToggle);
    }

    function createResultPrompt() {
        const screen = document.getElementById('champagne-screen');
        const actions = screen?.querySelector('.action-buttons');
        if (!screen || !actions) return null;

        let prompt = document.getElementById('membership-result-prompt');
        if (prompt) return prompt;

        prompt = document.createElement('section');
        prompt.id = 'membership-result-prompt';
        prompt.className = 'membership-result-prompt';
        prompt.hidden = true;
        prompt.setAttribute('aria-live', 'polite');
        prompt.innerHTML = `
            <div class="membership-result-copy">
                <p class="membership-result-kicker" data-membership-result-kicker></p>
                <h2 data-membership-result-title></h2>
                <p data-membership-result-copy></p>
            </div>
            <button type="button" class="membership-result-action" data-membership-result-action></button>`;

        actions.before(prompt);
        prompt.querySelector('[data-membership-result-action]')
            .addEventListener('click', () => membership.open?.());
        return prompt;
    }

    function renderResultPrompt() {
        const prompt = createResultPrompt();
        if (!prompt) return;

        const copy = getCopy();
        const state = membership.getState?.() || {};
        const hasError = Boolean(state.lastError);
        const signedIn = Boolean(state.user);
        const view = hasError
            ? {
                state: 'error',
                kicker: copy.errorKicker,
                title: copy.errorTitle,
                body: copy.errorCopy,
                action: copy.errorAction,
            }
            : signedIn
                ? {
                    state: 'signed-in',
                    kicker: copy.signedInKicker,
                    title: copy.signedInTitle,
                    body: copy.signedInCopy,
                    action: copy.signedInAction,
                }
                : {
                    state: 'guest',
                    kicker: copy.guestKicker,
                    title: copy.guestTitle,
                    body: copy.guestCopy,
                    action: copy.guestAction,
                };

        prompt.dataset.state = view.state;
        prompt.querySelector('[data-membership-result-kicker]').textContent = view.kicker;
        prompt.querySelector('[data-membership-result-title]').textContent = view.title;
        prompt.querySelector('[data-membership-result-copy]').textContent = view.body;
        prompt.querySelector('[data-membership-result-action]').textContent = view.action;
        prompt.hidden = false;
        normalizeLauncher();
        syncUtilityVisibility();
    }

    installUtilityRefinementStyles();
    installUtilityBar();
    createResultPrompt();

    const utilityObserver = new MutationObserver(() => {
        if (installUtilityBar()) utilityObserver.disconnect();
    });
    utilityObserver.observe(document.body, { childList: true, subtree: true });

    const gameControls = document.getElementById('game-top-controls');
    if (gameControls) {
        new MutationObserver(syncUtilityVisibility).observe(gameControls, {
            attributes: true,
            attributeFilter: ['hidden'],
        });
    }

    document.getElementById('champagne-btn')?.addEventListener('click', () => {
        window.requestAnimationFrame(renderResultPrompt);
    });
    window.addEventListener('flappyk:run-completed', renderResultPrompt);

    window.FlappyKMembershipExperience = {
        installUtilityBar,
        normalizeLauncher,
        renderResultPrompt,
        syncUtilityVisibility,
    };
})();