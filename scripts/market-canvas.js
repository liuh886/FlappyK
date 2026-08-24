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

    // ---------- Feedback FX (hard-edged pixel particles, zero-allocation pool) ----------
    const PARTICLE_POOL = 64;
    const PARTICLE_FIELDS = 6; // x, y, vx, vy, life, maxLife
    const particleData = new Float32Array(PARTICLE_POOL * PARTICLE_FIELDS);
    const particleKind = new Uint8Array(PARTICLE_POOL);
    let particleWrite = 0;
    let lastFrameAt = 0;
    let reducedMotionQuery = null;

    const BURST_SLOTS = 8;
    const pendingBursts = new Array(BURST_SLOTS).fill(null);
    let burstCursor = 0;

    function prefersReducedMotion() {
        if (!reducedMotionQuery) {
            reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
        }
        return Boolean(reducedMotionQuery?.matches);
    }

    function spawnParticle(kind, x, y, vx, vy, life) {
        const base = particleWrite * PARTICLE_FIELDS;
        particleData[base] = x;
        particleData[base + 1] = y;
        particleData[base + 2] = vx;
        particleData[base + 3] = vy;
        particleData[base + 4] = life;
        particleData[base + 5] = life;
        particleKind[particleWrite] = kind;
        particleWrite = (particleWrite + 1) % PARTICLE_POOL;
    }

    function spawnBurst(kind, x, y) {
        if (prefersReducedMotion()) return;
        const colorKey = kind === 'sell' ? 1 : kind === 'checkpoint' ? 3 : 0;
        const count = kind === 'checkpoint' ? 14 : 9;
        for (let i = 0; i < count; i += 1) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 40 + Math.random() * 70;
            spawnParticle(
                colorKey,
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - (kind === 'buy' ? 60 : 20),
                0.34 + Math.random() * 0.16,
            );
        }
    }

    function requestBurst(kind) {
        if (kind !== 'buy' && kind !== 'sell' && kind !== 'checkpoint') return;
        pendingBursts[burstCursor] = kind;
        burstCursor = (burstCursor + 1) % BURST_SLOTS;
    }

    function stepParticles(dt) {
        for (let i = 0; i < PARTICLE_POOL; i += 1) {
            const base = i * PARTICLE_FIELDS;
            if (particleData[base + 4] <= 0) continue;
            particleData[base + 4] -= dt;
            particleData[base] += particleData[base + 2] * dt;
            particleData[base + 1] += particleData[base + 3] * dt;
            particleData[base + 3] += 190 * dt;
        }
    }

    // ---------- Ambient atmosphere: skin-scoped backdrop, behind game objects ----------
    const AMBIENT_POOL = 28;
    const AMBIENT_FIELDS = 4; // x, y, vy, phase
    const ambientData = new Float32Array(AMBIENT_POOL * AMBIENT_FIELDS);
    let ambientKind = '';
    let ambientSeeded = false;
    // Weather weight mirrors the published leading/losing state (cosmetic only).
    let ambientIntensity = 1;

    // World state shared by scenery layers. It mirrors values the HUD already
    // publishes (run progress, leading/losing) so every skin can react without
    // opening a new information channel or touching game rules.
    let worldProgress = 0;
    let worldLeading = null;
    let flareUntil = 0;

    function readWorldMood(state) {
        const total = Math.max(1, state.currentData?.length || 250);
        const progress = clamp((state.dayIndex + 1) / total, 0, 1);
        let leading = null;
        const startPrice = Number(state.currentData?.[0]?.close);
        const price = Number(state.currentData?.[state.dayIndex]?.close);
        const equity = Number(state.totalHistory?.[Math.min(state.dayIndex, (state.totalHistory?.length || 1) - 1)]);
        const baseCash = Number(state.levelStartCash);
        if (Number.isFinite(startPrice) && startPrice > 0
            && Number.isFinite(price)
            && Number.isFinite(equity)
            && Number.isFinite(baseCash) && baseCash > 0) {
            leading = (equity - baseCash) / baseCash >= (price - startPrice) / startPrice;
        }
        return { progress, leading };
    }

    function flarePulse(now, step = 140) {
        if (now >= flareUntil) return 0;
        return Math.floor((flareUntil - now) / step) % 2 ? 1 : 0;
    }

    // Checkpoint celebration: a skin-flavored volley in the sky band.
    function triggerSkinFlare(now, skinId, width, height) {
        flareUntil = now + 1500;
        if (prefersReducedMotion()) return;
        const volley = (originX, originY, primary, secondary) => {
            for (let i = 0; i < 14; i += 1) {
                const angle = (Math.PI * 2 * i) / 14 + (i % 3) * 0.21;
                const speed = 46 + (i % 4) * 26;
                spawnParticle(
                    i % 2 ? secondary : primary,
                    originX,
                    originY,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed - 30,
                    0.5 + (i % 5) * 0.09,
                );
            }
        };
        if (skinId === 'polar') {
            volley(width * 0.3, height * 0.2, 2, 0);
            volley(width * 0.72, height * 0.26, 0, 2);
        } else if (skinId === 'amber') {
            volley(width * 0.78, height * 0.2, 3, 1);
        } else {
            volley(width * 0.28, height * 0.18, 3, 2);
            volley(width * 0.66, height * 0.24, 2, 3);
            volley(width * 0.47, height * 0.15, 0, 3);
        }
    }

    function seedAmbient(kind, width, height) {
        for (let i = 0; i < AMBIENT_POOL; i += 1) {
            const base = i * AMBIENT_FIELDS;
            ambientData[base] = Math.random() * width;
            ambientData[base + 1] = Math.random() * height;
            ambientData[base + 2] = kind === 'snow' ? 16 + Math.random() * 18 : -(5 + Math.random() * 9);
            ambientData[base + 3] = Math.random() * Math.PI * 2;
        }
        ambientSeeded = true;
    }

    function drawAmbient(ctx, colors, kind, width, height, dt, now) {
        if (kind !== 'snow' && kind !== 'dust') return;
        if (prefersReducedMotion()) return;
        if (kind !== ambientKind || !ambientSeeded) {
            ambientKind = kind;
            seedAmbient(kind, width, height);
        }

        ctx.save();
        ctx.fillStyle = kind === 'snow' ? colors.system : colors.accent;
        for (let i = 0; i < AMBIENT_POOL; i += 1) {
            const base = i * AMBIENT_FIELDS;
            let x = ambientData[base];
            let y = ambientData[base + 1];
            y += ambientData[base + 2] * dt;
            x += Math.sin(now / (kind === 'snow' ? 900 : 1300) + ambientData[base + 3]) * 9 * dt;
            if (y > height + 2) y = -2;
            if (y < -2) y = height + 2;
            if (x < -2) x = width + 2;
            if (x > width + 2) x = -2;
            ambientData[base] = x;
            ambientData[base + 1] = y;

            const depthPhase = Math.sin(now / 700 + ambientData[base + 3]);
            const baseAlpha = kind === 'snow'
                ? (depthPhase > 0 ? 0.42 : 0.22)
                : (depthPhase > 0 ? 0.26 : 0.12);
            ctx.globalAlpha = Math.min(0.6, baseAlpha * ambientIntensity);
            if (kind === 'snow') {
                ctx.fillRect(snap(x), snap(y), depthPhase > 0 ? 2 : 1, 2);
            } else {
                ctx.fillRect(snap(x), snap(y), 2, 1);
            }
        }
        ctx.restore();
    }

    function drawParticles(ctx, colors) {
        const swatches = [colors.green, colors.red, colors.system, colors.accent];
        const skinId = window.FlappyKSkins?.getActive?.() || 'arcade';
        ctx.save();
        for (let i = 0; i < PARTICLE_POOL; i += 1) {
            const base = i * PARTICLE_FIELDS;
            const life = particleData[base + 4];
            if (life <= 0) continue;
            const ratio = life / particleData[base + 5];
            ctx.globalAlpha = ratio > 0.66 ? 1 : ratio > 0.33 ? 0.62 : 0.28;
            ctx.fillStyle = swatches[particleKind[i]];
            const px = snap(particleData[base]);
            const py = snap(particleData[base + 1]);
            const size = ratio > 0.5 ? 4 : 3;
            if (skinId === 'polar') {
                // Snowflake cross: hard-edged plus sign.
                ctx.fillRect(px, py + 1, size, size - 2);
                ctx.fillRect(px + 1, py, size - 2, size);
            } else if (skinId === 'amber') {
                // Sand spark: streak with a bright core.
                ctx.fillRect(px - 1, py + 1, size + 2, 2);
                ctx.fillRect(px + 1, py, 2, size);
            } else {
                ctx.fillRect(px, py, size, size);
            }
        }
        ctx.restore();
    }

    // ---------- Backdrop scenery: deterministic per-skin silhouettes ----------
    // Every layer is seeded once per (skin, size) so frames stay stable, drawn
    // with hard-edged rects only, and sit strictly behind plot chrome.
    const STAR_POOL = 96;
    const STAR_FIELDS = 4; // x, y, phase, size
    const starData = new Float32Array(STAR_POOL * STAR_FIELDS);
    const CLOUD_POOL = 3;
    const CLOUD_FIELDS = 4; // x0, y, width, speed
    const cloudData = new Float32Array(CLOUD_POOL * CLOUD_FIELDS);
    let skylineFar = [];
    let skylineNear = [];
    let ridgeHeights = [];
    let dunePhases = [0, 1.7];
    let sceneryKey = '';

    function mulberry32(seed) {
        let state = seed >>> 0;
        return () => {
            state = (state + 0x6D2B79F5) >>> 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hash01(index, salt) {
        const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
        return value - Math.floor(value);
    }

    function buildSkyline(rand, width, maxHeight, gapChance) {
        const blocks = [];
        let x = -12;
        while (x < width + 12) {
            const blockWidth = 14 + Math.floor(rand() * 26);
            const blockHeight = Math.floor(maxHeight * (0.35 + rand() * 0.65));
            blocks.push({ x, w: blockWidth, h: blockHeight });
            x += blockWidth + (rand() < gapChance ? 4 + Math.floor(rand() * 8) : 0);
        }
        return blocks;
    }

    function ensureScenery(kind, width, height) {
        const key = `${kind}:${width}x${height}`;
        if (key === sceneryKey) return;
        sceneryKey = key;

        const rand = mulberry32(0x5EED);
        for (let i = 0; i < STAR_POOL; i += 1) {
            const base = i * STAR_FIELDS;
            starData[base] = rand() * width;
            starData[base + 1] = rand() * height * 0.6;
            starData[base + 2] = rand() * Math.PI * 2;
            starData[base + 3] = rand() < 0.24 ? 2 : 1;
        }
        skylineFar = buildSkyline(rand, width, clamp(height * 0.14, 60, 128), 0.3);
        skylineNear = buildSkyline(rand, width, clamp(height * 0.1, 42, 92), 0.16);

        ridgeHeights = [];
        for (let x = 0; x <= width + 26; x += 26) {
            ridgeHeights.push(Math.floor(clamp(height * 0.04, 16, 34) + rand() * clamp(height * 0.08, 20, 52)));
        }

        dunePhases = [rand() * Math.PI * 2, rand() * Math.PI * 2];

        for (let i = 0; i < CLOUD_POOL; i += 1) {
            const base = i * CLOUD_FIELDS;
            cloudData[base] = rand() * width;
            cloudData[base + 1] = height * (0.06 + rand() * 0.16);
            cloudData[base + 2] = 26 + rand() * 22;
            cloudData[base + 3] = 4 + rand() * 6;
        }
    }

    function drawStarfield(ctx, colors, width, height, now, isStatic) {
        // Stars fade toward dusk as the 250-day run matures.
        const duskDim = 1 - worldProgress * 0.45;
        ctx.save();
        ctx.fillStyle = colors.text;
        for (let i = 0; i < STAR_POOL; i += 1) {
            const base = i * STAR_FIELDS;
            const x = starData[base];
            const y = starData[base + 1];
            if (x > width || y > height) continue;
            const twinkle = (isStatic
                ? 0.3
                : 0.2 + 0.26 * (0.5 + 0.5 * Math.sin(now / 650 + starData[base + 2]))) * duskDim;
            ctx.globalAlpha = twinkle;
            const size = starData[base + 3];
            ctx.fillRect(snap(x), snap(y), size, size);
        }
        ctx.restore();
    }

    function drawClouds(ctx, colors, width, height, now, isStatic) {
        ctx.save();
        ctx.fillStyle = colors.raised;
        for (let i = 0; i < CLOUD_POOL; i += 1) {
            const base = i * CLOUD_FIELDS;
            const cloudWidth = cloudData[base + 2];
            const speed = cloudData[base + 3];
            const travel = isStatic ? 0 : (now / 1000) * speed;
            const x = ((cloudData[base] + travel) % (width + cloudWidth * 2)) - cloudWidth;
            const y = cloudData[base + 1];
            ctx.globalAlpha = 0.26;
            ctx.fillRect(snap(x), snap(y), snap(cloudWidth), 4);
            ctx.fillRect(snap(x + cloudWidth * 0.16), snap(y - 3), snap(cloudWidth * 0.62), 3);
            ctx.fillRect(snap(x + cloudWidth * 0.34), snap(y + 4), snap(cloudWidth * 0.44), 3);
        }
        ctx.restore();
    }

    function drawSkyline(ctx, colors, height, now) {
        const drawBlocks = (blocks, fill, alpha) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = fill;
            for (const block of blocks) {
                ctx.fillRect(snap(block.x), snap(height - block.h), snap(block.w), block.h + 2);
            }
            ctx.restore();
        };
        drawBlocks(skylineFar, colors.surface, 0.6);
        drawBlocks(skylineNear, colors.raised, 0.85);

        // The city wakes up as the run matures: the window lit-threshold drops
        // with progress, windows burn gold while leading and cool while behind.
        const litThreshold = 0.74 - worldProgress * 0.4 - (flarePulse(now) ? 0.5 : 0);
        const windowColor = worldLeading === false ? colors.muted : colors.accent;
        ctx.save();
        ctx.fillStyle = windowColor;
        for (let b = 0; b < skylineNear.length; b += 1) {
            const block = skylineNear[b];
            const cols = Math.max(1, Math.floor(block.w / 9));
            const rows = Math.max(1, Math.floor(block.h / 12));
            for (let c = 0; c < cols; c += 1) {
                for (let r = 0; r < rows; r += 1) {
                    const seedRoll = hash01(b * 97 + c * 13 + r, 3);
                    if (seedRoll < litThreshold) continue;
                    const blink = (now / 1600 + hash01(b * 41 + c, 7) * 4) % 2;
                    ctx.globalAlpha = flarePulse(now)
                        ? 0.6
                        : (blink > 0.24 ? 0.34 : 0.1);
                    ctx.fillRect(
                        snap(block.x + 4 + c * 9),
                        snap(height - block.h + 5 + r * 12),
                        2,
                        3,
                    );
                }
            }
        }
        ctx.restore();
    }

    function drawAurora(ctx, colors, width, height, now, isStatic) {
        // Aurora swells with run progress, burns bright while leading, and
        // dims to an ember while the market is ahead.
        const flare = flarePulse(now);
        const vigor = (0.5 + worldProgress * 0.7)
            * (worldLeading === false ? 0.5 : worldLeading === true ? 1.3 : 1)
            * (flare ? 1.9 : 1);
        ctx.save();
        ctx.fillStyle = colors.system;
        const columns = Math.ceil(width / 12) + 1;
        for (let ribbon = 0; ribbon < 3; ribbon += 1) {
            const baseY = height * (0.08 + ribbon * 0.06);
            for (let c = 0; c < columns; c += 1) {
                const x = c * 12;
                const drift = isStatic ? 0 : now / (1500 + ribbon * 400);
                const wave =
                    Math.sin(x * 0.016 + drift + ribbon * 2.1) * 10
                    + Math.sin(x * 0.005 - drift * 0.6 + ribbon) * 6;
                const length = (26 + Math.sin(x * 0.011 + drift * 1.4 + ribbon * 1.3) * 14)
                    * (worldLeading === true ? 1.3 : 1);
                const shimmer = (isStatic
                    ? 0.05
                    : 0.04 + 0.025 * Math.sin(drift * 2 + c * 0.45)) * vigor;
                ctx.globalAlpha = Math.max(0.015, Math.min(0.3, shimmer));
                ctx.fillRect(snap(x), snap(baseY + wave), 10, snap(length));
            }
        }
        if (flare) {
            // Checkpoint flash: one hard-edged horizon band.
            ctx.globalAlpha = 0.09;
            ctx.fillRect(0, snap(height * 0.1), snap(width), 8);
        }
        ctx.restore();
    }

    function drawIceRidge(ctx, colors, width, height, now) {
        const baseY = height;
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = colors.surface;
        ctx.beginPath();
        ctx.moveTo(-2, baseY + 2);
        for (let i = 0; i < ridgeHeights.length; i += 1) {
            ctx.lineTo(snap(i * 26), snap(baseY - ridgeHeights[i]));
        }
        ctx.lineTo(width + 2, baseY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = flarePulse(now) ? 0.9 : 0.5;
        ctx.strokeStyle = colors.borderStrong;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2, snap(baseY - ridgeHeights[0]));
        for (let i = 1; i < ridgeHeights.length; i += 1) {
            ctx.lineTo(snap(i * 26), snap(baseY - ridgeHeights[i]));
        }
        ctx.stroke();
        ctx.restore();
    }

    function drawPixelSun(ctx, colors, width, height, now, isStatic) {
        // The sun arcs across the sky with the 250-day run: sunrise at day 1,
        // zenith mid-run, sunset at day 250. Pulses on checkpoints, dims
        // while the market is ahead.
        const radius = clamp(height * 0.055, 24, 42)
            * (flarePulse(now) ? 1.18 : 1);
        const progress = isStatic ? Math.max(worldProgress, 0.001) : worldProgress;
        const cx = width * (0.14 + 0.72 * progress);
        const cy = height * (0.36 - Math.sin(clamp(progress, 0, 1) * Math.PI) * 0.13);
        const alpha = (worldLeading === false ? 0.1 : 0.16) * (flarePulse(now) ? 1.7 : 1);
        ctx.save();
        ctx.globalAlpha = Math.min(0.3, alpha);
        ctx.fillStyle = colors.accent;
        for (let dy = -radius; dy <= radius; dy += 3) {
            const half = Math.sqrt(Math.max(0, radius * radius - dy * dy));
            ctx.fillRect(snap(cx - half), snap(cy + dy), snap(half * 2), 3);
        }
        // Horizon glow bar under the sun position (hard-edged, stepped).
        ctx.globalAlpha = Math.min(0.2, alpha * 0.8);
        ctx.fillRect(snap(cx - radius * 1.6), snap(cy + radius + 6), snap(radius * 3.2), 3);
        ctx.restore();
    }

    function drawDunes(ctx, colors, width, height, now, isStatic) {
        const layers = [
            { amp: clamp(height * 0.028, 12, 22), wave: 190, alpha: 0.55, fill: colors.surface, y: 0.86 },
            { amp: clamp(height * 0.04, 16, 30), wave: 260, alpha: 0.85, fill: colors.raised, y: 0.93 },
        ];
        ctx.save();
        for (let l = 0; l < layers.length; l += 1) {
            const layer = layers[l];
            const drift = isStatic ? 0 : Math.sin(now / 2600 + l) * 6;
            ctx.globalAlpha = layer.alpha;
            ctx.fillStyle = layer.fill;
            ctx.beginPath();
            ctx.moveTo(-2, height + 2);
            for (let x = -2; x <= width + 2; x += 8) {
                const y = height * layer.y
                    + Math.sin((x + drift * (l + 1)) / layer.wave * Math.PI * 2 + dunePhases[l]) * layer.amp;
                ctx.lineTo(snap(x), snap(y));
            }
            ctx.lineTo(width + 2, height + 2);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    function drawBackdrop(ctx, colors, kind, width, height, now) {
        if (!Number.isFinite(width) || !Number.isFinite(height) || width < 40 || height < 40) return;
        ensureScenery(kind, width, height);
        const isStatic = prefersReducedMotion();

        if (kind === 'polar') {
            drawAurora(ctx, colors, width, height, now, isStatic);
            drawIceRidge(ctx, colors, width, height, now);
        } else if (kind === 'amber') {
            drawPixelSun(ctx, colors, width, height, now, isStatic);
            drawDunes(ctx, colors, width, height, now, isStatic);
        } else {
            drawStarfield(ctx, colors, width, height, now, isStatic);
            drawClouds(ctx, colors, width, height, now, isStatic);
            drawSkyline(ctx, colors, height, now);
        }
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

    function drawStageFrame(ctx, plot, colors, skinId = 'arcade') {
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

        // Skin chrome trim along the shared hard frame.
        ctx.fillStyle = skinId === 'amber' ? colors.accent : colors.system;
        if (skinId === 'polar') {
            // Frost ticks hanging from the top edge.
            ctx.globalAlpha = 0.35;
            for (let x = plot.left + 20; x < plot.right - 8; x += 28) {
                ctx.fillRect(snap(x), snap(plot.top) + 2, 2, 4);
            }
        } else if (skinId === 'amber') {
            // Brass rivets at corners and edge midpoints.
            ctx.globalAlpha = 0.45;
            const midX = snap((plot.left + plot.right) / 2);
            const midY = snap((plot.top + plot.bottom) / 2);
            for (const [rx, ry] of [
                [plot.left + 4, plot.top + 4], [plot.right - 6, plot.top + 4],
                [plot.left + 4, plot.bottom - 6], [plot.right - 6, plot.bottom - 6],
                [midX, plot.top + 4], [midX, plot.bottom - 6],
                [plot.left + 4, midY], [plot.right - 6, midY],
            ]) {
                ctx.fillRect(snap(rx), snap(ry), 2, 2);
            }
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
            if (i === state.dayIndex && !prefersReducedMotion()) {
                // Stepped two-frame breathing keeps the latest candle alive between ticks.
                const pulseStep = Math.floor((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 280) % 2;
                ctx.globalAlpha = pulseStep ? 1 : 0.72;
            } else {
                ctx.globalAlpha = i === state.dayIndex ? 1 : 0.9;
            }
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

    function drawPixelAvatar(ctx, x, y, colors, isHolding, frame = 0) {
        ctx.save();
        const px = snap(x);
        const py = snap(y);
        const skinId = window.FlappyKSkins?.getActive?.() || 'arcade';

        if (isHolding) {
            // Thruster: two-frame exhaust flicker, shaped per skin.
            const flameLength = frame ? 6 : 3;
            ctx.fillStyle = colors.accent;
            ctx.fillRect(px - 10, py - 2, 4, 4);
            ctx.fillStyle = colors.red;
            ctx.fillRect(px - 10 - flameLength, py - 1, flameLength, 2);
            if (!frame) {
                ctx.fillRect(px - 13, py - 2, 2, 1);
                ctx.fillRect(px - 13, py + 1, 2, 1);
            }
        } else if (skinId === 'amber') {
            // Scarab hover jets: two stepped exhausts under the shell.
            if (!prefersReducedMotion()) {
                ctx.fillStyle = colors.system;
                ctx.globalAlpha = frame ? 0.7 : 0.4;
                ctx.fillRect(px - 4, py + 6, 2, frame ? 3 : 2);
                ctx.fillRect(px + 2, py + 6, 2, frame ? 2 : 3);
                ctx.globalAlpha = 1;
            }
        } else {
            // Glider: two-frame wing flap.
            if (frame) {
                ctx.fillStyle = colors.system;
                ctx.fillRect(px - 8, py - 11, 16, 3);
            } else {
                ctx.fillStyle = colors.system;
                ctx.fillRect(px - 6, py - 9, 12, 3);
                ctx.fillRect(px - 8, py - 11, 4, 2);
                ctx.fillRect(px + 4, py - 11, 4, 2);
            }
        }

        ctx.fillStyle = isHolding ? colors.green : colors.surface;
        ctx.fillRect(px - 5, py - 5, 10, 10);
        drawHardBox(ctx, px - 5, py - 5, 10, 10, isHolding ? colors.green : colors.surface, colors.text, 2, colors.bg);

        // Skin identities stay inside the 10x10 silhouette plus small trim.
        if (skinId === 'polar') {
            // Penguin: goggle band with dark lenses, white belly, scarf tail
            // that flutters between two frames, and accent feet.
            ctx.fillStyle = colors.text;
            ctx.fillRect(px - 2, py - 1, 4, 6);
            ctx.fillStyle = colors.system;
            ctx.fillRect(px - 5, py - 4, 10, 3);
            ctx.fillStyle = colors.bg;
            ctx.fillRect(px - 3, py - 4, 2, 3);
            ctx.fillRect(px + 1, py - 4, 2, 3);
            ctx.fillStyle = colors.accent;
            ctx.fillRect(px - 5, py + 2, 10, 2);
            ctx.fillRect(px + 5, py + 4, frame ? 3 : 5, 2);
            ctx.fillRect(px - 4, py + 5, 3, 1);
            ctx.fillRect(px + 1, py + 5, 3, 1);
        } else if (skinId === 'amber') {
            // Scarab: visor beam, chest core, and a wing shimmer line.
            ctx.fillStyle = colors.accent;
            ctx.fillRect(px - 4, py - 7, 8, 2);
            ctx.fillRect(px - 2, py - 1, 3, 3);
            ctx.globalAlpha = frame ? 0.55 : 0.3;
            ctx.fillRect(px - 5, py - 6, 10, 1);
            ctx.globalAlpha = 1;
        } else {
            // Market Arcade bird: accent eye plus a two-step beak.
            ctx.fillStyle = colors.accent;
            ctx.fillRect(px + 1, py - 3, 3, 3);
            ctx.fillRect(px + 5, py - 1, 3, 2);
            ctx.fillRect(px + 5, py + 1, 2, 1);
        }
        ctx.restore();
    }

    function drawPlayerCursor(ctx, x, y, value, colors, isHolding = false, bob = 0) {
        ctx.save();
        const frame = prefersReducedMotion()
            ? 0
            : Math.floor((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 240) % 2;
        drawPixelAvatar(ctx, x, y + bob, colors, isHolding, frame);

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
            const bob = prefersReducedMotion() ? 0 : (Math.floor((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 320) % 2 ? -2 : 0);
            drawPlayerCursor(ctx, x, y, latest, colors, isHolding, bob);
        }
    }

    let lastDrawnDay = -1;

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

        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        let frameDt = (now - lastFrameAt) / 1000;
        if (!Number.isFinite(frameDt) || frameDt <= 0 || frameDt > 0.25) frameDt = 0.016;
        lastFrameAt = now;

        const colors = palette();
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // Skin backdrop scenery + atmosphere sit behind every game object.
        const skinId = window.FlappyKSkins?.getActive?.() || 'arcade';
        const atmosphereKind = window.FlappyKSkins?.getActiveSkin?.()?.atmosphere || 'none';
        const world = readWorldMood(state);
        worldProgress = world.progress;
        worldLeading = world.leading;
        // Weather weight mirrors the published leading/losing state only.
        ambientIntensity = worldLeading === false ? 1.35 : flarePulse(now) ? 1.15 : 1;
        drawBackdrop(ctx, colors, skinId, width, height, now);
        drawAmbient(ctx, colors, atmosphereKind, width, height, frameDt, now);

        if (!Array.isArray(currentData) || currentData.length === 0 || dayIndex < 0) return;

        const topInset = height >= 560
            ? clamp(height * 0.14, 122, 150)
            : clamp(height * 0.28, 108, 150);
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
        drawStageFrame(ctx, pricePlot, colors, skinId);
        drawStageFrame(ctx, returnPlot, colors, skinId);
        drawSectionLabel(ctx, 'MARKET PRICE', pricePlot.left + 8, pricePlot.top + 11, colors);
        drawSectionLabel(ctx, 'PLAYER EQUITY', returnPlot.left + 8, returnPlot.top + 11, colors);

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

        // Feedback FX: drain queued bursts at the current-day marker position.
        stepParticles(frameDt);
        for (let i = 0; i < BURST_SLOTS; i += 1) {
            const kind = pendingBursts[i];
            if (!kind) continue;
            pendingBursts[i] = null;
            const slot = pricePlot.width / state.visibleDays;
            const x = snap(pricePlot.left + (dayIndex - startDay) * slot + slot / 2);
            const datum = currentData[dayIndex];
            if (kind === 'checkpoint') {
                spawnBurst(kind, x, snap(pricePlot.bottom - 13));
            } else {
                const range = Math.max(0.000001, maxPrice - minPrice);
                const y = snap(pricePlot.bottom - 20 - ((datum.close - minPrice) / range) * (pricePlot.height - 20));
                spawnBurst(kind, x, y);
            }
        }
        // Milestone flash every CHECKPOINT_DAYS days of the run.
        const CHECKPOINT_DAYS = 50;
        if (lastDrawnDay >= 0 && dayIndex > lastDrawnDay && Math.floor(dayIndex / CHECKPOINT_DAYS) > Math.floor(lastDrawnDay / CHECKPOINT_DAYS)) {
            requestBurst('checkpoint');
            triggerSkinFlare(now, skinId, width, height);
        }
        lastDrawnDay = dayIndex === 0 ? 0 : dayIndex;
        drawParticles(ctx, colors);
    }

    window.FlappyKMarketCanvas = Object.freeze({ draw, requestBurst, refreshPalette });
})();
