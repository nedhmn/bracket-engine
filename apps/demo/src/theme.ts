import { useEffect, useState } from "react";

// index.html reads the same key before first paint
const STORAGE_KEY = "tournament-engine-demo/theme";
const THEMES = ["light", "dark", "system"] as const;

export type Theme = (typeof THEMES)[number];

function storedTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.find((t) => t === stored) ?? "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme): void {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("system", theme === "system");
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(storedTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const choose = (next: Theme) => {
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage is optional: the theme still applies for this visit
    }
  };

  return [theme, choose];
}
