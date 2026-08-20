(() => {
    'use strict';

    function cssToken(name, fallback) {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
    }

    function palette() {
        return {
            bg: cssToken('--game-bg', '#07090c'),
            surface: cssToken('--game-surface', '#0b1016'),
            border: cssToken('--game-border', '#26313c'),
            borderStrong: cssToken('--game-border-strong', '#556371'),
            text: cssToken('--game-text', '#eef2f5'),
            muted: cssToken('--game-muted', '#81909e'),
            accent: cssToken('--game-accent', '#f0c94b'),
            system: cssToken('--game-system', '#6bcbd4'),
            green: cssToken('--game-green', '#5ed48a'),
            red: cssToken('--game-red', '#ef7370'),
        };
    }

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function drawHairlineGrid(ctx, plot, colors) {
        ctx.save();
        ctx.strokeStyle = colors.border;
        ctx.globalAlpha = 0.34;
        ctx.lineWidth = 1;

        const horizontalBands = 5;
        for (let i = 0; i <= horizontalBands; i += 1) {
            const y = Math.round(plot.top + (plot.height * i) / horizontalBands) + 0.5;
            ctx.beginPath();
            ctx.moveTo(plot.left, y);
            ctx.lineTo(plot.right, y);
            ctx.stroke();
        }

        const verticalBands = 6;
        for (let i = 0; i <= verticalBands; i += 1) {
            const x = Math.round(plot.left + (plot.width * i) / verticalBands) + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, plot.top);
            ctx.lineTo(x, plot.bottom);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawSectionLabel(ctx, label, x, y, colors) {
        ctx.save();
        ctx.fillStyle = colors.muted;
        ctx.globalAlpha = 0.78;
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x, y);
        ctx.restore();
    }

    function drawTradeMarker(ctx, type, x, y, colors) {
        const isBuy = type === 'buy';
        const size = 5;
        const offsetY = isBuy ? 11 : -11;
        const centerY = y + offsetY;

        ctx.save();
        ctx.fillStyle = isBuy ? colors.green : colors.red;
        ctx.strokeStyle = colors.bg;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (isBuy) {
            ctx.moveTo(x, centerY - size);
            ctx.lineTo(x - size, centerY + size);
            ctx.lineTo(x + size, centerY + size);
        } else {
            ctx.moveTo(x, centerY + size);
            ctx.lineTo(x - size, centerY - size);
            ctx.lineTo(x + size, centerY - size);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function drawCandles(ctx, state, plot, colors, startDay, minPrice, maxPrice) {
        const candleSlot = plot.width / state.visibleDays;
        const bodyWidth = clamp(candleSlot * 0.58, 2, 8);
        const range = Math.max(0.000001, maxPrice - minPrice);
        const getY = (price) => plot.bottom - ((price - minPrice) / range) * plot.height;

        for (let i = startDay; i <= state.dayIndex; i += 1) {
            const datum = state.currentData[i];
            if (!datum) continue;
            const displayIndex = i - startDay;
            const x = plot.left + displayIndex * candleSlot + candleSlot / 2;
            const openY = getY(datum.open);
            const closeY = getY(datum.close);
            const highY = getY(datum.high);
            const lowY = getY(datum.low);
            const isUp = datum.close >= datum.open;
            const aShare = state.currentMarket === 'ashare';
            const upColor = aShare ? colors.red : colors.green;
            const downColor = aShare ? colors.green : colors.red;
            const color = isUp ? upColor : downColor;

            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.86;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(Math.round(x) + 0.5, highY);
            ctx.lineTo(Math.round(x) + 0.5, lowY);
            ctx.stroke();

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
            ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
            ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = colors.system;
        ctx.globalAlpha = 0.44;
        ctx.setLineDash([3, 4]);
        const latest = state.currentData[state.dayIndex];
        if (latest) {
            const latestY = getY(latest.close);
            ctx.beginPath();
            ctx.moveTo(plot.left, latestY);
            ctx.lineTo(plot.right, latestY);
            ctx.stroke();
        }
        ctx.restore();

        state.actions.forEach((action) => {
            if (action.day < startDay || action.day > state.dayIndex) return;
            const displayIndex = action.day - startDay;
            const x = plot.left + displayIndex * candleSlot + candleSlot / 2;
            drawTradeMarker(ctx, action.type, x, getY(action.price), colors);
        });
    }

    function drawReturnPlot(ctx, state, plot, colors, startDay) {
        const history = state.totalHistory.slice(startDay, state.dayIndex + 1);
        if (!history.length) return;

        let minTotal = Math.min(state.levelStartCash, ...history);
        let maxTotal = Math.max(state.levelStartCash, ...history);
        const padding = (maxTotal - minTotal) * 0.14 || Math.max(50, state.levelStartCash * 0.01);
        minTotal -= padding;
        maxTotal += padding;
        const range = Math.max(0.000001, maxTotal - minTotal);
        const getY = (value) => plot.bottom - ((value - minTotal) / range) * plot.height;
        const slot = plot.width / state.visibleDays;

        const baselineY = getY(state.levelStartCash);
        ctx.save();
        ctx.strokeStyle = colors.borderStrong;
        ctx.globalAlpha = 0.72;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(plot.left, baselineY);
        ctx.lineTo(plot.right, baselineY);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = colors.system;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        let hasPoint = false;
        for (let i = startDay; i <= state.dayIndex; i += 1) {
            if (i >= state.totalHistory.length) continue;
            const displayIndex = i - startDay;
            const x = plot.left + displayIndex * slot + slot / 2;
            const y = getY(state.totalHistory[i]);
            if (!hasPoint) {
                ctx.moveTo(x, y);
                hasPoint = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        if (hasPoint) ctx.stroke();
        ctx.restore();

        const latest = state.totalHistory[Math.min(state.dayIndex, state.totalHistory.length - 1)];
        if (Number.isFinite(latest)) {
            const displayIndex = Math.min(state.dayIndex, state.totalHistory.length - 1) - startDay;
            const x = plot.left + displayIndex * slot + slot / 2;
            const y = getY(latest);
            ctx.save();
            ctx.fillStyle = colors.accent;
            ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
            ctx.restore();
        }
    }

    function draw(state) {
        const {
            ctx,
            width,
            height,
            currentData,
            dayIndex,
            visibleDays,
        } = state;
        if (!ctx || !Number.isFinite(width) || !Number.isFinite(height)) return;

        const colors = palette();
        ctx.save();
        ctx.setTransform(ctx.getTransform());
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        if (!Array.isArray(currentData) || currentData.length === 0 || dayIndex < 0) return;

        const topInset = clamp(height * 0.16, 90, 124);
        const sideInset = clamp(width * 0.024, 8, 18);
        const returnHeight = clamp(height * 0.16, 72, 126);
        const bottomInset = clamp(height * 0.055, 22, 42);
        const dividerGap = 24;
        const priceBottom = Math.max(topInset + 80, height - bottomInset - returnHeight - dividerGap);

        const pricePlot = {
            left: sideInset,
            right: width - sideInset,
            top: topInset,
            bottom: priceBottom,
        };
        pricePlot.width = Math.max(1, pricePlot.right - pricePlot.left);
        pricePlot.height = Math.max(1, pricePlot.bottom - pricePlot.top);

        const returnPlot = {
            left: sideInset,
            right: width - sideInset,
            top: priceBottom + dividerGap,
            bottom: height - bottomInset,
        };
        returnPlot.width = Math.max(1, returnPlot.right - returnPlot.left);
        returnPlot.height = Math.max(1, returnPlot.bottom - returnPlot.top);

        drawHairlineGrid(ctx, pricePlot, colors);
        drawHairlineGrid(ctx, returnPlot, colors);
        drawSectionLabel(ctx, 'PRICE', pricePlot.left, pricePlot.top - 16, colors);
        drawSectionLabel(ctx, 'PLAYER', returnPlot.left, returnPlot.top - 16, colors);

        const startDay = Math.max(0, dayIndex - visibleDays + 1);
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        for (let i = startDay; i <= dayIndex; i += 1) {
            const datum = currentData[i];
            if (!datum) continue;
            minPrice = Math.min(minPrice, datum.low);
            maxPrice = Math.max(maxPrice, datum.high);
        }
        if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) return;
        const pricePadding = (maxPrice - minPrice) * 0.1 || Math.max(1, Math.abs(maxPrice) * 0.01);
        minPrice -= pricePadding;
        maxPrice += pricePadding;

        drawCandles(ctx, state, pricePlot, colors, startDay, minPrice, maxPrice);
        drawReturnPlot(ctx, state, returnPlot, colors, startDay);
    }

    window.FlappyKMarketCanvas = Object.freeze({ draw });
})();
