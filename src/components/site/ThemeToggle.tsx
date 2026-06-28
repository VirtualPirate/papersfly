import { useEffect, useState } from "react";
import { toggleTheme } from "@/lib/theme";

/**
 * Dark-mode toggle for React islands (the builder). An .astro component can't
 * render inside a React island, so this mirrors ThemeToggle.astro's behaviour
 * via the shared lib/theme helpers.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // The no-flash inline script may already have set .dark before hydration.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={() => setDark(toggleTheme() === "dark")}
      className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
        </svg>
      )}
    </button>
  );
}
