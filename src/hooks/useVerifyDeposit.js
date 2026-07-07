/**
 * useVerifyDeposit
 *
 * Calls GET /api/wallet/verify-deposit while the deposit page is open and
 * stops completely when the component unmounts (user navigates away).
 *
 * Architecture
 * ────────────
 *  Page opens   → immediate verify call + start interval timer
 *  Every N min  → verify call
 *  Page closes  → clearInterval → zero background RPC usage
 *
 * The server enforces a minimum cooldown between calls (default 60 s) and
 * returns { skipped: true, retry_in_sec } when the client calls too early.
 * The hook respects retry_in_sec to avoid wasting HTTP round-trips.
 *
 * @param {object} opts
 * @param {Function} [opts.onDeposit]        - called with event count when ≥1 new deposit found
 * @param {number}   [opts.intervalMs]       - polling interval (ms); default reads
 *                                             VITE_VERIFY_DEPOSIT_INTERVAL_MS or falls back to 5 min
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { authFetch } from '@/context/AuthContext';
import { exchangeApiOrigin } from '@/lib/apiBase';

const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

const DEFAULT_INTERVAL_MS = (() => {
  const env = Number(import.meta.env.VITE_VERIFY_DEPOSIT_INTERVAL_MS);
  return env > 0 ? env : 5 * 60 * 1000; // 5 minutes
})();

export function useVerifyDeposit({ onDeposit, intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  const [isVerifying,    setIsVerifying]    = useState(false);
  const [lastVerifiedAt, setLastVerifiedAt] = useState(null);
  const [depositsFound,  setDepositsFound]  = useState(0);
  const [error,          setError]          = useState(null);

  const timerRef       = useRef(null);
  const retryAfterRef  = useRef(0);   // server-requested retry delay (ms)
  const mountedRef     = useRef(true);

  const verify = useCallback(async () => {
    if (!mountedRef.current) return;

    // Honour server-requested back-off.
    if (retryAfterRef.current > 0) {
      const wait = retryAfterRef.current;
      retryAfterRef.current = 0;
      timerRef.current = setTimeout(verify, wait);
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res  = await authFetch(`${API}/api/wallet/verify-deposit`);
      const data = await res.json().catch(() => ({}));

      if (!mountedRef.current) return;

      if (!res.ok) {
        setError(data?.detail || 'Deposit check failed.');
      } else if (data.skipped && data.retry_in_sec > 0) {
        // Server says "too soon" — wait the suggested amount before next call.
        retryAfterRef.current = data.retry_in_sec * 1000;
      } else if ((data.events_found ?? 0) > 0) {
        setDepositsFound(prev => prev + data.events_found);
        onDeposit?.(data.events_found);
      }

      setLastVerifiedAt(new Date().toISOString());
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message || 'Network error.');
      }
    } finally {
      if (mountedRef.current) {
        setIsVerifying(false);
      }
    }
  }, [onDeposit]);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = retryAfterRef.current > 0 ? retryAfterRef.current : intervalMs;
    retryAfterRef.current = 0;
    timerRef.current = setTimeout(async () => {
      await verify();
      if (mountedRef.current) scheduleNext();
    }, delay);
  }, [verify, intervalMs]);

  useEffect(() => {
    mountedRef.current = true;

    // Immediate first call, then schedule recurring.
    (async () => {
      await verify();
      if (mountedRef.current) scheduleNext();
    })();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    /** True while an RPC call is in-flight. */
    isVerifying,
    /** ISO timestamp of the last completed verify call. */
    lastVerifiedAt,
    /** Running total of newly discovered deposit events this page visit. */
    depositsFound,
    /** Error message from the most recent failed call, or null. */
    error,
    /** Manually trigger a verify call (e.g. pull-to-refresh). */
    refresh: verify,
  };
}
