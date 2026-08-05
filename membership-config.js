(() => {
    'use strict';

    // Public runtime configuration only. Never place Stripe secrets, Supabase
    // service-role keys, or webhook signing secrets in this file.
    window.FlappyKMembershipConfig = Object.freeze({
        enabled: true,
        billingEnabled: false,
        productCode: 'flappyk',
        supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co',
        supabasePublishableKey: 'sb_publishable_n1Va-c_alpkQ0zNuJYUaxA_J0u68RVW',
        entitlementCode: 'flappyk.pro',
        checkoutFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-checkout-session',
        portalFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-portal-session',
        redirectUrl: 'https://liuh886.github.io/FlappyK/',
    });
})();
