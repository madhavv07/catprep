import React from 'react';

export const TopNotch: React.FC = () => {
  return (
    <aside aria-label="CATDesk System Notch" className="fixed top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none">
      <div className="flex items-center gap-2.5 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-b-2xl bg-black/85 sm:bg-zinc-950/90 backdrop-blur-2xl border-b border-x border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_12px_rgba(99,102,241,0.15)] transition-all duration-300 hover:border-indigo-500/40 hover:bg-black/95">
        {/* CD Monogram Symbol */}
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-mono font-black text-[10px] flex items-center justify-center tracking-tighter ring-1 ring-white/25 shadow-[0_0_10px_rgba(99,102,241,0.5)]">
          CD
        </div>

        {/* Brand Text */}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-xs tracking-tight text-white font-sans">
            CAT<span className="text-indigo-400">Desk</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
            catdesk.online
          </span>
        </div>

        {/* Live Pulse Dot */}
        <div className="flex items-center gap-1 pl-1 border-l border-white/[0.1]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="CATDesk Online" />
        </div>
      </div>
    </aside>
  );
};
