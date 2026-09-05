import React, { useEffect, useRef } from 'react';

/**
 * PixelFluidBackground
 * 
 * High-performance, interactive, low-velocity pixel fluid simulation.
 * Features:
 * - Low velocity, hypnotic, ambient liquid drift
 * - Vibrant cyberpunk / neon color spectrum (Lime #00FF66, Cyan #00E5FF, Magenta #FF007F, Purple #9D00FF, Gold #FFB800)
 * - Chunky retro pixel grid aesthetics (customizable pixel size)
 * - Interactive mouse swirl, velocity wake, and click ripple shockwaves
 * - Seamless pointer-events-none overlay (zero disruption to buttons & links)
 * - Robust WebGL renderer with graceful 2D canvas fallback
 */
export const PixelFluidBackground = ({ pixelSize = 6 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId;
    let gl = null;

    // Try initializing WebGL
    try {
      gl = canvas.getContext('webgl', { alpha: false, depth: false, antialias: false, powerPreference: 'high-performance' }) ||
           canvas.getContext('experimental-webgl', { alpha: false, depth: false, antialias: false });
    } catch (e) {
      gl = null;
    }

    // Interactive state
    const mouse = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.5,
      vx: 0,
      vy: 0,
      speed: 0,
      lastMove: Date.now(),
    };

    // Ripples for click/tap
    const MAX_RIPPLES = 5;
    const ripples = Array.from({ length: MAX_RIPPLES }, () => ({
      x: 0,
      y: 0,
      age: 1.0, // 0 = new, 1 = dead
      active: false,
    }));

    let rippleIndex = 0;
    const triggerRipple = (x, y) => {
      ripples[rippleIndex] = {
        x,
        y: window.innerHeight - y, // flip Y for GL
        age: 0.01,
        active: true,
      };
      rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
    };

    // Window event listeners for seamless interaction across the entire screen
    const handleMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      const dx = x - mouse.targetX;
      const dy = y - mouse.targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      mouse.targetX = x;
      mouse.targetY = y;
      mouse.vx = mouse.vx * 0.6 + dx * 0.4;
      mouse.vy = mouse.vy * 0.6 + dy * 0.4;
      mouse.speed = Math.min(mouse.speed + dist * 0.04, 3.0);
      mouse.lastMove = Date.now();
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        handleMouseMove(e.touches[0]);
      }
    };

    const handlePointerDown = (e) => {
      triggerRipple(e.clientX, e.clientY);
      mouse.speed = Math.min(mouse.speed + 1.5, 3.5);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    // Handle Resize
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        if (gl) {
          gl.viewport(0, 0, canvas.width, canvas.height);
        }
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ==========================================
    // WEBGL SHADER IMPLEMENTATION
    // ==========================================
    if (gl) {
      const vsSource = `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      const fsSource = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform vec2 u_mouse_vel;
        uniform float u_mouse_speed;
        uniform float u_pixel_size;
        uniform vec3 u_ripples[5];

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187,
                              0.366025403784439,
                             -0.577350269189626,
                              0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
          m = m * m;
          m = m * m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
          vec3 g;
          g.x  = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        float fbm(vec2 p) {
          float f = 0.0;
          f += 0.5000 * snoise(p); p *= 2.02;
          f += 0.2500 * snoise(p); p *= 2.03;
          f += 0.1250 * snoise(p); p *= 2.01;
          f += 0.0625 * snoise(p);
          return f;
        }

        void main() {
          // Discrete pixel grid quantization
          vec2 pSize = vec2(u_pixel_size);
          vec2 pixelCoord = floor(gl_FragCoord.xy / pSize) * pSize;
          
          // Normalized aspect UV
          vec2 aspectUv = (pixelCoord - 0.5 * u_resolution.xy) / u_resolution.y;

          // Low-velocity ambient time
          float t = u_time * 0.12;

          // Mouse interaction field
          vec2 mouseAspect = (u_mouse - 0.5 * u_resolution.xy) / u_resolution.y;
          vec2 toMouse = aspectUv - mouseAspect;
          float mouseDist = length(toMouse);

          // Viscous swirling wake around mouse
          vec2 mouseSwirl = vec2(-toMouse.y, toMouse.x) * exp(-mouseDist * 5.0);
          vec2 mousePush = (u_mouse_vel / u_resolution.y) * exp(-mouseDist * 3.8) * 2.5;
          vec2 mouseInfluence = (mouseSwirl * 0.8 + mousePush) * min(u_mouse_speed * 0.7 + 0.15, 2.8);

          // Click ripple shockwaves
          float rippleDisplace = 0.0;
          for (int i = 0; i < 5; i++) {
            if (u_ripples[i].z > 0.0 && u_ripples[i].z < 1.0) {
              vec2 ripPos = (u_ripples[i].xy - 0.5 * u_resolution.xy) / u_resolution.y;
              float d = length(aspectUv - ripPos);
              float waveRadius = u_ripples[i].z * 0.85;
              float waveDist = abs(d - waveRadius);
              float wave = sin(waveDist * 35.0 - u_ripples[i].z * 16.0) * exp(-waveDist * 14.0);
              rippleDisplace += wave * (1.0 - u_ripples[i].z) * 0.25;
            }
          }

          // Flow domain coordinates
          vec2 flowUv = aspectUv * 2.2 + mouseInfluence * 0.3;

          // Domain Warping (Multi-stage fluid vorticity)
          vec2 q = vec2(
            fbm(flowUv + vec2(0.0, 0.0) + t * 0.65),
            fbm(flowUv + vec2(3.2, 1.7) + t * 0.5)
          );

          vec2 r = vec2(
            fbm(flowUv + 3.2 * q + vec2(1.7, 9.2) + t * 0.35 + rippleDisplace),
            fbm(flowUv + 3.2 * q + vec2(8.3, 2.8) - t * 0.4)
          );

          float f = fbm(flowUv + 3.5 * r + t * 0.2);

          // ==========================================
          // VIBRANT NEON / CYBERPUNK COLOR PALETTE
          // ==========================================
          vec3 bgCol    = vec3(0.03, 0.02, 0.07);  // Deep cosmic indigo
          vec3 lime     = vec3(0.00, 1.00, 0.40);  // Vibrant emerald / ApeBrokers Lime
          vec3 cyan     = vec3(0.00, 0.88, 1.00);  // Electric Cyan
          vec3 magenta  = vec3(1.00, 0.05, 0.55);  // Vivid Neon Magenta
          vec3 purple   = vec3(0.60, 0.00, 1.00);  // Cyber Violet
          vec3 gold     = vec3(1.00, 0.74, 0.00);  // Radiant Amber Gold

          // Dynamic fluid color mixing based on vorticity
          float fNorm = clamp((f + 0.45) * 0.95, 0.0, 1.0);
          float blend1 = smoothstep(0.12, 0.55, length(q));
          float blend2 = smoothstep(0.20, 0.75, length(r));
          float blend3 = smoothstep(0.35, 0.85, fNorm);

          vec3 fluidCol = mix(purple, magenta, sin(length(q) * 3.5 + t * 1.2) * 0.5 + 0.5);
          fluidCol = mix(fluidCol, cyan, blend1);
          fluidCol = mix(fluidCol, lime, blend2 * (sin(t * 0.7) * 0.3 + 0.7));
          fluidCol = mix(fluidCol, gold, pow(blend3, 2.6) * 0.95);

          // Interactive luminous cursor wake
          float mouseGlow = exp(-mouseDist * 3.5) * (u_mouse_speed * 0.45 + 0.25);
          fluidCol += mix(cyan, lime, sin(t * 2.5) * 0.5 + 0.5) * mouseGlow * 0.85;

          // Composite fluid ribbons over dark cosmic base
          vec3 finalColor = mix(bgCol, fluidCol, smoothstep(0.04, 0.68, fNorm * 1.15));

          // Retro pixel micro-grid bevel (subtle CRT / arcade phosphor pixel styling)
          vec2 grid = fract(gl_FragCoord.xy / pSize);
          float pixelBorder = step(0.07, grid.x) * step(0.07, grid.y);
          finalColor *= (0.86 + 0.14 * pixelBorder);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `;

      const createShader = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.warn('Shader compile error:', gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vs = createShader(gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
      if (!vs || !fs) return;

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn('Program link error:', gl.getProgramInfoLog(program));
        return;
      }

      gl.useProgram(program);

      // Full-screen quad
      const quadVertices = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

      const posAttr = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(posAttr);
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

      // Uniform locations
      const uRes = gl.getUniformLocation(program, 'u_resolution');
      const uTime = gl.getUniformLocation(program, 'u_time');
      const uMouse = gl.getUniformLocation(program, 'u_mouse');
      const uMouseVel = gl.getUniformLocation(program, 'u_mouse_vel');
      const uMouseSpeed = gl.getUniformLocation(program, 'u_mouse_speed');
      const uPixelSize = gl.getUniformLocation(program, 'u_pixel_size');
      const uRipples = gl.getUniformLocation(program, 'u_ripples');

      const startTime = performance.now();

      const render = () => {
        const now = performance.now();
        const elapsed = (now - startTime) * 0.001;

        // Smooth mouse follow & low-velocity decay
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
        mouse.vx *= 0.94;
        mouse.vy *= 0.94;
        mouse.speed *= 0.94;

        // Update ripples
        const rippleData = [];
        for (let i = 0; i < MAX_RIPPLES; i++) {
          if (ripples[i].active) {
            ripples[i].age += 0.016;
            if (ripples[i].age >= 1.0) {
              ripples[i].active = false;
            }
          }
          rippleData.push(
            ripples[i].x * (canvas.width / window.innerWidth),
            ripples[i].y * (canvas.height / window.innerHeight),
            ripples[i].active ? ripples[i].age : 0.0
          );
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, elapsed);
        gl.uniform2f(uMouse, mouse.x * dpr, (window.innerHeight - mouse.y) * dpr);
        gl.uniform2f(uMouseVel, mouse.vx * dpr, -mouse.vy * dpr);
        gl.uniform1f(uMouseSpeed, mouse.speed);
        gl.uniform1f(uPixelSize, Math.max(pixelSize * dpr, 4.0));
        gl.uniform3fv(uRipples, new Float32Array(rippleData));

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        animationFrameId = requestAnimationFrame(render);
      };

      render();

    } else {
      // ==========================================
      // 2D CANVAS FALLBACK (Low-res pixel grid)
      // ==========================================
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const startTime = performance.now();

      const renderFallback = () => {
        const elapsed = (performance.now() - startTime) * 0.001 * 0.25;
        const w = canvas.width;
        const h = canvas.height;
        const gridStep = Math.max(pixelSize * 2, 12);

        ctx.fillStyle = '#060412';
        ctx.fillRect(0, 0, w, h);

        for (let x = 0; x < w; x += gridStep) {
          for (let y = 0; y < h; y += gridStep) {
            const nx = x / w;
            const ny = y / h;
            const wave = Math.sin(nx * 4 + elapsed) + Math.cos(ny * 4 - elapsed * 0.8);
            const distToMouse = Math.hypot(x - mouse.x, y - mouse.y);
            const mouseBoost = Math.max(0, 1 - distToMouse / 220);

            const v = Math.sin(wave * 2.0 + mouseBoost * 3.0) * 0.5 + 0.5;

            if (v > 0.35) {
              const r = Math.floor(v * 180 * (1 - mouseBoost) + mouseBoost * 0);
              const g = Math.floor(v * 255);
              const b = Math.floor(v * 200 + mouseBoost * 255);
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${v * 0.7})`;
              ctx.fillRect(x, y, gridStep - 1, gridStep - 1);
            }
          }
        }

        animationFrameId = requestAnimationFrame(renderFallback);
      };

      renderFallback();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [pixelSize]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none -z-10"
      style={{
        imageRendering: 'pixelated',
      }}
    />
  );
};
