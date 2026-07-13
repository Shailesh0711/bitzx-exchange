/**
 * Session-wide deposit scan while the user is logged in.
 * Complements the server deposit_poller so deposits are recorded even when
 * the user never opens Wallet → History.
 */
import { useEffect, useRef } from 'react';
import { authFetch, useAuth } from '@/context/AuthContext';
import { exchangeApiOrigin } from '@/lib/apiBase';

const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);
const INTERVAL_MS = 300_000; // 5 minutes (server also enforces ≥60s cooldown)
const MAX_SCANS = 36; // ~3 hours of background checks per login session

export default function BackgroundDepositWatcher() {
  const { user } = useAuth();
  const scansRef = useRef(0);

  useEffect(() => {
    if (!user?.uid) return undefined;

    let cancelled = false;
    scansRef.current = 0;

    const scan = async () => {
      if (cancelled || scansRef.current >= MAX_SCANS) return;
      scansRef.current += 1;
      try {
        await authFetch(`${API}/api/wallet/verify-deposit`);
      } catch {
        /* ignore — poller / next tick will retry */
      }
    };

    void scan();
    const id = window.setInterval(() => void scan(), INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user?.uid]);

  return null;
}
