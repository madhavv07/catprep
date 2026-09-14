import React, { useRef, useState, useLayoutEffect, useEffect } from "react";

export interface PillTabItem<T extends string> {
  key: T;
  label: string;
}

interface PillTabsProps<T extends string> {
  tabs: readonly PillTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
}

export function PillTabs<T extends string>({
  tabs,
  activeKey,
  onChange,
  className = "",
}: PillTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const updatePosition = () => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector<HTMLButtonElement>(`button[data-key="${activeKey}"]`);
    if (activeBtn) {
      setStyle({
        left: activeBtn.offsetLeft,
        top: activeBtn.offsetTop,
        width: activeBtn.offsetWidth,
        height: activeBtn.offsetHeight,
      });
    }
  };

  useLayoutEffect(() => {
    updatePosition();
  }, [activeKey, tabs]);

  useEffect(() => {
    window.addEventListener("resize", updatePosition);
    // Double-check after render or custom fonts (Clash Display / Syne) finish settling
    const timer1 = setTimeout(updatePosition, 50);
    const timer2 = setTimeout(updatePosition, 250);
    if (document.fonts?.ready) {
      document.fonts.ready.then(updatePosition);
    }
    return () => {
      window.removeEventListener("resize", updatePosition);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [activeKey]);

  return (
    <div ref={containerRef} className={`pill-tabs shrink-0 ${className}`}>
      {style.width > 0 && (
        <div
          className="pill-indicator"
          style={{
            left: `${style.left}px`,
            top: `${style.top}px`,
            width: `${style.width}px`,
            height: `${style.height}px`,
          }}
        />
      )}
      {tabs.map((tab) => (
        <button
          key={tab.key}
          data-key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`pill-tab ${activeKey === tab.key ? "active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
