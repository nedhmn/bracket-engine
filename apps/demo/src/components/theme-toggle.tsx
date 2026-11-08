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
      className="rounded-pill tabular-nums sm:w-[92px]"
    >
      {/* Labels follow the html classes so first paint matches the inline script */}
      <span className="hidden theme-system:inline">
        ◐<span className="max-sm:sr-only"> System</span>
      </span>
      <span className="hidden theme-light:inline">
        ○<span className="max-sm:sr-only"> Light</span>
      </span>
      <span className="hidden theme-dark:inline">
        ●<span className="max-sm:sr-only"> Dark</span>
      </span>
    </Button>
  );
}
