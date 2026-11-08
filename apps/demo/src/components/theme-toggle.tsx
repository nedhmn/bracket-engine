import { Button } from "@repo/design-system/components/button";

import { type Theme, useTheme } from "../theme.ts";

const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  return (
    <Button
      variant="ghost"
      onClick={() => setTheme(NEXT[theme])}
      aria-label="Switch theme"
      title="Switch theme"
      className="w-[92px] rounded-pill tabular-nums"
    >
      {/* Labels follow the html classes so first paint matches the inline script */}
      <span className="hidden theme-system:inline">◐ System</span>
      <span className="hidden theme-light:inline">○ Light</span>
      <span className="hidden theme-dark:inline">● Dark</span>
    </Button>
  );
}
