/** Bitzx brand logo — served from public/ so production builds stay self-contained. */

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

/** Absolute path to the bundled logo (works with Vite base subpaths). */
export const BRAND_LOGO = BASE ? `${BASE}/bitzx-logo.png` : '/bitzx-logo.png';

/** Hosts that no longer serve assets — fall back to BRAND_LOGO instead. */
const BLOCKED_LOGO_PATTERN = /emergentagent\.com|emergent\.sh/i;

/** Drop dead Emergent CDN URLs; otherwise return the candidate or fallback. */
export function resolveBrandLogoUrl(candidate, fallback = BRAND_LOGO) {
  const url = (candidate || '').trim();
  if (!url || BLOCKED_LOGO_PATTERN.test(url)) return fallback;
  return url;
}
