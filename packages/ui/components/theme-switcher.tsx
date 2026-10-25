import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { type ButtonProps } from "#/components/button";
import { Button } from "#/components/button";

export { ThemeProvider } from "next-themes";

type ThemeSwitcherProps = {
  className?: string;
} & ButtonProps;

/** Toggles between light and dark from the theme currently on screen, including a system-resolved one. */
export function ThemeSwitcher({ variant = "ghost", size = "icon", className }: ThemeSwitcherProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className={className}
    >
      <Sun
        className="absolute scale-100 rotate-0 transition-all duration-50 dark:scale-0 dark:rotate-90"
        size={18}
        strokeWidth={2}
      />
      <Moon
        className="absolute scale-0 rotate-90 transition-all duration-50 dark:scale-100 dark:rotate-0"
        size={18}
        strokeWidth={2}
      />
    </Button>
  );
}
