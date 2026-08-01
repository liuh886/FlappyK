# FlappyK PWA

FlappyK can be installed from its GitHub Pages site and launched in a standalone app window.

## Install

- **Chrome / Edge on desktop or Android:** open FlappyK and use the browser install icon, browser menu, or the `INSTALL APP` button when it appears.
- **Safari on iPhone or iPad:** open the Share menu and choose **Add to Home Screen**.

The installed app uses the same URL and data as the web version. No account is required.

## Offline behavior

After the service worker finishes its first online installation, the following remain available offline:

- normal three-market runs;
- Daily Run generation from the bundled data snapshot;
- existing friend-challenge URLs, including their exact hidden windows;
- local Personal Best and Daily Streak data;
- Chinese and English UI.

Features that require GitHub or another remote service, such as refreshing the global leaderboard or loading supplemental remote data, update when a network connection is available. The core game does not depend on those requests.

## Updates

The service worker uses versioned caches. A new deployment installs the new app shell and removes obsolete FlappyK caches when the updated worker activates.
