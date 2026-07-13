/** Parse admin impersonation JWT from URL query (`?t=`) or hash (`#t=`). */
export function readImpersonationTokenFromUrl() {
  if (typeof window === 'undefined') return null;

  try {
    const fromQuery = new URLSearchParams(window.location.search || '').get('t');
    if (fromQuery?.trim()) return fromQuery.trim();
  } catch {
    /* ignore */
  }

  const hash = window.location.hash || '';
  if (!hash) return null;

  const direct = hash.match(/^#t=(.+)$/);
  if (direct?.[1]) {
    try {
      return decodeURIComponent(direct[1]).trim() || null;
    } catch {
      return direct[1].trim() || null;
    }
  }

  try {
    const raw = hash.replace(/^#/, '');
    const token = new URLSearchParams(raw).get('t');
    return token?.trim() || null;
  } catch {
    return null;
  }
}

/** @deprecated use readImpersonationTokenFromUrl */
export function readImpersonationTokenFromHash() {
  return readImpersonationTokenFromUrl();
}

/** Remove impersonation token from the address bar after it has been read. */
export function stripImpersonationTokenFromUrl() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '/';
  window.history.replaceState(null, '', path);
}

/** @deprecated use stripImpersonationTokenFromUrl */
export function stripImpersonationHashFromUrl() {
  stripImpersonationTokenFromUrl();
}

const IMP_BOOTSTRAP_KEY = 'bitzx_imp_bootstrap_token';

/** Stash token captured in main.jsx before the router mounts. */
export function stashImpersonationBootstrapToken(token) {
  if (!token || typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(IMP_BOOTSTRAP_KEY, token);
  } catch {
    /* ignore */
  }
}

/** Read without removing — safe for React StrictMode double-mount. */
export function peekImpersonationBootstrapToken() {
  try {
    return sessionStorage.getItem(IMP_BOOTSTRAP_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function clearImpersonationBootstrapToken() {
  try {
    sessionStorage.removeItem(IMP_BOOTSTRAP_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefer stash, then live URL (query/hash). */
export function resolveImpersonationToken() {
  return peekImpersonationBootstrapToken() || readImpersonationTokenFromUrl();
}
