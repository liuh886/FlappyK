async function mockSharedAccount(page, options = {}) {
  const signedIn = Boolean(options.signedIn);
  const remoteProfile = options.remoteProfile || null;
  const failAccountAssets = Boolean(options.failAccountAssets);

  await page.route('https://liuh886.github.io/admin/shared/account-shell.css**', (route) => {
    if (failAccountAssets) return route.abort();
    return route.fulfill({
      contentType: 'text/css',
      body: `
        .hao-account-trigger { min-height: 40px; display: inline-flex; align-items: center; gap: 6px; }
        .hao-account-backdrop { position: fixed; inset: 0; z-index: 9999; display: flex; justify-content: flex-end; background: rgba(0,0,0,.45); }
        .hao-account-dialog { box-sizing: border-box; width: min(440px, 100vw); height: 100%; padding: 24px; background: #111827; color: white; }
        @media (max-width: 640px) { .hao-account-dialog { width: 100%; height: min(92dvh, 820px); margin-top: auto; } }
      `,
    });
  });

  await page.route('https://liuh886.github.io/admin/shared/account-shell.js**', (route) => {
    if (failAccountAssets) return route.abort();
    return route.fulfill({
      contentType: 'application/javascript',
      body: `
        (() => {
          const signedIn = ${JSON.stringify(signedIn)};
          const remoteProfile = ${JSON.stringify(remoteProfile)};
          const fakeState = globalThis.__fakeAccountState = {
            profileUpdates: [],
            productSaves: [],
            runs: [],
          };
          const accountState = {
            configured: true,
            loading: false,
            user: signedIn ? { id: 'user-1', email: 'player@example.com' } : null,
            profile: signedIn ? { display_name: 'Player One', avatar_url: null } : null,
            productAccount: signedIn ? { state: { profile: remoteProfile }, preferences: {} } : null,
            entitlements: [],
            isPro: false,
            error: '',
            productCode: 'flappyk',
          };
          function makeBuilder(table, payload) {
            return {
              eq() { return this; },
              then(resolve, reject) {
                if (table === 'profiles' && payload) fakeState.profileUpdates.push(payload);
                return Promise.resolve({ data: null, error: null }).then(resolve, reject);
              },
            };
          }
          const client = {
            from(table) {
              return {
                update(payload) { return makeBuilder(table, payload); },
                upsert(payload) {
                  if (table === 'game_runs') {
                    const duplicate = fakeState.runs.some((run) => run.user_id === payload.user_id && run.local_signature === payload.local_signature);
                    if (!duplicate) fakeState.runs.push(payload);
                  }
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
          window.HaoAccount = Object.freeze({
            getState: () => accountState,
            getClient: async () => client,
            saveProductData: async (payload) => {
              fakeState.productSaves.push(payload);
              accountState.productAccount = {
                ...(accountState.productAccount || {}),
                state: payload.productState || {},
                preferences: payload.preferences || {},
              };
              return accountState.productAccount;
            },
            open() {}, close() {}, refresh: async () => accountState,
            can: () => false, submitFeedback: async () => {}, subscribe: () => () => {},
          });
          const mount = document.querySelector('[data-account-slot]');
          if (mount) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'hao-account-trigger';
            button.setAttribute('aria-label', 'FlappyK Account');
            button.innerHTML = '<span class="hao-account-trigger-visual">●</span><span class="hao-account-trigger-label">ACCOUNT</span>';
            button.addEventListener('click', () => {
              if (document.querySelector('.hao-account-backdrop')) return;
              const backdrop = document.createElement('div');
              backdrop.className = 'hao-account-backdrop';
              backdrop.innerHTML = '<section class="hao-account-dialog" role="dialog"><h2>FlappyK player account</h2><button type="button" data-close>Close</button></section>';
              backdrop.querySelector('[data-close]').addEventListener('click', () => backdrop.remove());
              document.body.appendChild(backdrop);
            });
            mount.appendChild(button);
          }
          window.dispatchEvent(new CustomEvent('hao:account-changed', { detail: accountState }));
        })();
      `,
    });
  });
}

module.exports = { mockSharedAccount };
