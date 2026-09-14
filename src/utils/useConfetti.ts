import { useCallback } from "react";

interface ConfettiParticle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  alpha: number;
  size: number;
  rotation: number;
  rotSpeed: number;
}

const COLORS = ["#6366f1","#10b981","#f59e0b","#ec4899","#06b6d4","#ffffff","#a78bfa"];

export function useConfetti() {
  const fire = useCallback((originEl?: HTMLElement) => {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = `
      position:fixed;inset:0;width:100vw;height:100vh;
      pointer-events:none;z-index:9999;
    `;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const rect = originEl?.getBoundingClientRect();
    const ox = rect ? rect.left + rect.width / 2 : canvas.width / 2;
    const oy = rect ? rect.top + rect.height / 2 : canvas.height / 2;

    const particles: ConfettiParticle[] = Array.from({ length: 80 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      return {
        x: ox, y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
        size: Math.random() * 6 + 3,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
      };
    });

    let frame = 0;
    const MAX = 80;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.99;
        p.alpha -= 0.012;
        p.rotation += p.rotSpeed;
        if (p.alpha <= 0) return;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      frame++;
      if (alive && frame < MAX * 3) {
        requestAnimationFrame(tick);
      } else {
        canvas.remove();
      }
    };
    requestAnimationFrame(tick);
  }, []);

  return { fire };
}
