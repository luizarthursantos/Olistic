// Build identity, injected by Vite at build time (see vite.config.ts).
// Shown at the top of Settings so it's possible to confirm which build a
// device is actually running — the PWA service worker can keep serving an
// older bundle until it refreshes.

declare const __APP_VERSION__: string;
declare const __BUILD_SHA__: string;
declare const __BUILD_TIME__: string;

export const APP_VERSION = __APP_VERSION__;
export const BUILD_SHA = __BUILD_SHA__;
export const BUILD_TIME = __BUILD_TIME__;

/** e.g. "v1.1.0 · build 20260725.1432 · a1b2c3d" */
export const BUILD_LABEL = `v${APP_VERSION} · build ${formatBuildNumber(BUILD_TIME)} · ${BUILD_SHA}`;

/** Compact, sortable build number derived from the build timestamp. */
function formatBuildNumber(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'dev';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `.${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`
  );
}
