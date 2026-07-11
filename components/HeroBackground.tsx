import React, { useEffect, useRef } from 'react';

interface Shape {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  alpha: number;
  type: 0 | 1 | 2;
  pulseOffset: number;
}

const HeroBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const shapes = useRef<Shape[]>([]);
  const raf = useRef(0);
  const tick = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    shapes.current = Array.from({ length: 32 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.003,
      size: Math.random() * 38 + 8,
      alpha: Math.random() * 0.28 + 0.04,
      type: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    const drawDiamond = (s: number) => {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.65, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.65, 0);
      ctx.closePath();
    };

    const drawHex = (s: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0
          ? ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s)
          : ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      }
      ctx.closePath();
    };

    const drawSquare = (s: number) => {
      ctx.beginPath();
      const h = s * 0.7;
      ctx.rect(-h / 2, -h / 2, h, h);
    };

    const animate = () => {
      tick.current++;
      ctx.clearRect(0, 0, W, H);
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const t = tick.current * 0.01;

      for (const p of shapes.current) {
        const dx = p.x - mx, dy = p.y - my;
        const d = Math.hypot(dx, dy);
        if (d < 200 && d > 0) {
          const f = ((200 - d) / 200) * 0.07;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }

        p.vx *= 0.986;
        p.vy *= 0.986;
        const spd = Math.hypot(p.vx, p.vy);
        if (spd > 1.4) { p.vx = (p.vx / spd) * 1.4; p.vy = (p.vy / spd) * 1.4; }

        p.x += p.vx; p.y += p.vy; p.rotation += p.rotSpeed;
        if (p.x < -70) p.x = W + 70;
        if (p.x > W + 70) p.x = -70;
        if (p.y < -70) p.y = H + 70;
        if (p.y > H + 70) p.y = -70;

        const pulse = 1 + Math.sin(t + p.pulseOffset) * 0.15;
        const drawAlpha = p.alpha * pulse;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = drawAlpha;

        if (p.type === 0) drawDiamond(p.size);
        else if (p.type === 1) drawHex(p.size);
        else drawSquare(p.size);

        ctx.fillStyle = 'rgba(212, 160, 23, 0.06)';
        ctx.fill();

        ctx.strokeStyle = `rgba(212, 160, 23, ${0.6 * pulse})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        if (p.size > 22) {
          ctx.shadowColor = 'rgba(212, 160, 23, 0.5)';
          ctx.shadowBlur = 6;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      }

      // Draw subtle connection lines between nearby shapes
      if (tick.current % 2 === 0) {
        for (let i = 0; i < shapes.current.length; i++) {
          for (let j = i + 1; j < shapes.current.length; j++) {
            const a = shapes.current[i], b = shapes.current[j];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < 120) {
              ctx.save();
              ctx.globalAlpha = (1 - dist / 120) * 0.08;
              ctx.strokeStyle = 'rgba(212, 160, 23, 1)';
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      }

      raf.current = requestAnimationFrame(animate);
    };

    animate();

    const onMouse = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 }; };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default HeroBackground;
