export type Theme = "light" | "dark";

/**
 * localStorage key for the user's chosen theme. MUST stay in sync with the
 * inline no-flash snippet in BaseLayout.astro (which hardcodes this string
 * because it runs before any module loads).
 */
export const THEME_KEY = "papersfly-theme";

/** Stored choice wins; otherwise follow the OS preference. */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "dark" || stored === "light") return stored;
  return prefersDark ? "dark" : "light";
}

/** Reflect a theme onto the document root (the `.dark` class drives all tokens). */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Read the persisted theme, tolerating disabled storage. */
export function getStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

/** Flip the current theme, persist it, and return the new value. */
export function toggleTheme(): Theme {
  const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Private-mode / disabled storage: the class still applies for this session.
  }
  return next;
}
