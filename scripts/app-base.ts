/**
 * Vite `base` for this app.
 *
 * GitHub Pages is a project site at /Echo/. Vercel production and preview
 * hosts (*.vercel.app) serve the app at /. Explicit VITE_BASE or BASE_PATH
 * wins, so the Pages workflow can pin /Echo/ even if VERCEL is present.
 */
export function resolveAppBase(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.VITE_BASE || env.BASE_PATH;
  if (explicit) return normalizeBase(explicit);
  if (env.VERCEL) return "/";
  return "/Echo/";
}

/** Keep a directory base, including the root `/`. */
export function normalizeBase(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "/") return "/";
  const withSlash = trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  if (withSlash.startsWith("/") || withSlash.startsWith(".") || /^[a-z][a-z0-9+.-]*:/i.test(withSlash)) {
    return withSlash;
  }
  return `/${withSlash}`;
}
