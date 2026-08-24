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
            toolbar.setAttribute('role', 'group');
            toolbar.setAttribute('aria-label', 'Player tools');

            const skinSlot = document.createElement('div');
            skinSlot.id = 'skin-toggle-slot';
            skinSlot.className = 'home-skin-slot';

            const languageSlot = document.createElement('div');
            languageSlot.id = 'language-toggle-slot';
            languageSlot.className = 'home-language-slot';

            const accountSlot = document.createElement('div');
            accountSlot.className = 'home-account-slot';
            accountSlot.dataset.accountSlot = '';

            toolbar.append(skinSlot, languageSlot, accountSlot);
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

    function ensureReferralAssets() {
        if (!document.getElementById('hao-product-referral-styles')) {
            const stylesheet = document.createElement('link');
            stylesheet.id = 'hao-product-referral-styles';
            stylesheet.rel = 'stylesheet';
            stylesheet.href = 'https://liuh886.github.io/admin/shared/product-referral.css?v=3';
            document.head.appendChild(stylesheet);
        }

        if (!document.getElementById('hao-product-referral-script')) {
            const script = document.createElement('script');
            script.id = 'hao-product-referral-script';
            script.src = 'https://liuh886.github.io/admin/shared/product-referral.js?v=5';
            script.async = true;
            document.head.appendChild(script);
        }
    }

    function scheduleReferralAssets() {
        if (document.readyState === 'complete') {
            ensureReferralAssets();
            return;
        }
        window.addEventListener('load', ensureReferralAssets, { once: true });
    }

    ensureHomeAccountToolbar();

    window.HaoAccountConfig = Object.freeze({
        enabled: true,
        billingEnabled: true,
        referralEnabled: true,
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
            zh: '登录后可同步个人最佳成绩与完成记录；FlappyK Pro 提供更多技术指标道具。',
            en: 'Sign in to sync personal bests and completed runs. FlappyK Pro adds more technical-indicator power-ups.',
        },
        privacyNote: {
            zh: '云端记录用于同步你的个人游戏历史；排行榜按正式游戏规则统计。',
            en: 'Cloud records sync your personal game history; leaderboard results follow the published game rules.',
        },
        proUpgrade: {
            title: { zh: 'Free 与 FlappyK Pro', en: 'Free and FlappyK Pro' },
            freeTitle: { zh: '每日挑战可体验指标卡', en: 'Try indicator cards in Daily Run' },
            freeFeatures: [
                { zh: '每日挑战可体验 BOLL ×1、MACD ×1', en: 'Daily Run includes BOLL ×1 and MACD ×1' },
                { zh: '登录后同步个人最佳成绩与完成记录', en: 'Sign in to sync personal bests and completed runs' },
            ],
            proTitle: { zh: '每天获得更多指标道具', en: 'More indicator power-ups every day' },
            proFeatures: [
                { zh: '每天获得 BOLL ×3', en: 'Receive BOLL ×3 every day' },
                { zh: '每天获得 MACD ×3', en: 'Receive MACD ×3 every day' },
            ],
            note: {
                zh: 'Pro 只增加道具供给，不改变基础交易规则与排行榜判定。',
                en: 'Pro only adds power-up supply; it does not change core trading rules or leaderboard scoring.',
            },
            checkoutDescription: {
                zh: 'US$1/月开通 FlappyK Pro，每天获得 BOLL ×3 与 MACD ×3。Free 玩家仍可继续完整游玩。',
                en: 'FlappyK Pro is US$1/month and includes BOLL ×3 and MACD ×3 every day. Free players can still play the full core game.',
            },
            ctaTitle: { zh: '开通 FlappyK Pro', en: 'Upgrade to FlappyK Pro' },
        },
        feedbackEnabled: false,
    });

    scheduleReferralAssets();
})();
