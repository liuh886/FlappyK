(() => {
    'use strict';

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches
        || window.navigator.standalone === true;
    const language = document.documentElement.dataset.flappykLanguage === 'zh' ? 'zh' : 'en';
    const copy = language === 'zh'
        ? {
            install: '安装应用',
            installLabel: '安装 FlappyK 应用',
            iosHelp: '在 Safari 中点击“分享”，然后选择“添加到主屏幕”。',
            unavailable: '当前浏览器暂未提供应用安装提示。你仍可通过浏览器菜单将 FlappyK 添加到主屏幕。',
        }
        : {
            install: 'INSTALL APP',
            installLabel: 'Install the FlappyK app',
            iosHelp: 'In Safari, tap Share, then choose Add to Home Screen.',
            unavailable: 'This browser has not offered an install prompt yet. You can still add FlappyK from the browser menu.',
        };

    let deferredInstallPrompt = null;
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    if (isStandalone) {
        document.documentElement.classList.add('pwa-standalone');
    }

    function ensureInstallButton() {
        const actions = document.querySelector('#start-screen .start-actions');
        if (!actions || document.getElementById('pwa-install-btn')) {
            return document.getElementById('pwa-install-btn');
        }

        const button = document.createElement('button');
        button.id = 'pwa-install-btn';
        button.type = 'button';
        button.textContent = copy.install;
        button.setAttribute('aria-label', copy.installLabel);
        button.addEventListener('click', async () => {
            if (deferredInstallPrompt) {
                const prompt = deferredInstallPrompt;
                deferredInstallPrompt = null;
                button.dataset.ready = 'false';
                await prompt.prompt();
                const choice = await prompt.userChoice;
                if (choice?.outcome !== 'accepted') {
                    button.dataset.ready = 'true';
                }
                return;
            }

            window.alert(isIos ? copy.iosHelp : copy.unavailable);
        });
        actions.appendChild(button);
        return button;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        const button = ensureInstallButton();
        if (button && !isStandalone) button.dataset.ready = 'true';
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        document.documentElement.classList.add('pwa-standalone');
        const button = document.getElementById('pwa-install-btn');
        if (button) button.dataset.ready = 'false';
    });

    if (isIos && !isStandalone) {
        const button = ensureInstallButton();
        if (button) button.dataset.ready = 'true';
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
                console.warn('FlappyK service worker registration failed:', error);
            });
        });
    }

    window.FlappyKPwa = {
        isStandalone,
        get deferredInstallPrompt() { return deferredInstallPrompt; },
    };

    if (!document.getElementById('flappyk-analytics-loader')) {
        const analyticsScript = document.createElement('script');
        analyticsScript.id = 'flappyk-analytics-loader';
        analyticsScript.src = './analytics.js';
        analyticsScript.async = true;
        document.head.appendChild(analyticsScript);
    }
})();
