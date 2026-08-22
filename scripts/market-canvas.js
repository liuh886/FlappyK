(() => {
    'use strict';

    const FONT_UI = '"Pixelify Sans", ui-monospace, SFMono-Regular, Menlo, monospace';
    const FONT_DISPLAY = '"Press Start 2P", "Pixelify Sans", ui-monospace, monospace';

    function cssToken(name, fallback) {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
    }

    let cachedPalette = null;
    let lastPaletteCheck = 0;

    function refreshPalette() {
        cachedPalette = {
            bg: cssToken('--game-bg', '#06080c'),
            surface: cssToken('--game-surface', '#0b1118'),
            raised: cssToken('--game-surface-raised', '#111a24'),
            border: cssToken('--game-border', '#2a3946'),
            borderStrong: cssToken('--game-border-strong', '#607180'),
            text: cssToken('--game-text', '#f5f9fc'),
            muted: cssToken('--game-muted', '#a7b4c2'),
            accent: cssToken('--game-accent', '#ffd84d'),
            system: cssToken('--game-system', '#73e6f2'),
            green: cssToken('--game-green', '#66e38f'),
            red: cssToken('--game-red', '#ff6d77'),
        };
        return cachedPalette;
    }

    function palette() {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (!cachedPalette || now - lastPaletteCheck > 1000) {
            lastPaletteCheck = now;
            return refreshPalette();
        }
        return cachedPalette;
    }

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function snap(value) {
        return Math.round(value);
    }

    function drawHardBox(ctx, x, y, width, height, fill, stroke, depth = 0, depthColor = '#000') {
        const left = snap(x);
        const top = snap(y);
        const w = Math.max(1, snap(width));
        const h = Math.max(1, snap(height));

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        if (depth > 0) {
            ctx.fillStyle = depthColor;
            ctx.fillRect(left + depth, top + depth, w, h);
        }
        ctx.fillStyle = fill;
        ctx.fillRect(left, top, w, h);
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2;
            ctx.strokeRect(left + 1, top + 1, Math.max(1, w - 2), Math.max(1, h - 2));
        }
        ctx.restore();
    }

    function drawStageFrame(ctx, plot, colors) {
        ctx.save();
        ctx.strokeStyle = colors.borderStrong;
        ctx.globalAlpha = 0.72;
        ctx.lineWidth = 2;
        ctx.strokeRect(snap(plot.left) + 1, snap(plot.top) + 1, snap(plot.width) - 2, snap(plot.height) - 2);

        const corner = 9;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = colors.system;
        ctx.lineWidth = 2;
        for (const [x, y, sx, sy] of [
            [plot.left, plot.top, 1, 1],
            [plot.right, plot.top, -1, 1],
            [plot.left, plot.bottom, 1, -1],
            [plot.right, plot.bottom, -1, -1],
        ]) {
            ctx.beginPath();
            ctx.moveTo(snap(x), snap(y + sy * corner));
            ctx.lineTo(snap(x), snap(y));
            ctx.lineTo(snap(x + sx * corner), snap(y));
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawHairlineGrid(ctx, plot, colors) {
        ctx.save();
        ctx.strokeStyle = colors.border;
        ctx.globalAlpha = 0.38;
        ctx.lineWidth = 1;

        const horizontalBands = 5;
        for (let i = 1; i < horizontalBands; i += 1) {
            const y = snap(plot.top + (plot.height * i) / horizontalBands) + 0.5;
            ctx.beginPath();
            ctx.moveTo(plot.left, y);
            ctx.lineTo(plot.right, y);
            ctx.stroke();
        }

        const verticalBands = 8;
        for (let i = 1; i < verticalBands; i += 1) {
            const x = snap(plot.left + (plot.width * i) / verticalBands) + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, plot.top);
            ctx.lineTo(x, plot.bottom);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawSectionLabel(ctx, label, x, y, colors) {
        ctx.save();
        ctx.font = `700 12px ${FONT_UI}`;
        const textWidth = Math.ceil(ctx.measureText(label).width);
        const width = textWidth + 18;
        const height = 22;
        drawHardBox(ctx, x, y - 2, width, height, colors.surface, colors.borderStrong, 3, colors.bg);
        ctx.fillStyle = colors.system;
        ctx.font = `700 12px ${FONT_UI}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, snap(x) + 9, snap(y) + 9);
        ctx.restore();
    }

    function drawCheckpointRail(ctx, plot, state, startDay, colors) {
        const slot = plot.width / state.visibleDays;
        const markerCount = 5;
        const railY = snap(plot.bottom - 13);

        ctx.save();
        ctx.strokeStyle = colors.borderStrong;
        ctx.globalAlpha = 0.64;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plot.left + 8, railY);
        ctx.lineTo(plot.right - 8, railY);
        ctx.stroke();

        ctx.globalAlpha = 1;
        for (let i = 0; i <= markerCount; i += 1) {
            const day = startDay + Math.floor(((state.visibleDays - 1) * i) / markerCount);
            if (day > state.dayIndex) break;
            const x = snap(plot.left + (day - startDay) * slot + slot / 2);
            ctx.fillStyle = day === state.dayIndex ? colors.accent : colors.borderStrong;
            ctx.fillRect(x - 2, railY - 3, 4, 7);
        }

        const latestX = snap(plot.left + (state.dayIndex - startDay) * slot + slot / 2);
        ctx.fillStyle = colors.accent;
        ctx.fillRect(latestX - 4, railY - 5, 8, 11);
        ctx.restore();
    }

    function drawTradeMarker(ctx, type, x, y, colors) {
        const isBuy = type === 'buy';
        const color = isBuy ? colors.green : colors.red;
        const centerY = snap(y + (isBuy ? 22 : -22));
        const left = snap(x - 10);
        const top = centerY - 10;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.72;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(snap(x), snap(y + (isBuy ? 3 : -3)));
        ctx.lineTo(snap(x), centerY + (isBuy ? -10 : 10));
        ctx.stroke();
        ctx.globalAlpha = 1;

        drawHardBox(ctx, left, top, 20, 20, color, colors.bg, 3, colors.bg);
        ctx.fillStyle = colors.bg;
        ctx.font = `400 9px ${FONT_DISPLAY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isBuy ? 'B' : 'S', snap(x), centerY + 1);
        ctx.restore();
    }

    function drawLatestFocus(ctx, plot, x, colors) {
        const focusX = snap(x);
        ctx.save();
        ctx.fillStyle = colors.system;
        ctx.globalAlpha = 0.055;
        ctx.fillRect(Math.max(plot.left, focusX - 9), plot.top, 18, plot.height);
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = colors.system;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(focusX, plot.top);
        ctx.lineTo(focusX, plot.bottom - 19);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.system;
        ctx.fillRect(focusX - 5, snap(plot.top) - 1, 10, 4);
        ctx.restore();
    }

    function drawPriceBadge(ctx, plot, y, price, colors) {
        const label = Number(price).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        ctx.save();
        ctx.font = `700 12px ${FONT_UI}`;
        const width = Math.ceil(ctx.measureText(label).width) + 18;
        const height = 24;
        const x = Math.max(plot.left + 4, plot.right - width - 4);
        const top = clamp(y - height / 2, plot.top + 4, plot.bottom - height - 20);
        drawHardBox(ctx, x, top, width, height, colors.system, colors.bg, 3, colors.bg);
        ctx.fillStyle = colors.bg;
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, snap(x + width / 2), snap(top + height / 2) + 1);
        ctx.restore();
    }

    function drawCandles(ctx, state, plot, colors, startDay, minPrice, maxPrice) {
        const candleSlot = plot.width / state.visibleDays;
        const bodyWidth = clamp(candleSlot * 0.64, 3, 10);
        const range = Math.max(0.000001, maxPrice - minPrice);
        const innerBottom = plot.bottom - 20;
        const innerHeight = innerBottom - plot.top;
        const getY = (price) => innerBottom - ((price - minPrice) / range) * innerHeight;
        const latestDisplayIndex = state.dayIndex - startDay;
        const latestX = plot.left + latestDisplayIndex * candleSlot + candleSlot / 2;

        drawLatestFocus(ctx, plot, latestX, colors);

        for (let i = startDay; i <= state.dayIndex; i += 1) {
            const datum = state.currentData[i];
            if (!datum) continue;
            const displayIndex = i - startDay;
            const x = snap(plot.left + displayIndex * candleSlot + candleSlot / 2);
            const openY = snap(getY(datum.open));
            const closeY = snap(getY(datum.close));
            const highY = snap(getY(datum.high));
            const lowY = snap(getY(datum.low));
            const isUp = datum.close >= datum.open;
            const aShare = state.currentMarket === 'ashare';
            const upColor = aShare ? colors.red : colors.green;
            const downColor = aShare ? colors.green : colors.red;
            const color = isUp ? upColor : downColor;

            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.globalAlpha = i === state.dayIndex ? 1 : 0.9;
            ctx.lineWidth = i === state.dayIndex ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(x, highY);
            ctx.lineTo(x, lowY);
            ctx.stroke();

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(3, Math.abs(closeY - openY));
            ctx.fillRect(snap(x - bodyWidth / 2), bodyTop, Math.max(3, snap(bodyWidth)), bodyHeight);
            if (i === state.dayIndex) {
                ctx.strokeStyle = colors.text;
                ctx.globalAlpha = 0.72;
                ctx.lineWidth = 1;
                ctx.strokeRect(snap(x - bodyWidth / 2) - 1, bodyTop - 1, Math.max(3, snap(bodyWidth)) + 2, bodyHeight + 2);
            }
            ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = colors.system;
        ctx.globalAlpha = 0.52;
        ctx.setLineDash([4, 4]);
        const latest = state.currentData[state.dayIndex];
        if (latest) {
            const latestY = snap(getY(latest.close)) + 0.5;
            ctx.beginPath();
            ctx.moveTo(plot.left, latestY);
            ctx.lineTo(plot.right, latestY);
            ctx.stroke();
            drawPriceBadge(ctx, plot, latestY, latest.close, colors);
        }
        ctx.restore();

        state.actions.forEach((action) => {
            if (action.day < startDay || action.day > state.dayIndex) return;
            const displayIndex = action.day - startDay;
            const x = plot.left + displayIndex * candleSlot + candleSlot / 2;
            drawTradeMarker(ctx, action.type, x, getY(action.price), colors);
        });

        drawCheckpointRail(ctx, plot, state, startDay, colors);
    }

    function drawPixelAvatar(ctx, x, y, colors, isHolding) {
        ctx.save();
        const px = snap(x);
        const py = snap(y);

        if (isHolding) {
            ctx.fillStyle = colors.accent;
            ctx.fillRect(px - 10, py - 2, 4, 4);
            ctx.fillStyle = colors.red;
            ctx.fillRect(px - 14, py - 1, 4, 2);
        } else {
            ctx.fillStyle = colors.system;
            ctx.fillRect(px - 6, py - 10, 12, 3);
            ctx.fillRect(px - 4, py - 7, 8, 2);
        }

        ctx.fillStyle = isHolding ? colors.green : colors.surface;
        ctx.fillRect(px - 5, py - 5, 10, 10);
        drawHardBox(ctx, px - 5, py - 5, 10, 10, isHolding ? colors.green : colors.surface, colors.text, 2, colors.bg);

        ctx.fillStyle = colors.accent;
        ctx.fillRect(px + 1, py - 3, 3, 3);
        ctx.restore();
    }

    function drawPlayerCursor(ctx, x, y, value, colors, isHolding = false) {
        ctx.save();
        drawPixelAvatar(ctx, x, y, colors, isHolding);

        const label = Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
        ctx.font = `700 11px ${FONT_UI}`;
        const labelWidth = Math.ceil(ctx.measureText(label).width) + 12;
        const boxX = x - labelWidth - 14;
        const boxY = y - 12;
        drawHardBox(ctx, boxX, boxY, labelWidth, 22, colors.surface, isHolding ? colors.green : colors.accent, 3, colors.bg);
        ctx.fillStyle = isHolding ? colors.green : colors.accent;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, snap(boxX + labelWidth / 2), snap(boxY + 11) + 1);
        ctx.restore();
    }

    function drawReturnPlot(ctx, state, plot, colors, startDay) {
        if (!state.totalHistory || !state.totalHistory.length) return;
        const endDay = Math.min(state.dayIndex + 1, state.totalHistory.length);
        if (startDay >= endDay) return;

        let minTotal = state.levelStartCash;
        let maxTotal = state.levelStartCash;
        for (let i = startDay; i < endDay; i += 1) {
            const val = state.totalHistory[i];
            if (val < minTotal) minTotal = val;
            if (val > maxTotal) maxTotal = val;
        }

        const padding = (maxTotal - minTotal) * 0.16 || Math.max(50, state.levelStartCash * 0.01);
        minTotal -= padding;
        maxTotal += padding;
        const range = Math.max(0.000001, maxTotal - minTotal);
        const getY = (value) => plot.bottom - ((value - minTotal) / range) * plot.height;
        const slot = plot.width / state.visibleDays;

        const baselineY = snap(getY(state.levelStartCash)) + 0.5;
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
        ctx.lineWidth = 3;
        ctx.lineJoin = 'miter';
        ctx.lineCap = 'butt';
        ctx.beginPath();
        let previous = null;
        for (let i = startDay; i <= state.dayIndex; i += 1) {
            if (i >= state.totalHistory.length) continue;
            const displayIndex = i - startDay;
            const x = snap(plot.left + displayIndex * slot + slot / 2);
            const y = snap(getY(state.totalHistory[i]));
            if (!previous) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, previous.y);
                ctx.lineTo(x, y);
            }
            previous = { x, y };
        }
        if (previous) ctx.stroke();
        ctx.restore();

        const latestIndex = Math.min(state.dayIndex, state.totalHistory.length - 1);
        const latest = state.totalHistory[latestIndex];
        if (Number.isFinite(latest)) {
            const displayIndex = latestIndex - startDay;
            const x = snap(plot.left + displayIndex * slot + slot / 2);
            const y = snap(getY(latest));
            const isHolding = Array.isArray(state.actions) && state.actions.length > 0 && state.actions[state.actions.length - 1].type === 'buy';
            drawPlayerCursor(ctx, x, y, latest, colors, isHolding);
        }
    }

    function drawLevelStatus(ctx, state, colors, width, topInset) {
        const day = Math.min(state.dayIndex + 1, 250);
        const total = Math.max(1, state.currentData?.length || 250);
        const progress = clamp(day / total, 0, 1);
        const railWidth = clamp(width * 0.22, 120, 220);
        const railHeight = 8;
        const right = width - 16;
        const top = clamp(topInset - 34, 58, 98);
        const left = right - railWidth;

        ctx.save();
        ctx.font = `700 11px ${FONT_UI}`;
        ctx.fillStyle = colors.muted;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`DAY ${day} / ${total}`, right, top - 5);
        drawHardBox(ctx, left, top, railWidth, railHeight, colors.bg, colors.borderStrong, 0, colors.bg);
        const fillWidth = Math.max(2, snap((railWidth - 4) * progress));
        ctx.fillStyle = colors.system;
        ctx.fillRect(snap(left) + 2, snap(top) + 2, fillWidth, railHeight - 4);
        const checkpointCount = 4;
        ctx.fillStyle = colors.text;
        for (let i = 1; i < checkpointCount; i += 1) {
            const x = snap(left + (railWidth * i) / checkpointCount);
            ctx.fillRect(x, snap(top) - 2, 2, railHeight + 4);
        }
        ctx.restore();
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
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        if (!Array.isArray(currentData) || currentData.length === 0 || dayIndex < 0) return;

        const topInset = clamp(height * 0.17, 104, 142);
        const sideInset = clamp(width * 0.028, 10, 22);
        const returnHeight = clamp(height * 0.18, 86, 138);
        const bottomInset = clamp(height * 0.055, 22, 42);
        const dividerGap = 30;
        const priceBottom = Math.max(topInset + 90, height - bottomInset - returnHeight - dividerGap);

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
        drawStageFrame(ctx, pricePlot, colors);
        drawStageFrame(ctx, returnPlot, colors);
        drawSectionLabel(ctx, 'MARKET PRICE', pricePlot.left + 8, pricePlot.top - 22, colors);
        drawSectionLabel(ctx, 'PLAYER EQUITY', returnPlot.left + 8, returnPlot.top - 22, colors);
        drawLevelStatus(ctx, state, colors, width, topInset);

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
