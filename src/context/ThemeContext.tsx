import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "obsidian" | "midnight-blue" | "emerald-scholar";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "obsidian",
  setTheme: () => {},
});

const THEME_STORAGE_KEY = "prepdesk_theme_v1";

const THEME_CSS_VARS: Record<Theme, Record<string, string>> = {
  "obsidian": {
    "--bg-canvas": "#08090c",
    "--bg-surface": "#0e1017",
    "--bg-card": "rgba(17, 20, 29, 0.65)",
    "--border-subtle": "rgba(255, 255, 255, 0.08)",
    "--border-hover": "rgba(255, 255, 255, 0.16)",
    "--accent-indigo": "#5e6ad2",
    "--accent-glow": "rgba(94, 106, 210, 0.15)",
    "--grad-start": "rgba(94, 106, 210, 0.09)",
    "--grad-mid": "rgba(6, 182, 212, 0.04)",
  },
  "midnight-blue": {
    "--bg-canvas": "#060d1f",
    "--bg-surface": "#0a1228",
    "--bg-card": "rgba(10, 18, 40, 0.75)",
    "--border-subtle": "rgba(6, 182, 212, 0.12)",
    "--border-hover": "rgba(6, 182, 212, 0.25)",
    "--accent-indigo": "#06b6d4",
    "--accent-glow": "rgba(6, 182, 212, 0.18)",
    "--grad-start": "rgba(6, 182, 212, 0.10)",
    "--grad-mid": "rgba(14, 165, 233, 0.05)",
  },
  "emerald-scholar": {
    "--bg-canvas": "#040d08",
    "--bg-surface": "#071409",
    "--bg-card": "rgba(7, 20, 9, 0.75)",
    "--border-subtle": "rgba(245, 158, 11, 0.12)",
    "--border-hover": "rgba(245, 158, 11, 0.25)",
    "--accent-indigo": "#f59e0b",
    "--accent-glow": "rgba(245, 158, 11, 0.15)",
    "--grad-start": "rgba(16, 185, 129, 0.08)",
    "--grad-mid": "rgba(245, 158, 11, 0.04)",
  },
};

export const THEME_META: Record<Theme, { label: string; dot: string; desc: string }> = {
  "obsidian":        { label: "Obsidian",        dot: "#6366f1", desc: "Sharp dark" },
  "midnight-blue":   { label: "Midnight Blue",   dot: "#06b6d4", desc: "Deep navy" },
  "emerald-scholar": { label: "Emerald Scholar", dot: "#f59e0b", desc: "Dark green" },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      return saved && THEME_CSS_VARS[saved] ? saved : "obsidian";
    } catch {
      return "obsidian";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const vars = THEME_CSS_VARS[theme];
    Object.entries(vars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
    document.documentElement.classList.remove("theme-light");
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(THEME_STORAGE_KEY, t); } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
