'use client';

import React, { useEffect, useRef } from 'react';

interface MysticSmokeCanvasProps {
  isDispersing?: boolean;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  maxAlpha: number;
  decay: number;
  color: string;
}

interface Stardust {
  x: number;
  y: number;
  size: number;
  vy: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
}

export default function MysticSmokeCanvas({ isDispersing = false }: MysticSmokeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dispersingRef = useRef(isDispersing);

  useEffect(() => {
    dispersingRef.current = isDispersing;
  }, [isDispersing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Duman Parçacıkları Havuzu
    const smokeColors = [
      'rgba(147, 51, 234, ',   // Mor
      'rgba(124, 58, 237, ',   // Menekşe
      'rgba(79, 70, 229, ',    // İndigo
      'rgba(217, 119, 6, ',    // Altın
      'rgba(59, 130, 246, ',   // Kozmik Mavi
    ];

    const particles: Particle[] = [];
    const maxParticles = 65;

    function createSmokeParticle(forceBottom = false): Particle {
      const colorPrefix = smokeColors[Math.floor(Math.random() * smokeColors.length)];
      return {
        x: Math.random() * width,
        y: forceBottom ? height + Math.random() * 80 : height * 0.4 + Math.random() * (height * 0.6),
        radius: Math.random() * 120 + 70,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(Math.random() * 0.6 + 0.3),
        alpha: 0.01,
        maxAlpha: Math.random() * 0.14 + 0.05,
        decay: Math.random() * 0.0015 + 0.0008,
        color: colorPrefix,
      };
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(createSmokeParticle());
    }

    // Altın Yıldız Tozları (Stardust)
    const stardustCount = 80;
    const stardusts: Stardust[] = [];
    for (let i = 0; i < stardustCount; i++) {
      stardusts.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.2 + 0.8,
        vy: -(Math.random() * 0.4 + 0.15),
        alpha: Math.random(),
        twinkleSpeed: Math.random() * 0.04 + 0.01,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const isDisp = dispersingRef.current;

      // 1. Duman Bulutları Çizimi
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (isDisp) {
          // Dağılma anında duman hızlanır ve yukarı/dışarı savrulur
          p.vy -= 0.06;
          p.radius += 2.5;
          p.alpha -= 0.006;
        } else {
          // Normal nefes alma ve süzülme
          if (p.alpha < p.maxAlpha) {
            p.alpha += 0.004;
          }
          p.alpha -= p.decay;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Ömrü bitince veya ekrandan çıkınca yeniden doğur
        if (p.alpha <= 0 || p.y < -p.radius * 2) {
          if (!isDisp) {
            particles[i] = createSmokeParticle(true);
          }
          continue;
        }

        // Yumuşak duman radyal gradyanı
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        gradient.addColorStop(0, `${p.color}${Math.max(0, p.alpha)})`);
        gradient.addColorStop(0.5, `${p.color}${Math.max(0, p.alpha * 0.45)})`);
        gradient.addColorStop(1, `${p.color}0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Altın Yıldız Tozları (Stardust)
      for (let i = 0; i < stardusts.length; i++) {
        const s = stardusts[i];
        s.phase += s.twinkleSpeed;
        const currentAlpha = 0.3 + 0.7 * Math.abs(Math.sin(s.phase));

        if (isDisp) {
          s.vy -= 0.12;
          s.x += (Math.random() - 0.5) * 2;
        }

        s.y += s.vy;
        if (s.y < 0) s.y = height;

        ctx.fillStyle = `rgba(253, 230, 138, ${currentAlpha * (isDisp ? 1.5 : 0.8)})`;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
    />
  );
}
