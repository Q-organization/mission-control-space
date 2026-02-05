import { useEffect, useRef, useState } from 'react';

interface WarpStar {
  x: number;
  y: number;
  z: number;
  prevZ: number;
  speed: number;
  brightness: number;
}

interface WarpTransitionProps {
  assetsReady: boolean;
  onComplete: () => void;
}

const STAR_COUNT = 400;
const MIN_DURATION = 2000;
const FADE_DURATION = 500;

export function WarpTransition({ assetsReady, onComplete }: WarpTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<WarpStar[]>([]);
  const startTimeRef = useRef(Date.now());
  const [fading, setFading] = useState(false);
  const fadingRef = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = assetsReady;
  }, [assetsReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize stars
    const stars: WarpStar[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.8 + 0.1;
      stars.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        z: Math.random() * 1000 + 200,
        prevZ: 1200,
        speed: Math.random() * 2 + 3,
        brightness: Math.random() * 0.5 + 0.5,
      });
    }
    starsRef.current = stars;

    const startTime = Date.now();
    startTimeRef.current = startTime;

    const render = () => {
      const elapsed = Date.now() - startTime;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Decelerate from cruising into a gentle drift
      const progress = Math.min(elapsed / MIN_DURATION, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const warpSpeed = 10 - eased * 6; // 10 → 4
      const streakLength = 0.5 - eased * 0.3;

      // Clear - cleaner as it slows
      ctx.fillStyle = `rgba(6, 6, 16, ${0.2 + eased * 0.15})`;
      ctx.fillRect(0, 0, w, h);

      // Update and draw stars
      for (const star of stars) {
        star.prevZ = star.z;
        star.z -= star.speed * warpSpeed;

        if (star.z <= 1) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 0.8 + 0.1;
          star.x = Math.cos(angle) * dist;
          star.y = Math.sin(angle) * dist;
          star.z = 800 + Math.random() * 400;
          star.prevZ = star.z;
          star.brightness = Math.random() * 0.5 + 0.5;
          continue;
        }

        // Project to screen
        const scale = 600 / star.z;
        const sx = cx + star.x * w * scale;
        const sy = cy + star.y * h * scale;

        // Previous position for streak
        const prevScale = 600 / (star.z + star.speed * warpSpeed * streakLength);
        const px = cx + star.x * w * prevScale;
        const py = cy + star.y * h * prevScale;

        if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;

        const depthAlpha = Math.min(1, (1000 - star.z) / 600);
        const alpha = depthAlpha * star.brightness;

        // Cool palette: white and blue-violet only
        const hue = 210 + star.brightness * 40; // 210-250 (blue to indigo)
        const sat = 50 + star.brightness * 30;
        const light = 65 + depthAlpha * 30;

        const lineWidth = Math.max(0.5, scale * 1.5);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (depthAlpha > 0.5) {
          ctx.beginPath();
          ctx.arc(sx, sy, lineWidth * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 30%, 95%, ${alpha * 0.7})`;
          ctx.fill();
        }
      }

      // Subtle deep blue center glow
      const glowAlpha = 0.05;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.35);
      gradient.addColorStop(0, `rgba(30, 60, 120, ${glowAlpha})`);
      gradient.addColorStop(0.6, `rgba(15, 25, 60, ${glowAlpha * 0.3})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Trigger fade once assets ready + minimum time elapsed
      if (readyRef.current && elapsed >= MIN_DURATION && !fadingRef.current) {
        fadingRef.current = true;
        setFading(true);
        setTimeout(onComplete, FADE_DURATION);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        background: '#060610',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-out`,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    />
  );
}
