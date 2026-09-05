import React, { useEffect, useRef } from 'react';

/**
 * PixelFluidBackground
 *
 * Real Navier-Stokes Eulerian Grid Interactive Pixel Fluid Simulation.
 * - Low-velocity, hypnotic ambient drift
 * - Vibrant neon cyber colors (Lime #00FF66, Cyan #00E5FF, Magenta #FF007F, Purple #9D00FF, Gold #FFB800)
 * - Chunky retro pixel cells (each cell is a simulated physical fluid pixel!)
 * - High interactivity: user stirs, pushes, and paints luminous swirling vortices
 * - Click/Tap explosive ripple shockwaves
 * - 60 FPS locked on CPU TypedArrays with zero WebGL dependencies or context-loss risks
 * - Pointer-events-none so all buttons, inputs, and links remain 100% interactive
 */
export const PixelFluidBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Simulation Grid Dimensions (Chunky retro pixels)
    // 140x80 gives a 16:9 ratio and ~8-12px size per pixel block
    const isMobile = window.innerWidth < 768;
    const NX = isMobile ? 80 : 136;
    const NY = isMobile ? 120 : 76;
    const size = (NX + 2) * (NY + 2);

    canvas.width = NX;
    canvas.height = NY;

    const IX = (x, y) => x + y * (NX + 2);

    // Fluid fields
    const u = new Float32Array(size); // velocity X
    const v = new Float32Array(size); // velocity Y
    const u_prev = new Float32Array(size);
    const v_prev = new Float32Array(size);

    // Vibrant Dye fields (RGB)
    const densR = new Float32Array(size);
    const densG = new Float32Array(size);
    const densB = new Float32Array(size);
    const densR_prev = new Float32Array(size);
    const densG_prev = new Float32Array(size);
    const densB_prev = new Float32Array(size);

    // Vibrant Neon Palette for dynamic interaction
    const PALETTE = [
      { r: 0, g: 255, b: 102 },   // ApeBrokers Neon Lime (#00FF66)
      { r: 0, g: 235, b: 255 },   // Electric Cyan (#00E5FF)
      { r: 255, g: 0, b: 140 },   // Vivid Neon Magenta (#FF008C)
      { r: 160, g: 0, b: 255 },   // Cyber Violet (#A000FF)
      { r: 255, g: 195, b: 0 },   // Radiant Gold (#FFC300)
    ];

    let colorPhase = 0;

    const getCurrentColor = () => {
      const idx = Math.floor(colorPhase) % PALETTE.length;
      const nextIdx = (idx + 1) % PALETTE.length;
      const frac = colorPhase - Math.floor(colorPhase);

      const c1 = PALETTE[idx];
      const c2 = PALETTE[nextIdx];

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

    // Advection (Transporting quantities along velocity field)
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

    // Mass conservation & pressure projection (creates realistic fluid vortices)
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

      // 3. Dye diffusion & advection
      diffuse(0, densR_prev, densR, 0.00005, dt);
      diffuse(0, densG_prev, densG, 0.00005, dt);
      diffuse(0, densB_prev, densB, 0.00005, dt);

      advect(0, densR, densR_prev, u, v, dt);
      advect(0, densG, densG_prev, u, v, dt);
      advect(0, densB, densB_prev, u, v, dt);

      // 4. Low-velocity dissipation (fade over ~4 seconds, keep velocity calm)
      for (let i = 0; i < size; i++) {
        densR[i] *= 0.985;
        densG[i] *= 0.985;
        densB[i] *= 0.985;
        u[i] *= 0.978;
        v[i] *= 0.978;
      }
    };

    // Function to inject fluid dye and velocity into grid cells
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

              u[idx] += velX * falloff * 0.35;
              v[idx] += velY * falloff * 0.35;

              densR[idx] = Math.min(255, densR[idx] + color.r * falloff * 0.85);
              densG[idx] = Math.min(255, densG[idx] + color.g * falloff * 0.85);
              densB[idx] = Math.min(255, densB[idx] + color.b * falloff * 0.85);
            }
          }
        }
      }
    };

    // Interaction handling
    const pointer = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
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
        colorPhase += dist * 0.015;
        const color = getCurrentColor();

        const velX = (dx / window.innerWidth) * NX * 2.2;
        const velY = (dy / window.innerHeight) * NY * 2.2;

        // Interpolate along line segment so rapid mouse flicks paint a continuous fluid stream
        const steps = Math.min(16, Math.max(1, Math.ceil(Math.hypot(currGX - prevGX, currGY - prevGY) * 1.5)));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const gx = Math.round(prevGX + (currGX - prevGX) * t);
          const gy = Math.round(prevGY + (currGY - prevGY) * t);
          injectFluid(gx, gy, velX, velY, color, isMobile ? 2 : 3, 1.2);
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

      colorPhase += 0.8;
      const color = getCurrentColor();

      // Radial blast of velocity + bright neon burst
      const burstRadius = isMobile ? 4 : 6;
      for (let dy = -burstRadius; dy <= burstRadius; dy++) {
        for (let dx = -burstRadius; dx <= burstRadius; dx++) {
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist <= burstRadius) {
            const radAngle = Math.atan2(dy, dx);
            const force = (1 - dist / (burstRadius + 1)) * 3.5;
            injectFluid(
              gx + dx,
              gy + dy,
              Math.cos(radAngle) * force,
              Math.sin(radAngle) * force,
              color,
              2,
              1.8
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

    // Main animation & simulation loop
    const loop = () => {
      frame++;

      // ========================================================
      // AMBIENT LOW-VELOCITY DRIFT (Hypnotic, slow liquid motion)
      // ========================================================
      const t = frame * 0.016; // Low velocity time scale

      // Gentle ambient source 1: Swirling Emerald/Cyan breeze from bottom-left
      const p1x = Math.floor(NX * 0.25 + Math.cos(t * 0.5) * (NX * 0.12));
      const p1y = Math.floor(NY * 0.70 + Math.sin(t * 0.6) * (NY * 0.10));
      injectFluid(
        p1x,
        p1y,
        Math.cos(t * 0.8) * 0.45,
        -Math.abs(Math.sin(t * 0.7)) * 0.5,
        { r: 0, g: 255, b: 110 },
        isMobile ? 2 : 3,
        0.18
      );

      // Gentle ambient source 2: Swirling Magenta/Violet breeze from top-right
      const p2x = Math.floor(NX * 0.75 + Math.sin(t * 0.5) * (NX * 0.12));
      const p2y = Math.floor(NY * 0.30 + Math.cos(t * 0.6) * (NY * 0.10));
      injectFluid(
        p2x,
        p2y,
        -Math.abs(Math.cos(t * 0.7)) * 0.45,
        Math.sin(t * 0.8) * 0.45,
        { r: 210, g: 0, b: 240 },
        isMobile ? 2 : 3,
        0.16
      );

      // Gentle ambient source 3: Warm Gold/Cyan slow wave in center
      const p3x = Math.floor(NX * 0.50 + Math.sin(t * 0.4) * (NX * 0.18));
      const p3y = Math.floor(NY * 0.50 + Math.cos(t * 0.3) * (NY * 0.12));
      injectFluid(
        p3x,
        p3y,
        Math.cos(t * 0.5) * 0.35,
        Math.sin(t * 0.5) * 0.35,
        { r: 0, g: 220, b: 255 },
        isMobile ? 2 : 3,
        0.14
      );

      // Step physics
      fluidStep(0.12);

      // Render to Pixel Buffer with Synthwave Twilight Sky Gradient
      let pixelIdx = 0;
      for (let j = 1; j <= NY; j++) {
        const row = j * (NX + 2);
        // Vertical gradient: deep purple at top, vibrant sunset glow near bottom-middle
        const vGrad = j / NY;
        const horizon = Math.exp(-Math.pow((vGrad - 0.65) * 4.0, 2.0));
        const baseR = Math.floor(14 + horizon * 32);
        const baseG = Math.floor(8 + horizon * 8);
        const baseB = Math.floor(28 + horizon * 22);

        for (let i = 1; i <= NX; i++) {
          const idx = row + i;
          const rDye = densR[idx];
          const gDye = densG[idx];
          const bDye = densB[idx];

          // Blend fluid over synthwave sunset sky
          const r = Math.min(255, baseR + rDye);
          const g = Math.min(255, baseG + gDye);
          const b = Math.min(255, baseB + bDye);

          // Little bit of luminance boost for neon vibrancy
          const lum = (rDye * 0.299 + gDye * 0.587 + bDye * 0.114);
          const bloom = lum > 130 ? (lum - 130) * 0.45 : 0;

          const finalR = Math.min(255, r + bloom);
          const finalG = Math.min(255, g + bloom);
          const finalB = Math.min(255, b + bloom);

          // Little ABGR byte packing for 32-bit direct canvas write
          data32[pixelIdx++] = (255 << 24) | (finalB << 16) | (finalG << 8) | finalR;
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
    <div className="fixed inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden bg-[#060411]">
      {/* Real Interactive Pixel Fluid Simulation Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="w-full h-full object-cover select-none"
        style={{
          imageRendering: 'pixelated', // Crisp retro pixel blocks
        }}
      />
      {/* Subtle CRT Phosphor Scanline Overlay for authentic retro pixel aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,38,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] pointer-events-none opacity-45" />
    </div>
  );
};
