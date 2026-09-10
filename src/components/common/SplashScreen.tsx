import React from 'react';

interface SplashScreenProps {
  message?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  message = 'Initializing PrepDesk CAT 2027...',
}) => {
  return (
    <div className="fixed inset-0 z-[99999] bg-[#090a0f] flex flex-col items-center justify-center p-6 select-none overflow-hidden font-sans">
      {/* Ambient Breathing Halo Glow */}
      <div className="absolute w-[360px] h-[360px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-halo-pulse" />
      <div className="absolute w-[240px] h-[240px] rounded-full bg-cyan-500/5 blur-[80px] pointer-events-none" />

      {/* Center Branding Monogram */}
      <div className="relative z-10 flex flex-col items-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
        {/* Crystal Logo Emblem */}
        <div className="relative group">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-emerald-500/30 to-teal-400/20 blur-md opacity-70 group-hover:opacity-100 transition duration-500" />
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass-panel border border-white/[0.15] shadow-2xl flex items-center justify-center">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tighter bg-gradient-to-br from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
              PD
            </span>
          </div>
        </div>

        {/* Title & Batch Metadata */}
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-white uppercase">
              PrepDesk
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              CAT 2027
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono tracking-wider">
            BATCH B-CAT2701 · BATCH WORKSPACE
          </p>
        </div>

        {/* Hairline Shimmer Progress Bar */}
        <div className="w-48 sm:w-56 space-y-2 pt-2">
          <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden relative">
            <div className="h-full w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full skeleton-shimmer" />
          </div>
          <p className="text-[11px] text-zinc-500 font-mono text-center flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{message}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
