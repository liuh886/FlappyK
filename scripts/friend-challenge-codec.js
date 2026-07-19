(function installFriendChallengeCodec(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKChallengeCodec = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    'use strict';

    const CHALLENGE_VERSION = 1;
    const MARKET_ORDER = ['crypto', 'ashare', 'usstock'];

    function toBase64Url(text) {
        let base64;
        if (typeof Buffer !== 'undefined') {
            base64 = Buffer.from(text, 'utf8').toString('base64');
        } else {
            const bytes = new TextEncoder().encode(text);
            let binary = '';
            bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
            base64 = btoa(binary);
        }
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function fromBase64Url(token) {
        const normalized = String(token || '').replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(padded, 'base64').toString('utf8');
        }
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    function validateChallengeShape(payload) {
        if (!payload || typeof payload !== 'object') return false;
        if (payload.v !== CHALLENGE_VERSION) return false;
        if (!Array.isArray(payload.g) || payload.g.length !== 3) return false;
        if (!Number.isFinite(Number(payload.t))) return false;

        return payload.g.every((game, index) => (
            game
            && typeof game === 'object'
            && game.m === MARKET_ORDER[index]
            && typeof game.a === 'string'
            && game.a.trim().length > 0
            && game.a.length <= 80
            && /^\d{4}-\d{2}-\d{2}$/.test(String(game.s || ''))
        ));
    }

    function encodeChallenge(payload) {
        if (!validateChallengeShape(payload)) {
            throw new TypeError('Invalid FlappyK friend challenge payload');
        }
        return toBase64Url(JSON.stringify(payload));
    }

    function decodeChallenge(token) {
        try {
            const payload = JSON.parse(fromBase64Url(token));
            return validateChallengeShape(payload) ? payload : null;
        } catch (error) {
            return null;
        }
    }

    return {
        CHALLENGE_VERSION,
        MARKET_ORDER,
        encodeChallenge,
        decodeChallenge,
        validateChallengeShape,
    };
});
