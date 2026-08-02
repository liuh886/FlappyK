(() => {
    'use strict';

    // Public runtime configuration only. Never place Stripe secrets, Supabase
    // service-role keys, or webhook signing secrets in this file.
    window.FlappyKMembershipConfig = Object.freeze({
        enabled: false,
        supabaseUrl: '',
        supabasePublishableKey: '',
        entitlementCode: 'flappyk.pro',
        checkoutFunctionUrl: '',
        portalFunctionUrl: '',
        redirectUrl: 'https://liuh886.github.io/FlappyK/',
    });
})();
