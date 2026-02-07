"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect } from "react";

type Theme = "light" | "dark";
type ThemeMode = Theme | "system";

type ThemeContextType = {
  theme: Theme; // resolved theme (light/dark)
  mode: ThemeMode; // user preference (light/dark/system)
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void; // toggles between light/dark (kept for backward compatibility)
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const getSystemTheme = (): Theme =>
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  // Read saved preference once (client-side)
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = localStorage.getItem("theme-mode") as ThemeMode | null;
    return saved || "system";
  });

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return mode === "system" ? getSystemTheme() : mode;
  });

  // Apply theme class to <html>
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Persist mode and update resolved theme
  const setMode = (next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem("theme-mode", next);
    setTheme(next === "system" ? getSystemTheme() : next);
  };

  // Track OS changes in system mode
  useEffect(() => {
    if (mode !== "system" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setTheme(getSystemTheme());

    // addEventListener is modern, addListener is legacy
    if (media.addEventListener) media.addEventListener("change", handler);
    else media.addListener(handler);

    return () => {
      if (media.removeEventListener) media.removeEventListener("change", handler);
      else media.removeListener(handler);
    };
  }, [mode]);

  const toggleTheme = () => {
    // If user is on system, switch to explicit light first then toggle
    const current = mode === "system" ? theme : mode;
    setMode(current === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
