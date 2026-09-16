"use client";

import { ConfigProvider } from "antd";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ACCENTS, DEFAULT_SETTINGS, buildTheme, type ThemeSettings } from "@/theme/presets";

/** Also read by the pre-paint script in app/layout.tsx. */
export const THEME_STORAGE_KEY = "dha-portal-theme";

const listeners = new Set<() => void>();
let currentSettings: ThemeSettings | null = null;

function readSettings(): ThemeSettings {
  if (currentSettings === null) {
    try {
      const saved = JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) ?? "{}") as Partial<ThemeSettings>;
      const merged = { ...DEFAULT_SETTINGS, ...saved };
      currentSettings = merged.accent in ACCENTS ? merged : { ...merged, accent: DEFAULT_SETTINGS.accent };
    } catch {
      currentSettings = DEFAULT_SETTINGS;
    }
  }

  return currentSettings;
}

function writeSettings(next: ThemeSettings): void {
  currentSettings = next;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this visit.
  }

  listeners.forEach((listener) => listener());
}

function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function subscribeSystemDark(listener: () => void): () => void {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", listener);

  return () => query.removeEventListener("change", listener);
}

const getSystemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

type ThemeContextValue = {
  settings: ThemeSettings;
  resolvedMode: "light" | "dark";
  update: (patch: Partial<ThemeSettings>) => void;
  toggleMode: () => void;
  reset: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribeSettings, readSettings, () => DEFAULT_SETTINGS);
  const systemDark = useSyncExternalStore(subscribeSystemDark, getSystemDark, () => false);
  const resolvedMode = settings.mode === "system" ? (systemDark ? "dark" : "light") : settings.mode;

  useEffect(() => {
    const root = document.documentElement;
    const accent = ACCENTS[settings.accent];

    root.dataset.theme = resolvedMode;
    root.style.setProperty("--accent", accent.primary);
    root.style.setProperty("--accent-2", accent.secondary);
  }, [resolvedMode, settings.accent]);

  const update = useCallback((patch: Partial<ThemeSettings>) => writeSettings({ ...readSettings(), ...patch }), []);
  const toggleMode = useCallback(
    () => writeSettings({ ...readSettings(), mode: resolvedMode === "dark" ? "light" : "dark" }),
    [resolvedMode],
  );
  const reset = useCallback(() => writeSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(
    () => ({ settings, resolvedMode, update, toggleMode, reset }),
    [settings, resolvedMode, update, toggleMode, reset],
  );
  const themeConfig = useMemo(() => buildTheme(resolvedMode, settings), [resolvedMode, settings]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeSettings(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeSettings must be used inside ThemeProvider.");
  }

  return context;
}
