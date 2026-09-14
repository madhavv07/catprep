import React, { useState } from "react";
import { Palette } from "lucide-react";
import { useTheme, THEME_META, Theme } from "../../context/ThemeContext";

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const themes = Object.entries(THEME_META) as [Theme, typeof THEME_META[Theme]][];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition cursor-pointer"
        title="Change theme"
      >
        <Palette className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 glass-panel rounded-2xl p-3 z-50 animate-popover-spring shadow-2xl space-y-1">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 pb-1">
              Theme
            </p>
            {themes.map(([key, meta]) => (
              <button
                key={key}
                onClick={() => { setTheme(key); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  theme === key
                    ? "bg-indigo-500/15 text-white border border-indigo-500/25"
                    : "text-zinc-300 hover:bg-white/[0.05] border border-transparent"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-white/20"
                  style={{ background: meta.dot }}
                />
                <span className="font-medium">{meta.label}</span>
                {theme === key && (
                  <span className="ml-auto text-indigo-400 text-[10px]">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
