(() => {
    'use strict';

    const core = window.FlappyKI18nCore;
    if (!core) {
        console.warn('FlappyK i18n core is unavailable.');
        return;
    }

    let storedLanguage = null;
    try {
        storedLanguage = window.localStorage.getItem(core.STORAGE_KEY);
    } catch (error) {
        console.warn('FlappyK language preference could not be loaded.', error);
    }

    const language = core.detectLanguage({
        storedLanguage,
        browserLanguage: navigator.language,
    });
    const htmlLanguage = language === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.lang = htmlLanguage;
    document.documentElement.dataset.flappykLanguage = language;

    const translate = (value) => core.translateText(value, language);
    const skippedTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'CODE', 'PRE']);
    const translatedAttributes = ['aria-label', 'title', 'placeholder'];

    function translateTextNode(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE || !node.nodeValue) return;
        if (skippedTags.has(node.parentElement?.tagName)) return;

        const match = node.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (!match || !match[2]) return;
        const translated = translate(match[2]);
        if (translated !== match[2]) node.nodeValue = `${match[1]}${translated}${match[3]}`;
    }

    function translateElementAttributes(element) {
        if (!(element instanceof Element)) return;
        translatedAttributes.forEach((attribute) => {
            const value = element.getAttribute(attribute);
            if (!value) return;
            const translated = translate(value);
            if (translated !== value) element.setAttribute(attribute, translated);
        });
    }

    function replaceLeadingLabel(element, label) {
        if (!(element instanceof Element)) return;
        const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
        if (textNode && textNode.nodeValue !== label) textNode.nodeValue = label;
    }

    function applyContextualTranslations() {
        if (language !== 'zh') return;
        document.querySelectorAll('.card-details p:first-child')
            .forEach((row) => replaceLeadingLabel(row, '标的： '));
    }

    function applyTranslations(root = document.documentElement) {
        if (language !== 'zh' || !root) return;

        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root);
            applyContextualTranslations();
            return;
        }

        if (root instanceof Element) translateElementAttributes(root);
        const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let textNode = textWalker.nextNode();
        while (textNode) {
            translateTextNode(textNode);
            textNode = textWalker.nextNode();
        }

        if (root.querySelectorAll) {
            root.querySelectorAll('*').forEach(translateElementAttributes);
        }
        applyContextualTranslations();
    }

    function saveLanguage(nextLanguage) {
        try {
            window.localStorage.setItem(core.STORAGE_KEY, nextLanguage);
        } catch (error) {
            console.warn('FlappyK language preference could not be saved.', error);
        }
    }

    function installLanguageToggle() {
        const startScreen = document.getElementById('start-screen');
        if (!startScreen || document.getElementById('language-toggle-btn')) return;

        const button = document.createElement('button');
        button.id = 'language-toggle-btn';
        button.type = 'button';
        button.textContent = language === 'zh' ? 'EN' : '中文';
        button.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换至中文');
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            saveLanguage(language === 'zh' ? 'en' : 'zh');
            window.location.reload();
        });
        startScreen.appendChild(button);
    }

    function patchDialogs() {
        const originalAlert = window.alert?.bind(window);
        const originalPrompt = window.prompt?.bind(window);
        const originalConfirm = window.confirm?.bind(window);

        if (originalAlert) window.alert = (message) => originalAlert(translate(message));
        if (originalPrompt) window.prompt = (message, defaultValue) => originalPrompt(translate(message), defaultValue);
        if (originalConfirm) window.confirm = (message) => originalConfirm(translate(message));
    }

    function patchNativeShare() {
        if (typeof navigator.share !== 'function') return;
        const originalShare = navigator.share.bind(navigator);
        const translatedShare = (data = {}) => originalShare({
            ...data,
            title: data.title ? translate(data.title) : data.title,
            text: data.text ? translate(data.text) : data.text,
        });

        try {
            Object.defineProperty(navigator, 'share', {
                configurable: true,
                value: translatedShare,
            });
        } catch (error) {
            try {
                navigator.share = translatedShare;
            } catch (assignmentError) {
                console.warn('Native share text could not be localized.', assignmentError || error);
            }
        }
    }

    function localizeMetadata() {
        document.title = translate(document.title);
        const description = document.querySelector('meta[name="description"]');
        if (description) description.content = translate(description.content);
    }

    installLanguageToggle();
    patchDialogs();
    patchNativeShare();
    localizeMetadata();
    applyTranslations();

    const observer = new MutationObserver((mutations) => {
        if (language !== 'zh') return;
        mutations.forEach((mutation) => {
            if (mutation.type === 'characterData') {
                translateTextNode(mutation.target);
                applyContextualTranslations();
                return;
            }
            mutation.addedNodes.forEach(applyTranslations);
            if (mutation.target instanceof Element) translateElementAttributes(mutation.target);
        });
    });
    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: translatedAttributes,
    });

    window.FlappyKI18n = {
        language,
        t: translate,
        apply: applyTranslations,
        setLanguage(nextLanguage) {
            const normalized = core.normalizeLanguage(nextLanguage);
            saveLanguage(normalized);
            window.location.reload();
        },
    };
})();
