import { useEffect, useState } from "react";

/** Saved appearance. Missing key follows the system, then the dark default. */
export const THEME_STORAGE_KEY = "echo-color-theme";

export const DARK_THEME_COLOR = "#121212";
export const LIGHT_THEME_COLOR = "#f4f2ea";

export type ThemeChoice = "dark" | "light";

type ThemeRoot = {
  dataset: { theme?: string };
  style: { colorScheme: string };
};

type ThemeMeta = {
  setAttribute(name: string, value: string): void;
};

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "dark" || value === "light";
}

export function themeColor(theme: ThemeChoice): string {
  return theme === "light" ? LIGHT_THEME_COLOR : DARK_THEME_COLOR;
}

/** Dark when the system does not ask for a bright page. */
export function systemPrefersDark(): boolean {
  try {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return !window.matchMedia("(prefers-color-scheme: light)").matches;
  } catch {
    return true;
  }
}

export function readSavedTheme(storage: Pick<Storage, "getItem"> | null): ThemeChoice | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: ThemeChoice, storage: Pick<Storage, "setItem"> | null): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
}

/** A saved choice wins. Otherwise follow the system. */
export function resolveTheme(saved: ThemeChoice | null, systemDark: boolean): ThemeChoice {
  if (saved) return saved;
  return systemDark ? "dark" : "light";
}

export function paintTheme(theme: ThemeChoice, root: ThemeRoot, meta: ThemeMeta | null): void {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  meta?.setAttribute("content", themeColor(theme));
}

function browserStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function activeTheme(): ThemeChoice {
  const saved = readSavedTheme(browserStorage());
  if (saved) return saved;
  if (typeof document !== "undefined") {
    const painted = document.documentElement.dataset.theme;
    if (isThemeChoice(painted)) return painted;
  }
  return resolveTheme(null, systemPrefersDark());
}

export function applyTheme(theme: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="theme-color"]');
  paintTheme(theme, document.documentElement, meta);
  const apple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  apple?.setAttribute("content", theme === "light" ? "default" : "black-translucent");
}

/** Apply before React paints. The head script does the same on first load. */
export function bootTheme(): ThemeChoice {
  const theme = activeTheme();
  applyTheme(theme);
  return theme;
}

export function useTheme(): { theme: ThemeChoice; setTheme: (next: ThemeChoice) => void } {
  const [theme, setThemeState] = useState<ThemeChoice>(() => activeTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (readSavedTheme(browserStorage())) return;
      setThemeState(resolveTheme(null, !media.matches));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function setTheme(next: ThemeChoice) {
    saveTheme(next, browserStorage());
    setThemeState(next);
  }

  return { theme, setTheme };
}
