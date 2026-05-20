import { useEffect, useState } from 'react';
import { exchangeApiOrigin } from '@/lib/apiBase';

const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

/** Absolute URL for the published APK download (API stream endpoint). */
export function mobileAppDownloadHref(release) {
  if (!release?.available) return null;
  const rel = release.download_api_url || release.download_url;
  if (!rel) return null;
  if (rel.startsWith('http://') || rel.startsWith('https://')) return rel;
  return `${API}${rel.startsWith('/') ? '' : '/'}${rel}`;
}

/**
 * Fetch GET /api/mobile-app/release once (public, no auth).
 * @returns {{ release: object|null, loaded: boolean, downloadHref: string|null }}
 */
export function useMobileAppRelease() {
  const [release, setRelease] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/mobile-app/release`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRelease(data);
      })
      .catch(() => {
        if (!cancelled) setRelease({ available: false });
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const downloadHref = mobileAppDownloadHref(release);
  const available = release?.available === true;

  return { release, loaded, available, downloadHref };
}
