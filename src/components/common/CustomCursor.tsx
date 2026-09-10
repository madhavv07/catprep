import React, { useEffect, useState, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(true);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const isVisibleRef = useRef(false);
  const isHoveredRef = useRef(false);

  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    // Detect touch / coarse pointer
    const checkTouch = () => {
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(isCoarse || (hasTouch && window.innerWidth < 1024));
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);

    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  useEffect(() => {
    if (isTouchDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        if (dotRef.current) dotRef.current.style.opacity = '1';
        if (ringRef.current) ringRef.current.style.opacity = '1';
      }

      // Check if hovering over interactive element
      const target = e.target as HTMLElement | null;
      if (target && ringRef.current) {
        const interactive = !!target.closest('button, a, input, select, textarea, [role="button"], .cursor-pointer');
        if (interactive !== isHoveredRef.current) {
          isHoveredRef.current = interactive;
          if (interactive) {
            ringRef.current.style.width = '36px';
            ringRef.current.style.height = '36px';
            ringRef.current.style.marginLeft = '-18px';
            ringRef.current.style.marginTop = '-18px';
            ringRef.current.style.borderColor = 'rgba(52, 211, 153, 0.85)';
            ringRef.current.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            ringRef.current.style.boxShadow = '0 0 16px rgba(52, 211, 153, 0.3)';
          } else {
            ringRef.current.style.width = '24px';
            ringRef.current.style.height = '24px';
            ringRef.current.style.marginLeft = '-12px';
            ringRef.current.style.marginTop = '-12px';
            ringRef.current.style.borderColor = 'rgba(52, 211, 153, 0.45)';
            ringRef.current.style.backgroundColor = 'rgba(16, 185, 129, 0.04)';
            ringRef.current.style.boxShadow = 'none';
          }
        }
      }
    };

    const handleMouseLeave = () => {
      isVisibleRef.current = false;
      if (dotRef.current) dotRef.current.style.opacity = '0';
      if (ringRef.current) ringRef.current.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      isVisibleRef.current = true;
      if (dotRef.current) dotRef.current.style.opacity = '1';
      if (ringRef.current) ringRef.current.style.opacity = '1';
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Smooth follower animation loop
    const updatePosition = () => {
      const ease = 0.22;
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * ease;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * ease;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      animFrameId.current = requestAnimationFrame(updatePosition);
    };

    animFrameId.current = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isTouchDevice]);

  if (isTouchDevice) return null;

  return (
    <>
      {/* Precision Dot */}
      <div
        ref={dotRef}
        style={{ opacity: 0, willChange: 'transform' }}
        className="pointer-events-none fixed top-0 left-0 -ml-1 -mt-1 w-2 h-2 rounded-full bg-emerald-400 z-[9998] shadow-[0_0_8px_rgba(52,211,153,0.8)] transition-opacity duration-150"
      />

      {/* Fluid Follower Ring */}
      <div
        ref={ringRef}
        style={{
          opacity: 0,
          willChange: 'transform',
          width: '24px',
          height: '24px',
          marginLeft: '-12px',
          marginTop: '-12px',
          borderColor: 'rgba(52, 211, 153, 0.45)',
          backgroundColor: 'rgba(16, 185, 129, 0.04)',
        }}
        className="pointer-events-none fixed top-0 left-0 rounded-full border z-[9997] transition-[width,height,margin,border-color,background-color,box-shadow,opacity] duration-200 ease-out"
      />
    </>
  );
};
