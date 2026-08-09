(() => {
    'use strict';

    function ensureHomeAccountToolbar() {
        const startScreen = document.getElementById('start-screen');
        if (!startScreen) return;

        let toolbar = document.getElementById('home-utility-bar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'home-utility-bar';
            toolbar.className = 'home-utility-bar';
            toolbar.dataset.arcadePlacement = 'console';
            toolbar.setAttribute('aria-label', 'Language and player account');

            const languageSlot = document.createElement('div');
            languageSlot.id = 'language-toggle-slot';
            languageSlot.className = 'home-language-slot';

            const accountSlot = document.createElement('div');
            accountSlot.className = 'home-account-slot';
            accountSlot.dataset.accountSlot = '';

            toolbar.append(languageSlot, accountSlot);
            startScreen.prepend(toolbar);
        }

        if (!document.getElementById('flappyk-account-integration-styles')) {
            const stylesheet = document.createElement('link');
            stylesheet.id = 'flappyk-account-integration-styles';
            stylesheet.rel = 'stylesheet';
            stylesheet.href = './account-integration.css';
            document.head.appendChild(stylesheet);
        }
    }

    ensureHomeAccountToolbar();

    window.HaoAccountConfig = Object.freeze({
        enabled: true,
        billingEnabled: true,
        appName: 'FlappyK',
        productCode: 'flappyk',
        entitlementCode: 'flappyk.pro',
        supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co',
        supabasePublishableKey: 'sb_publishable_n1Va-c_alpkQ0zNuJYUaxA_J0u68RVW',
        checkoutFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-checkout-session',
        portalFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-portal-session',
        redirectUrl: 'https://liuh886.github.io/FlappyK/',
        mountSelectors: ['[data-account-slot]', '#start-screen'],
        compactTrigger: false,
        title: {
            zh: 'FlappyK 玩家账户',
            en: 'FlappyK player account',
        },
        description: {
            zh: '登录后保存个人最佳成绩、完成局数与云端历史。FlappyK Pro 每天额外获得 BOLL 与 MACD 道具各 3 张；Free 玩家可在每日挑战中体验各 1 张。',
            en: 'Sign in to keep personal bests, completed runs, and cloud history. FlappyK Pro adds three BOLL and three MACD power-ups every day; Free players can try one of each in Daily Run.',
        },
        privacyNote: {
            zh: '云端记录仅作为个人历史。公共排行榜不会直接信任浏览器提交的成绩，未来仍需服务端校验。',
            en: 'Cloud records are personal history only. Public rankings never directly trust browser-submitted scores and will require server-side verification.',
        },
        features: [
            { zh: 'Free：每日挑战体验 BOLL ×1、MACD ×1', en: 'Free: try BOLL ×1 and MACD ×1 in Daily Run' },
            { zh: 'Pro：每天获得 BOLL ×3、MACD ×3', en: 'Pro: receive BOLL ×3 and MACD ×3 every day' },
            { zh: '登录同步个人最佳成绩与完成记录', en: 'Sign in to sync personal bests and completed runs' },
        ],
        feedbackEnabled: false,
    });
})();
