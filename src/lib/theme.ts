/**
 * Single source of truth for theme storage/resolution. Shared by the
 * pre-hydration blocking script (src/routes/__root.tsx), the ThemeProvider
 * (src/components/theme-provider.tsx), and anything else that needs to know
 * how the "system" preference resolves to an actual light/dark value.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "nutriai-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? systemTheme() : theme;
}

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/**
 * Applies the resolved theme to the document root. Safe to call before
 * React mounts (the blocking init script) or from the provider after.
 */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

/**
 * Inlined into <head> as a blocking, synchronous script so the correct
 * theme class is on <html> before the first paint — no light-flash on dark
 * devices, no dark-flash on light ones. Runs identical resolution logic to
 * readStoredTheme/resolveTheme above, just stringified since it has to
 * execute before any JS module graph loads. Kept dependency-free and
 * wrapped in try/catch: storage access can throw (private browsing, blocked
 * cookies) and must never take down the page.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)},s=localStorage.getItem(k),m=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");if(m==="dark")document.documentElement.classList.add("dark");document.documentElement.style.colorScheme=m;}catch(e){}})();`;
