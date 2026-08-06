(() => {
    'use strict';

    window.HaoAccountConfig = Object.freeze({
        enabled: true,
        billingEnabled: false,
        appName: 'FlappyK',
        productCode: 'flappyk',
        entitlementCode: 'flappyk.pro',
        supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co',
        supabasePublishableKey: 'sb_publishable_n1Va-c_alpkQ0zNuJYUaxA_J0u68RVW',
        checkoutFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-checkout-session',
        portalFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-portal-session',
        redirectUrl: 'https://liuh886.github.io/FlappyK/',
        mountSelectors: ['#start-screen .home-secondary-actions', '#start-screen .start-actions', '#start-screen'],
        compactTrigger: true,
        title: {
            zh: 'FlappyK 玩家账户',
            en: 'FlappyK player account',
        },
        description: {
            zh: '登录后可保存个人最佳成绩、完成局数与云端历史，并为未来跨设备记录和可信排行榜建立玩家身份。',
            en: 'Sign in to keep personal bests, completed runs, and cloud history, and establish a player identity for future cross-device records and trusted rankings.',
        },
        privacyNote: {
            zh: '云端记录仅作为个人历史。公共排行榜不会直接信任浏览器提交的成绩，未来仍需服务端校验。',
            en: 'Cloud records are personal history only. Public rankings never directly trust browser-submitted scores and will require server-side verification.',
        },
        features: [
            { zh: '同步个人最佳成绩与完成记录', en: 'Sync personal bests and completed runs' },
            { zh: '未来支持跨设备历史与可信排名', en: 'Prepare for cross-device history and trusted rankings' },
            { zh: '与其他 Hao Apps 共用同一登录身份', en: 'Use the same identity across Hao Apps' },
        ],
        feedbackEnabled: false,
    });
})();
