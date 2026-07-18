(() => {
    'use strict';

    if (typeof ctx === 'undefined' || !ctx || ctx.__flappyKTradeIconsPolished) return;

    const originalFillText = ctx.fillText.bind(ctx);

    function drawOriginal(text, x, y, maxWidth) {
        if (Number.isFinite(maxWidth)) {
            originalFillText(text, x, y, maxWidth);
        } else {
            originalFillText(text, x, y);
        }
    }

    ctx.fillText = function polishedTradeIcon(text, x, y, maxWidth) {
        if (text === '👏') {
            this.save();
            this.shadowBlur = 0;
            this.beginPath();
            this.fillStyle = '#f1c40f';
            this.strokeStyle = '#fff3a0';
            this.lineWidth = 2;
            this.arc(x, y - 7, 13, 0, Math.PI * 2);
            this.fill();
            this.stroke();
            this.font = '16px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
            this.textAlign = 'center';
            drawOriginal('🐂', x, y, maxWidth);
            this.restore();
            return;
        }

        if (text === '🤷') {
            this.save();
            this.shadowBlur = 0;
            this.font = '18px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
            this.textAlign = 'center';
            drawOriginal('🐻‍❄️', x, y, maxWidth);
            this.restore();
            return;
        }

        drawOriginal(text, x, y, maxWidth);
    };

    ctx.__flappyKTradeIconsPolished = true;
})();
