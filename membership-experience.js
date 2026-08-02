(() => {
    'use strict';

    const membership = window.FlappyKMembership;
    if (!membership?.isConfigured?.()) return;

    function isChinese() {
        return document.documentElement.dataset.flappykLanguage === 'zh'
            || document.documentElement.lang.toLowerCase().startsWith('zh');
    }

    function getCopy() {
        return isChinese()
            ? {
                utilityLabel: '账户与语言',
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
                utilityLabel: 'Account and language',
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
        if (!launcher) return false;

        let utilityBar = document.getElementById('home-utility-bar');
        if (!utilityBar) {
            utilityBar = document.createElement('div');
            utilityBar.id = 'home-utility-bar';
            utilityBar.className = 'home-utility-bar';
            utilityBar.setAttribute('role', 'group');
            document.body.appendChild(utilityBar);
        }

        utilityBar.setAttribute('aria-label', getCopy().utilityLabel);
        if (launcher.parentElement !== utilityBar) utilityBar.appendChild(launcher);
        if (languageToggle && languageToggle.parentElement !== utilityBar) {
            utilityBar.appendChild(languageToggle);
        }
        [launcher, languageToggle].filter(Boolean).forEach((control) => {
            control.style.boxSizing = 'border-box';
        });
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
        syncUtilityVisibility();
    }

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
        renderResultPrompt,
        syncUtilityVisibility,
    };
})();