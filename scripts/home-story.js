(() => {
    'use strict';

    const root = document.documentElement;
    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('start-btn');
    if (!startScreen || !startButton || startScreen.dataset.storyInstalled === 'true') return;

    startScreen.dataset.storyInstalled = 'true';

    const copy = {
        en: {
            kicker: 'ONE THING',
            title: 'THE BEST TRADES ARE OFTEN QUIET.',
            lead: 'Across 250 days, only a handful of trades may decide the run.',
            body: 'Winning rarely comes from constant action. It comes from waiting until the odds finally tilt. The rest of the time, doing nothing is also a position.',
            days: 'DAYS',
            trades: 'TRADES',
            waiting: 'DAYS WAITING',
            play: 'PLAY THE TAPE',
            example: 'AN EXAMPLE RUN',
            range: 'DAY 001 — 250',
            buy: 'BUY',
            add: 'ADD',
            sell: 'SELL',
            day: 'DAY',
            footer: '3 DECISIONS',
            patience: '247 DAYS OF PATIENCE',
            previous: 'Back to the game home screen',
            next: 'Read the one thing FlappyK wants to tell you',
            previousLabel: 'BACK',
            nextLabel: 'ONE THING',
            pageOne: 'HOME PAGE 1 OF 2',
            pageTwo: 'STORY PAGE 2 OF 2',
            figure: 'An example 250-day market tape with three highlighted trades and long quiet periods between them.',
        },
        zh: {
            kicker: '一件事',
            title: '最好的交易，往往很安静。',
            lead: '250 天里，真正决定结果的，也许只有寥寥几笔。',
            body: '成功通常不来自持续操作，而来自耐心等待，直到赔率真正倾斜。其余时间，不动也是一种交易。',
            days: '天',
            trades: '次出手',
            waiting: '天等待',
            play: '开始这段行情',
            example: '一段示意行情',
            range: '第 001 — 250 天',
            buy: '买入',
            add: '加仓',
            sell: '卖出',
            day: '第',
            footer: '3 次决策',
            patience: '247 天耐心等待',
            previous: '返回游戏首页',
            next: '阅读 FlappyK 最想告诉你的一件事',
            previousLabel: '返回',
            nextLabel: '一件事',
            pageOne: '首页 1 / 2',
            pageTwo: '故事 2 / 2',
            figure: '一段 250 天的示意行情，只有三次交易被点亮，其余时间保持安静。',
        },
    };

    function isChinese() {
        return root.dataset.flappykLanguage === 'zh'
            || root.lang.toLowerCase().startsWith('zh');
    }

    function currentCopy() {
        return isChinese() ? copy.zh : copy.en;
    }

    const story = document.createElement('article');
    story.id = 'home-story-slide';
    story.className = 'home-story-slide';
    story.hidden = true;
    story.setAttribute('aria-labelledby', 'home-story-title');
    story.innerHTML = `
        <div class="home-story-copy">
            <span class="home-story-kicker" data-story-copy="kicker"></span>
            <h2 id="home-story-title" class="home-story-title" data-story-copy="title"></h2>
            <p class="home-story-lead" data-story-copy="lead"></p>
            <p class="home-story-body" data-story-copy="body"></p>
            <div class="home-story-equation" aria-label="250 days minus 3 trades equals 247 days waiting">
                <div class="home-story-equation-term">
                    <strong>250</strong>
                    <span data-story-copy="days"></span>
                </div>
                <span class="home-story-equation-symbol" aria-hidden="true">−</span>
                <div class="home-story-equation-term home-story-equation-term--trades">
                    <strong>3</strong>
                    <span data-story-copy="trades"></span>
                </div>
                <span class="home-story-equation-symbol" aria-hidden="true">=</span>
                <div class="home-story-equation-term home-story-equation-term--waiting">
                    <strong>247</strong>
                    <span data-story-copy="waiting"></span>
                </div>
            </div>
            <button id="home-story-play" class="home-story-play" type="button" data-story-copy="play"></button>
        </div>
        <figure class="home-story-tape" aria-labelledby="home-story-figure-caption">
            <div class="home-story-tape-header">
                <strong data-story-copy="example"></strong>
                <span data-story-copy="range"></span>
            </div>
            <svg class="home-story-chart" viewBox="0 0 640 280" role="img" aria-labelledby="home-story-figure-caption">
                <g class="home-story-chart-grid" aria-hidden="true">
                    <line x1="0" y1="56" x2="640" y2="56"></line>
                    <line x1="0" y1="112" x2="640" y2="112"></line>
                    <line x1="0" y1="168" x2="640" y2="168"></line>
                    <line x1="0" y1="224" x2="640" y2="224"></line>
                    <line x1="80" y1="0" x2="80" y2="280"></line>
                    <line x1="160" y1="0" x2="160" y2="280"></line>
                    <line x1="240" y1="0" x2="240" y2="280"></line>
                    <line x1="320" y1="0" x2="320" y2="280"></line>
                    <line x1="400" y1="0" x2="400" y2="280"></line>
                    <line x1="480" y1="0" x2="480" y2="280"></line>
                    <line x1="560" y1="0" x2="560" y2="280"></line>
                </g>
                <line class="home-story-chart-baseline" x1="0" y1="166" x2="640" y2="166" aria-hidden="true"></line>
                <g aria-hidden="true">
                    <g transform="translate(20 0)"><line class="home-story-chart-candle" x1="0" y1="178" x2="0" y2="218"></line><rect class="home-story-chart-candle-body" x="-4" y="190" width="8" height="14"></rect></g>
                    <g transform="translate(44 0)"><line class="home-story-chart-candle" x1="0" y1="164" x2="0" y2="207"></line><rect class="home-story-chart-candle-body" x="-4" y="177" width="8" height="16"></rect></g>
                    <g transform="translate(68 0)"><line class="home-story-chart-candle" x1="0" y1="171" x2="0" y2="216"></line><rect class="home-story-chart-candle-body" x="-4" y="187" width="8" height="12"></rect></g>
                    <g transform="translate(92 0)"><line class="home-story-chart-candle" x1="0" y1="148" x2="0" y2="201"></line><rect class="home-story-chart-candle-body" x="-4" y="166" width="8" height="18"></rect></g>
                    <g transform="translate(116 0)"><line class="home-story-chart-candle" x1="0" y1="155" x2="0" y2="194"></line><rect class="home-story-chart-candle-body" x="-4" y="168" width="8" height="13"></rect></g>
                    <g transform="translate(140 0)"><line class="home-story-chart-candle" x1="0" y1="137" x2="0" y2="190"></line><rect class="home-story-chart-candle-body" x="-4" y="151" width="8" height="21"></rect></g>
                    <g transform="translate(164 0)"><line class="home-story-chart-candle" x1="0" y1="145" x2="0" y2="186"></line><rect class="home-story-chart-candle-body" x="-4" y="158" width="8" height="15"></rect></g>
                    <g transform="translate(188 0)"><line class="home-story-chart-candle" x1="0" y1="126" x2="0" y2="179"></line><rect class="home-story-chart-candle-body" x="-4" y="143" width="8" height="20"></rect></g>
                    <g transform="translate(212 0)"><line class="home-story-chart-candle" x1="0" y1="135" x2="0" y2="181"></line><rect class="home-story-chart-candle-body" x="-4" y="149" width="8" height="14"></rect></g>
                    <g transform="translate(236 0)"><line class="home-story-chart-candle" x1="0" y1="115" x2="0" y2="166"></line><rect class="home-story-chart-candle-body" x="-4" y="132" width="8" height="19"></rect></g>
                    <g transform="translate(260 0)"><line class="home-story-chart-candle" x1="0" y1="124" x2="0" y2="169"></line><rect class="home-story-chart-candle-body" x="-4" y="139" width="8" height="14"></rect></g>
                    <g transform="translate(284 0)"><line class="home-story-chart-candle" x1="0" y1="102" x2="0" y2="154"></line><rect class="home-story-chart-candle-body" x="-4" y="117" width="8" height="21"></rect></g>
                    <g transform="translate(308 0)"><line class="home-story-chart-candle" x1="0" y1="111" x2="0" y2="159"></line><rect class="home-story-chart-candle-body" x="-4" y="126" width="8" height="16"></rect></g>
                    <g transform="translate(332 0)"><line class="home-story-chart-candle" x1="0" y1="91" x2="0" y2="145"></line><rect class="home-story-chart-candle-body" x="-4" y="108" width="8" height="20"></rect></g>
                    <g transform="translate(356 0)"><line class="home-story-chart-candle" x1="0" y1="99" x2="0" y2="143"></line><rect class="home-story-chart-candle-body" x="-4" y="112" width="8" height="15"></rect></g>
                    <g transform="translate(380 0)"><line class="home-story-chart-candle" x1="0" y1="78" x2="0" y2="131"></line><rect class="home-story-chart-candle-body" x="-4" y="95" width="8" height="20"></rect></g>
                    <g transform="translate(404 0)"><line class="home-story-chart-candle" x1="0" y1="87" x2="0" y2="137"></line><rect class="home-story-chart-candle-body" x="-4" y="102" width="8" height="17"></rect></g>
                    <g transform="translate(428 0)"><line class="home-story-chart-candle" x1="0" y1="65" x2="0" y2="119"></line><rect class="home-story-chart-candle-body" x="-4" y="82" width="8" height="20"></rect></g>
                    <g transform="translate(452 0)"><line class="home-story-chart-candle" x1="0" y1="74" x2="0" y2="123"></line><rect class="home-story-chart-candle-body" x="-4" y="89" width="8" height="16"></rect></g>
                    <g transform="translate(476 0)"><line class="home-story-chart-candle" x1="0" y1="55" x2="0" y2="110"></line><rect class="home-story-chart-candle-body" x="-4" y="70" width="8" height="22"></rect></g>
                    <g transform="translate(500 0)"><line class="home-story-chart-candle" x1="0" y1="66" x2="0" y2="114"></line><rect class="home-story-chart-candle-body" x="-4" y="80" width="8" height="16"></rect></g>
                    <g transform="translate(524 0)"><line class="home-story-chart-candle" x1="0" y1="43" x2="0" y2="101"></line><rect class="home-story-chart-candle-body" x="-4" y="60" width="8" height="22"></rect></g>
                    <g transform="translate(548 0)"><line class="home-story-chart-candle" x1="0" y1="51" x2="0" y2="104"></line><rect class="home-story-chart-candle-body" x="-4" y="67" width="8" height="18"></rect></g>
                    <g transform="translate(572 0)"><line class="home-story-chart-candle" x1="0" y1="35" x2="0" y2="91"></line><rect class="home-story-chart-candle-body" x="-4" y="51" width="8" height="23"></rect></g>
                    <g transform="translate(596 0)"><line class="home-story-chart-candle" x1="0" y1="45" x2="0" y2="96"></line><rect class="home-story-chart-candle-body" x="-4" y="60" width="8" height="18"></rect></g>
                    <g transform="translate(620 0)"><line class="home-story-chart-candle" x1="0" y1="27" x2="0" y2="83"></line><rect class="home-story-chart-candle-body" x="-4" y="43" width="8" height="23"></rect></g>
                </g>
                <polyline class="home-story-chart-price" points="0,205 36,194 72,199 108,176 144,163 180,156 216,151 252,137 288,126 324,121 360,109 396,104 432,88 468,82 504,76 540,62 576,57 612,48 640,42" aria-hidden="true"></polyline>
                <g class="home-story-marker home-story-marker--buy" transform="translate(148 0)">
                    <line class="home-story-marker-line" x1="0" y1="154" x2="0" y2="246"></line>
                    <rect class="home-story-marker-block" x="-6" y="148" width="12" height="12"></rect>
                    <text class="home-story-marker-label" x="-20" y="264" data-story-copy="buy"></text>
                    <text class="home-story-marker-day" x="-24" y="278"><tspan data-story-copy="day"></tspan> 058</text>
                </g>
                <g class="home-story-marker home-story-marker--add" transform="translate(360 0)">
                    <line class="home-story-marker-line" x1="0" y1="102" x2="0" y2="246"></line>
                    <rect class="home-story-marker-block" x="-6" y="96" width="12" height="12"></rect>
                    <text class="home-story-marker-label" x="-18" y="264" data-story-copy="add"></text>
                    <text class="home-story-marker-day" x="-24" y="278"><tspan data-story-copy="day"></tspan> 141</text>
                </g>
                <g class="home-story-marker home-story-marker--sell" transform="translate(548 0)">
                    <line class="home-story-marker-line" x1="0" y1="55" x2="0" y2="246"></line>
                    <rect class="home-story-marker-block" x="-6" y="49" width="12" height="12"></rect>
                    <text class="home-story-marker-label" x="-20" y="264" data-story-copy="sell"></text>
                    <text class="home-story-marker-day" x="-24" y="278"><tspan data-story-copy="day"></tspan> 214</text>
                </g>
            </svg>
            <figcaption id="home-story-figure-caption" class="home-story-tape-footer">
                <strong data-story-copy="footer"></strong>
                <span data-story-copy="patience"></span>
            </figcaption>
        </figure>`;

    const navigation = document.createElement('nav');
    navigation.className = 'home-story-navigation';
    navigation.setAttribute('aria-label', 'Home pages');
    navigation.innerHTML = `
        <button class="home-story-arrow home-story-arrow--previous" type="button" hidden>
            <span aria-hidden="true">◀</span>
            <span class="home-story-arrow-label" data-story-copy="previousLabel"></span>
        </button>
        <button class="home-story-arrow home-story-arrow--next" type="button">
            <span class="home-story-arrow-label" data-story-copy="nextLabel"></span>
            <span aria-hidden="true">▶</span>
        </button>
        <span class="home-story-page-status" aria-live="polite"><strong>01</strong>&nbsp;/&nbsp;02</span>`;

    startScreen.append(story, navigation);

    const previousButton = navigation.querySelector('.home-story-arrow--previous');
    const nextButton = navigation.querySelector('.home-story-arrow--next');
    const pageStatus = navigation.querySelector('.home-story-page-status');
    const storyPlayButton = story.querySelector('#home-story-play');
    let storyActive = false;

    function renderCopy() {
        const text = currentCopy();
        document.querySelectorAll('[data-story-copy]').forEach((element) => {
            const key = element.dataset.storyCopy;
            if (Object.prototype.hasOwnProperty.call(text, key)) element.textContent = text[key];
        });
        previousButton.setAttribute('aria-label', text.previous);
        previousButton.title = text.previous;
        nextButton.setAttribute('aria-label', text.next);
        nextButton.title = text.next;
        navigation.setAttribute('aria-label', isChinese() ? '首页分页' : 'Home pages');
        story.setAttribute('aria-label', isChinese() ? '少数关键交易的故事' : 'The story of a few decisive trades');
        story.querySelector('.home-story-equation')?.setAttribute(
            'aria-label',
            isChinese() ? '250 天减去 3 次出手，等于 247 天等待' : '250 days minus 3 trades equals 247 days waiting',
        );
        story.querySelector('.home-story-tape')?.setAttribute('aria-label', text.figure);
        pageStatus.setAttribute('aria-label', storyActive ? text.pageTwo : text.pageOne);
    }

    function setStoryActive(active, { focus = true } = {}) {
        storyActive = Boolean(active);
        startScreen.classList.toggle('is-story-active', storyActive);
        startScreen.dataset.homePage = storyActive ? 'story' : 'play';
        story.hidden = !storyActive;
        previousButton.hidden = !storyActive;
        nextButton.hidden = storyActive;
        pageStatus.innerHTML = storyActive ? '<strong>02</strong>&nbsp;/&nbsp;02' : '<strong>01</strong>&nbsp;/&nbsp;02';
        renderCopy();
        if (focus) (storyActive ? previousButton : nextButton).focus({ preventScroll: true });
    }

    nextButton.addEventListener('click', () => setStoryActive(true));
    previousButton.addEventListener('click', () => setStoryActive(false));
    storyPlayButton.addEventListener('click', () => {
        setStoryActive(false, { focus: false });
        startButton.click();
    });

    document.addEventListener('keydown', (event) => {
        if (!startScreen.classList.contains('active')) return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key === 'ArrowRight' && !storyActive) {
            event.preventDefault();
            setStoryActive(true);
        } else if (event.key === 'ArrowLeft' && storyActive) {
            event.preventDefault();
            setStoryActive(false);
        }
    });

    new MutationObserver(() => {
        if (!startScreen.classList.contains('active') && storyActive) {
            setStoryActive(false, { focus: false });
        }
    }).observe(startScreen, { attributes: true, attributeFilter: ['class'] });

    new MutationObserver(renderCopy).observe(root, {
        attributes: true,
        attributeFilter: ['lang', 'data-flappyk-language'],
    });

    renderCopy();
    setStoryActive(false, { focus: false });
})();
