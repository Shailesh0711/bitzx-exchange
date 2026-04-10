import { useEffect, useRef } from 'react';

/**
 * Animated canvas starfield:
 *  – Twinkling stars (white + gold-tinted)
 *  – Glowing halos on larger stars
 *  – Pulsing nebula clouds (gold / blue)
 *  – Occasional shooting-star streaks
 *  – Floating dust particles drifting upward
 */
export default function StarCanvas({ style = {} }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W = 0, H = 0;

    /* ── Resize ─────────────────────────────────────────────────────── */
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ── Stars ──────────────────────────────────────────────────────── */
    const STAR_COUNT = 320;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x:     Math.random(),          // 0-1 relative
      y:     Math.random(),
      r:     Math.random() * 1.8 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.006 + 0.002,
      gold:  Math.random() > 0.78,   // ~22% gold-tinted
    }));

    /* ── Dust particles ─────────────────────────────────────────────── */
    const DUST_COUNT = 60;
    const dust = Array.from({ length: DUST_COUNT }, () => ({
      x:  Math.random(),
      y:  Math.random(),
      r:  Math.random() * 1.0 + 0.2,
      vy: -(Math.random() * 0.08 + 0.03), // drift upward
      vx: (Math.random() - 0.5) * 0.04,
      op: Math.random() * 0.3 + 0.05,
    }));

    /* ── Shooting stars pool ─────────────────────────────────────────── */
    const shooters = [];
    let lastShoot = 0;
    function spawnShooter() {
      shooters.push({
        x:   Math.random() * 0.65,    // relative
        y:   Math.random() * 0.45,
        vx:  (5 + Math.random() * 5) / W,
        vy:  (1.5 + Math.random() * 3) / H,
        len: 130 + Math.random() * 90,
        op:  1,
        fade: 0.016 + Math.random() * 0.01,
      });
    }

    /* ── Nebula definitions ─────────────────────────────────────────── */
    const nebulas = [
      { rx: 0.62, ry: 0.18, rr: 0.40, rgb: '156,121,65',  baseOp: 0.10, pulse: 0.03 },
      { rx: 0.05, ry: 0.72, rr: 0.28, rgb: '96,165,250',  baseOp: 0.06, pulse: 0.02 },
      { rx: 0.50, ry: 0.55, rr: 0.32, rgb: '167,139,250', baseOp: 0.04, pulse: 0.015 },
      { rx: 0.85, ry: 0.85, rr: 0.22, rgb: '156,121,65',  baseOp: 0.05, pulse: 0.02 },
    ];

    /* ── Main draw loop ─────────────────────────────────────────────── */
    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      /* — Nebula glows — */
      nebulas.forEach((n, ni) => {
        const op = n.baseOp + Math.sin(t * 0.008 + ni * 1.3) * n.pulse;
        const cx = n.rx * W, cy = n.ry * H, cr = n.rr * Math.max(W, H);
        const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        g.addColorStop(0,   `rgba(${n.rgb},${op.toFixed(3)})`);
        g.addColorStop(0.5, `rgba(${n.rgb},${(op * 0.4).toFixed(3)})`);
        g.addColorStop(1,   `rgba(${n.rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      });

      /* — Stars — */
      stars.forEach(s => {
        const op  = 0.25 + 0.75 * Math.abs(Math.sin(t * s.speed + s.phase));
        const sx  = s.x * W;
        const sy  = s.y * H;
        const rgb = s.gold ? '235,211,141' : '220,230,255';

        // Glow halo for bigger stars
        if (s.r > 1.2) {
          const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 5);
          halo.addColorStop(0, `rgba(${rgb},${(op * 0.25).toFixed(3)})`);
          halo.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(sx, sy, s.r * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${op.toFixed(3)})`;
        ctx.fill();

        // Cross sparkle on very bright large stars
        if (s.r > 1.5 && op > 0.85) {
          ctx.strokeStyle = `rgba(${rgb},${(op * 0.5).toFixed(3)})`;
          ctx.lineWidth   = 0.5;
          const len = s.r * 4;
          ctx.beginPath();
          ctx.moveTo(sx - len, sy); ctx.lineTo(sx + len, sy);
          ctx.moveTo(sx, sy - len); ctx.lineTo(sx, sy + len);
          ctx.stroke();
        }
      });

      /* — Dust particles drifting upward — */
      dust.forEach(d => {
        d.x += d.vx / W;
        d.y += d.vy / H;
        if (d.y < 0)   d.y = 1;
        if (d.x < 0)   d.x = 1;
        if (d.x > 1)   d.x = 0;

        ctx.beginPath();
        ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235,211,141,${d.op.toFixed(3)})`;
        ctx.fill();
      });

      /* — Shooting stars — */
      for (let i = shooters.length - 1; i >= 0; i--) {
        const ss = shooters[i];
        const sx = ss.x * W, sy = ss.y * H;
        const ex = sx - ss.vx * ss.len * W, ey = sy - ss.vy * ss.len * H;

        const grad = ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0,   `rgba(255,245,220,${ss.op.toFixed(3)})`);
        grad.addColorStop(0.3, `rgba(235,211,141,${(ss.op * 0.5).toFixed(3)})`);
        grad.addColorStop(1,   'rgba(235,211,141,0)');

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 1.6;
        ctx.lineCap     = 'round';
        ctx.stroke();

        // Bright head dot
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${ss.op.toFixed(3)})`;
        ctx.fill();

        ss.x  += ss.vx;
        ss.y  += ss.vy;
        ss.op -= ss.fade;
        if (ss.op <= 0 || ss.x > 1.1 || ss.y > 1.1) shooters.splice(i, 1);
      }

      /* — Spawn shooting star — */
      if (t - lastShoot > 160 + Math.random() * 200) {
        spawnShooter();
        lastShoot = t;
      }

      t++;
      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'block',
        ...style,
      }}
    />
  );
}
