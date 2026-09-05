import React, { useEffect, useRef } from 'react';

/**
 * PixelFluidBackground
 *
 * Real Navier-Stokes Eulerian Grid Interactive Pixel Fluid Simulation.
 * VIBRANT LIGHT COLOR THEME:
 * - Radiant, bright, illuminated synthwave sunrise/neon sky base
 * - Swirling vibrant neon dyes (Electric Pink #FF2A8D, Cyber Cyan #00E5FF, Neon Lime #00FF66, Solar Gold #FFC700, Lilac #B845FF)
 * - True physical fluid advection & diffusion at low velocity
 * - Interactive cursor stirring, wake streaks, and click ripple shockwaves
 * - Chunky retro pixel rendering (image-rendering: pixelated)
 * - Zero dimming overlays; placed at z-0 so it is 100% visible behind the UI cards
 */
export const PixelFluidBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Simulation Grid (Chunky retro pixels)
    const isMobile = window.innerWidth < 768;
    const NX = isMobile ? 84 : 144;
    const NY = isMobile ? 124 : 80;
    const size = (NX + 2) * (NY + 2);

    canvas.width = NX;
    canvas.height = NY;

    const IX = (x, y) => x + y * (NX + 2);

    // Fluid velocity fields
    const u = new Float32Array(size); // velocity X
    const v = new Float32Array(size); // velocity Y
    const u_prev = new Float32Array(size);
    const v_prev = new Float32Array(size);

    // Color fields (RGB) - Initialized with vibrant light gradient
    const densR = new Float32Array(size);
    const densG = new Float32Array(size);
    const densB = new Float32Array(size);
    const densR_prev = new Float32Array(size);
    const densG_prev = new Float32Array(size);
    const densB_prev = new Float32Array(size);

    // Function to calculate vibrant light base color at (x, y) with low-velocity time
    const getAmbientBaseColor = (i, j, t) => {
      const uGrad = i / NX;
      const vGrad = j / NY;

      // Multi-frequency gentle ambient wave
      const w1 = Math.sin(uGrad * 3.0 + vGrad * 2.0 + t);
      const w2 = Math.cos(uGrad * 2.0 - vGrad * 3.0 - t * 0.7);
      const w3 = Math.sin((uGrad + vGrad) * 2.5 + t * 0.5);

      // Radiant color interpolation (bright, saturated, vibrant light colors)
      // Top: Electric Sky Cyan & Lilac
      // Middle: Vibrant Neon Coral-Pink
      // Bottom: Sunny Gold & Electric Lime
      const r1 = 255;
      const g1 = Math.floor(70 + (w1 * 0.5 + 0.5) * 110);
      const b1 = Math.floor(160 + (w2 * 0.5 + 0.5) * 95);

      const r2 = Math.floor(40 + (w2 * 0.5 + 0.5) * 120);
      const g2 = Math.floor(215 + (w3 * 0.5 + 0.5) * 40);
      const b2 = 255;

      const r3 = Math.floor(255 * (1 - vGrad * 0.4) + 40 * (vGrad * 0.4));
      const g3 = Math.floor(220 * (1 - uGrad * 0.3) + 90 * (uGrad * 0.3));
      const b3 = Math.floor(70 + (w1 * 0.5 + 0.5) * 120);

      // Blend based on coordinates
      const blend = (w1 + w2 + w3) / 3.0 * 0.5 + 0.5;
      const r = Math.min(255, Math.floor(r1 * (1 - vGrad) * blend + r2 * vGrad * (1 - blend) + r3 * blend * 0.5));
      const g = Math.min(255, Math.floor(g1 * (1 - uGrad) * 0.5 + g2 * uGrad * 0.7 + g3 * blend * 0.4));
      const b = Math.min(255, Math.floor(b1 * (1 - vGrad) * 0.7 + b2 * vGrad * 0.8 + b3 * 0.2));

      return {
        r: Math.max(120, r), // Keep baseline bright and vibrant
        g: Math.max(120, g),
        b: Math.max(140, b),
      };
    };

    // Populate initial vibrant light field
    for (let j = 1; j <= NY; j++) {
      for (let i = 1; i <= NX; i++) {
        const col = getAmbientBaseColor(i, j, 0);
        const idx = IX(i, j);
        densR[idx] = col.r;
        densG[idx] = col.g;
        densB[idx] = col.b;
      }
    }

    // Dynamic Saturated Neon Dye Palette for Cursor Injection
    const DYE_PALETTE = [
      { r: 255, g: 20, b: 147 },   // Deep Neon Pink (#FF1493)
      { r: 0, g: 240, b: 255 },     // Electric Cyan (#00F0FF)
      { r: 0, g: 255, b: 102 },     // Vibrant Lime (#00FF66)
      { r: 255, g: 195, b: 0 },     // Radiant Gold (#FFC300)
      { r: 175, g: 45, b: 255 },    // Cyber Violet (#AF2DFF)
      { r: 255, g: 80, b: 50 },     // Neon Tangerine (#FF5032)
    ];

    let colorPhase = 0;

    const getCurrentDyeColor = () => {
      const idx = Math.floor(colorPhase) % DYE_PALETTE.length;
      const nextIdx = (idx + 1) % DYE_PALETTE.length;
      const frac = colorPhase - Math.floor(colorPhase);

      const c1 = DYE_PALETTE[idx];
      const c2 = DYE_PALETTE[nextIdx];

      return {
        r: c1.r + (c2.r - c1.r) * frac,
        g: c1.g + (c2.g - c1.g) * frac,
        b: c1.b + (c2.b - c1.b) * frac,
      };
    };

    // Boundary conditions
    const setBnd = (b, x) => {
      for (let i = 1; i <= NX; i++) {
        x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
        x[IX(i, NY + 1)] = b === 2 ? -x[IX(i, NY)] : x[IX(i, NY)];
      }
      for (let j = 1; j <= NY; j++) {
        x[IX(0, j)] = b === 1 ? -x[IX(1, j)] : x[IX(1, j)];
        x[IX(NX + 1, j)] = b === 1 ? -x[IX(NX, j)] : x[IX(NX, j)];
      }
      x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
      x[IX(0, NY + 1)] = 0.5 * (x[IX(1, NY + 1)] + x[IX(0, NY)]);
      x[IX(NX + 1, 0)] = 0.5 * (x[IX(NX, 0)] + x[IX(NX + 1, 1)]);
      x[IX(NX + 1, NY + 1)] = 0.5 * (x[IX(NX, NY + 1)] + x[IX(NX + 1, NY)]);
    };

    // Linear solver (Gauss-Seidel relaxation)
    const linSolve = (b, x, x0, a, c) => {
      for (let k = 0; k < 4; k++) {
        for (let j = 1; j <= NY; j++) {
          const row = j * (NX + 2);
          for (let i = 1; i <= NX; i++) {
            const idx = row + i;
            x[idx] = (x0[idx] + a * (x[idx - 1] + x[idx + 1] + x[idx - (NX + 2)] + x[idx + (NX + 2)])) / c;
          }
        }
        setBnd(b, x);
      }
    };

    // Diffusion
    const diffuse = (b, x, x0, diff, dt) => {
      const a = dt * diff * NX * NY;
      linSolve(b, x, x0, a, 1 + 4 * a);
    };

    // Advection (Transporting colors and velocities along fluid flow)
    const advect = (b, d, d0, uField, vField, dt) => {
      const dt0X = dt * NX;
      const dt0Y = dt * NY;

      for (let j = 1; j <= NY; j++) {
        const row = j * (NX + 2);
        for (let i = 1; i <= NX; i++) {
          const idx = row + i;
          let x = i - dt0X * uField[idx];
          let y = j - dt0Y * vField[idx];

          if (x < 0.5) x = 0.5;
          if (x > NX + 0.5) x = NX + 0.5;
          const i0 = Math.floor(x);
          const i1 = i0 + 1;

          if (y < 0.5) y = 0.5;
          if (y > NY + 0.5) y = NY + 0.5;
          const j0 = Math.floor(y);
          const j1 = j0 + 1;

          const s1 = x - i0;
          const s0 = 1 - s1;
          const t1 = y - j0;
          const t0 = 1 - t1;

          d[idx] =
            s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
            s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
        }
      }
      setBnd(b, d);
    };

    // Mass conservation & pressure projection
    const project = (uField, vField, p, div) => {
      for (let j = 1; j <= NY; j++) {
        const row = j * (NX + 2);
        for (let i = 1; i <= NX; i++) {
          const idx = row + i;
          div[idx] =
            (-0.5 *
              (uField[idx + 1] - uField[idx - 1] + vField[idx + (NX + 2)] - vField[idx - (NX + 2)])) /
            Math.sqrt(NX * NY);
          p[idx] = 0;
        }
      }
      setBnd(0, div);
      setBnd(0, p);

      linSolve(0, p, div, 1, 4);

      for (let j = 1; j <= NY; j++) {
        const row = j * (NX + 2);
        for (let i = 1; i <= NX; i++) {
          const idx = row + i;
          uField[idx] -= 0.5 * (p[idx + 1] - p[idx - 1]) * NX;
          vField[idx] -= 0.5 * (p[idx + (NX + 2)] - p[idx - (NX + 2)]) * NY;
        }
      }
      setBnd(1, uField);
      setBnd(2, vField);
    };

    // Fluid step
    const fluidStep = (dt) => {
      // 1. Velocity diffusion & projection
      diffuse(1, u_prev, u, 0.0001, dt);
      diffuse(2, v_prev, v, 0.0001, dt);
      project(u_prev, v_prev, u, v);

      // 2. Velocity advection & projection
      advect(1, u, u_prev, u_prev, v_prev, dt);
      advect(2, v, v_prev, u_prev, v_prev, dt);
      project(u, v, u_prev, v_prev);

      // 3. Color field diffusion & advection
      diffuse(0, densR_prev, densR, 0.00008, dt);
      diffuse(0, densG_prev, densG, 0.00008, dt);
      diffuse(0, densB_prev, densB, 0.00008, dt);

      advect(0, densR, densR_prev, u, v, dt);
      advect(0, densG, densG_prev, u, v, dt);
      advect(0, densB, densB_prev, u, v, dt);

      // 4. Low-velocity dissipation
      for (let i = 0; i < size; i++) {
        u[i] *= 0.982;
        v[i] *= 0.982;
      }
    };

    // Inject velocity and dye
    const injectFluid = (gridX, gridY, velX, velY, color, radius = 2, intensity = 1.0) => {
      const rad = Math.max(1, radius);
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const gx = gridX + dx;
          const gy = gridY + dy;
          if (gx >= 1 && gx <= NX && gy >= 1 && gy <= NY) {
            const distSq = dx * dx + dy * dy;
            if (distSq <= rad * rad) {
              const falloff = (1 - Math.sqrt(distSq) / (rad + 1)) * intensity;
              const idx = IX(gx, gy);

              u[idx] += velX * falloff * 0.4;
              v[idx] += velY * falloff * 0.4;

              // Blend injected vibrant dye with current color
              const blend = falloff * 0.65;
              densR[idx] = densR[idx] * (1 - blend) + color.r * blend;
              densG[idx] = densG[idx] * (1 - blend) + color.g * blend;
              densB[idx] = densB[idx] * (1 - blend) + color.b * blend;
            }
          }
        }
      }
    };

    // Interaction handling
    const pointer = {
      prevX: window.innerWidth * 0.5,
      prevY: window.innerHeight * 0.5,
      hasMoved: false,
    };

    const handlePointerMove = (clientX, clientY) => {
      const currGX = Math.floor((clientX / window.innerWidth) * NX);
      const currGY = Math.floor((clientY / window.innerHeight) * NY);

      if (!pointer.hasMoved) {
        pointer.prevX = clientX;
        pointer.prevY = clientY;
        pointer.hasMoved = true;
        return;
      }

      const prevGX = Math.floor((pointer.prevX / window.innerWidth) * NX);
      const prevGY = Math.floor((pointer.prevY / window.innerHeight) * NY);

      const dx = clientX - pointer.prevX;
      const dy = clientY - pointer.prevY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        // Cycle colors smoothly along mouse strokes
        colorPhase += dist * 0.02;
        const color = getCurrentDyeColor();

        const velX = (dx / window.innerWidth) * NX * 2.8;
        const velY = (dy / window.innerHeight) * NY * 2.8;

        // Interpolate along stroke
        const steps = Math.min(18, Math.max(1, Math.ceil(Math.hypot(currGX - prevGX, currGY - prevGY) * 1.5)));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const gx = Math.round(prevGX + (currGX - prevGX) * t);
          const gy = Math.round(prevGY + (currGY - prevGY) * t);
          injectFluid(gx, gy, velX, velY, color, isMobile ? 3 : 4, 1.4);
        }
      }

      pointer.prevX = clientX;
      pointer.prevY = clientY;
    };

    const onMouseMove = (e) => handlePointerMove(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    // Explosive ripple shockwave on click / tap
    const onPointerDown = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : window.innerWidth * 0.5);
      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : window.innerHeight * 0.5);

      const gx = Math.floor((clientX / window.innerWidth) * NX);
      const gy = Math.floor((clientY / window.innerHeight) * NY);

      colorPhase += 1.2;
      const color = getCurrentDyeColor();

      const burstRadius = isMobile ? 6 : 8;
      for (let dy = -burstRadius; dy <= burstRadius; dy++) {
        for (let dx = -burstRadius; dx <= burstRadius; dx++) {
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist <= burstRadius) {
            const radAngle = Math.atan2(dy, dx);
            const force = (1 - dist / (burstRadius + 1)) * 4.2;
            injectFluid(
              gx + dx,
              gy + dy,
              Math.cos(radAngle) * force,
              Math.sin(radAngle) * force,
              color,
              3,
              2.0
            );
          }
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    // ImageData buffer for fast pixel rendering
    const imgData = ctx.createImageData(NX, NY);
    const data32 = new Uint32Array(imgData.data.buffer);

    let animationId;
    let frame = 0;

    // Main animation loop
    const loop = () => {
      frame++;
      const t = frame * 0.012; // Low velocity ambient time

      // ========================================================
      // AMBIENT LOW-VELOCITY STIRRING (Hypnotic, slow liquid motion)
      // ========================================================
      // Gentle ambient vortex 1: Neon Magenta / Coral wave
      const p1x = Math.floor(NX * 0.28 + Math.cos(t * 0.6) * (NX * 0.16));
      const p1y = Math.floor(NY * 0.35 + Math.sin(t * 0.7) * (NY * 0.14));
      injectFluid(
        p1x,
        p1y,
        Math.cos(t * 0.7) * 0.5,
        Math.sin(t * 0.7) * 0.5,
        { r: 255, g: 40, b: 150 },
        isMobile ? 3 : 5,
        0.18
      );

      // Gentle ambient vortex 2: Electric Sky Cyan wave
      const p2x = Math.floor(NX * 0.72 + Math.sin(t * 0.5) * (NX * 0.18));
      const p2y = Math.floor(NY * 0.65 + Math.cos(t * 0.6) * (NY * 0.14));
      injectFluid(
        p2x,
        p2y,
        -Math.sin(t * 0.8) * 0.5,
        Math.cos(t * 0.8) * 0.5,
        { r: 0, g: 235, b: 255 },
        isMobile ? 3 : 5,
        0.16
      );

      // Gentle ambient vortex 3: Solar Gold / Lime wave
      const p3x = Math.floor(NX * 0.50 + Math.sin(t * 0.4) * (NX * 0.20));
      const p3y = Math.floor(NY * 0.50 + Math.cos(t * 0.3) * (NY * 0.16));
      injectFluid(
        p3x,
        p3y,
        Math.cos(t * 0.5) * 0.4,
        -Math.sin(t * 0.5) * 0.4,
        { r: 255, g: 215, b: 20 },
        isMobile ? 3 : 5,
        0.15
      );

      // Step physical fluid advection & diffusion
      fluidStep(0.12);

      // Gently relax color field toward vibrant light ambient base
      // (ensures screen stays bright, vibrant, and luminous indefinitely)
      const relaxRate = 0.012;
      for (let j = 1; j <= NY; j++) {
        for (let i = 1; i <= NX; i++) {
          const idx = IX(i, j);
          const target = getAmbientBaseColor(i, j, t);
          densR[idx] += (target.r - densR[idx]) * relaxRate;
          densG[idx] += (target.g - densG[idx]) * relaxRate;
          densB[idx] += (target.b - densB[idx]) * relaxRate;
        }
      }

      // Direct write to pixel canvas
      let pixelIdx = 0;
      for (let j = 1; j <= NY; j++) {
        const row = j * (NX + 2);
        for (let i = 1; i <= NX; i++) {
          const idx = row + i;

          const r = Math.min(255, Math.max(0, Math.floor(densR[idx])));
          const g = Math.min(255, Math.max(0, Math.floor(densG[idx])));
          const b = Math.min(255, Math.max(0, Math.floor(densB[idx])));

          // ABGR byte packing for 32-bit fast canvas copy
          data32[pixelIdx++] = (255 << 24) | (b << 16) | (g << 8) | r;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      {/* Real Interactive Vibrant Light Pixel Fluid Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="w-full h-full object-cover select-none"
        style={{
          imageRendering: 'pixelated', // Chunky retro pixel blocks
        }}
      />
      {/* Subtle Retro CRT scanline texture (soft opacity so vibrant light colors shine brightly) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_50%,rgba(0,0,0,0.08)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />
    </div>
  );
};
