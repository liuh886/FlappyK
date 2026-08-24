(() => {
    'use strict';

    // Skin catalog: one entry per skin. Visual tokens live in skins.css;
    // this manifest is the single authority for ids, names, and rhythm.
    const SKIN_STORAGE_KEY = 'flappyk_skin_v1';

    const SKINS = Object.freeze([
        Object.freeze({
            id: 'arcade',
            nameEn: 'Market Arcade',
            nameZh: '像素街机',
            short: 'ARCADE',
            motion: null,
            atmosphere: 'none',
        }),
        Object.freeze({
            id: 'polar',
            nameEn: 'Polar Exchange',
            nameZh: '极地冰原',
            short: 'POLAR',
            motion: { fast: '110ms', base: '190ms', slow: '360ms' },
            atmosphere: 'snow',
        }),
        Object.freeze({
            id: 'amber',
            nameEn: 'Amber Terminal',
            nameZh: '琥珀终端',
            short: 'AMBER',
            motion: { fast: '80ms', base: '150ms', slow: '290ms' },
            atmosphere: 'dust',
        }),
    ]);

    const root = document.documentElement;

    function isChinese() {
        return (root.dataset.flappykLanguage || '').startsWith('zh')
            || (root.lang || '').toLowerCase().startsWith('zh');
    }

    function findSkin(id) {
        return SKINS.find((skin) => skin.id === id) || null;
    }

    function applyMotionTokens(skin) {
        ['fast', 'base', 'slow'].forEach((step) => {
            const property = `--motion-step-${step}`;
            if (skin.motion && skin.motion[step]) {
                root.style.setProperty(property, skin.motion[step]);
            } else {
                root.style.removeProperty(property);
            }
        });
    }

    function applySkin(id) {
        const skin = findSkin(id) || SKINS[0];
        root.dataset.skin = skin.id;
        applyMotionTokens(skin);
        window.FlappyKMarketCanvas?.refreshPalette?.();
        syncButton();
    }

    function readStoredSkin() {
        try {
            const stored = window.localStorage?.getItem(SKIN_STORAGE_KEY);
            return findSkin(stored) ? stored : SKINS[0].id;
        } catch (error) {
            return SKINS[0].id;
        }
    }

    function persistSkin(id) {
        try {
            window.localStorage?.setItem(SKIN_STORAGE_KEY, id);
        } catch (error) {
            // Preference failures must never block gameplay.
        }
    }

    let activeSkin = SKINS[0].id;

    function syncButton() {
        const button = document.getElementById('skin-toggle-btn');
        if (!button) return;
        const skin = findSkin(activeSkin) || SKINS[0];
        button.textContent = skin.short;
        button.setAttribute('aria-label', isChinese() ? `皮肤：${skin.nameZh}` : `Skin: ${skin.nameEn}`);
        button.setAttribute('title', isChinese() ? `皮肤：${skin.nameZh}` : `Skin: ${skin.nameEn}`);
    }

    window.FlappyKSkins = Object.freeze({
        list() {
            return SKINS.map((skin) => ({
                id: skin.id,
                nameEn: skin.nameEn,
                nameZh: skin.nameZh,
                short: skin.short,
            }));
        },
        getActive() {
            return activeSkin;
        },
        getActiveSkin() {
            return findSkin(activeSkin) || SKINS[0];
        },
        setSkin(id) {
            const skin = findSkin(id);
            if (!skin) throw new TypeError(`Unknown FlappyK skin: ${id}`);
            if (skin.id === activeSkin) return skin.id;
            activeSkin = skin.id;
            persistSkin(skin.id);
            applySkin(skin.id);
            window.FlappyKEvents?.emit?.('flappyk:skin-changed', { skin: skin.id });
            return skin.id;
        },
        cycle() {
            const index = SKINS.findIndex((skin) => skin.id === activeSkin);
            const next = SKINS[(index + 1) % SKINS.length];
            return window.FlappyKSkins.setSkin(next.id);
        },
        refreshLabel: syncButton,
    });

    // Boot: restore the saved choice before first paint where possible.
    activeSkin = readStoredSkin();
    applySkin(activeSkin);

    document.addEventListener('flappyk:language-changed', syncButton);

    function ensureButton() {
        const slot = document.getElementById('skin-toggle-slot');
        if (!slot || document.getElementById('skin-toggle-btn')) return;
        const button = document.createElement('button');
        button.id = 'skin-toggle-btn';
        button.type = 'button';
        button.addEventListener('click', () => window.FlappyKSkins.cycle());
        slot.append(button);
        syncButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureButton, { once: true });
    } else {
        ensureButton();
    }
})();
