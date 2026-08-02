(() => {
    'use strict';

    // Public runtime configuration only. Never place Stripe secrets, Supabase
    // service-role keys, or webhook signing secrets in this file.
    window.FlappyKMembershipConfig = Object.freeze({
        enabled: true,
        supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co',
        supabasePublishableKey: 'sb_publishable_n1Va-c_alpkQ0zNuJYUaxA_J0u68RVW',
        entitlementCode: 'flappyk.pro',
        checkoutFunctionUrl: '',
        portalFunctionUrl: '',
        redirectUrl: 'https://liuh886.github.io/FlappyK/',
    });
})();
