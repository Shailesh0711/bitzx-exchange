import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  clearImpersonationBootstrapToken,
  resolveImpersonationToken,
  stripImpersonationTokenFromUrl,
} from '@/lib/impersonationAuth';

/** Shared across StrictMode remounts so we only establish once per tab load. */
let _impersonatePromise = null;

/**
 * Admin "Login as user" landing page.
 * Always prefers the impersonation token over any existing localStorage session.
 */
export default function ImpersonateLoginPage() {
  const navigate = useNavigate();
  const { establishImpersonationSession } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!_impersonatePromise) {
      const token = resolveImpersonationToken();
      stripImpersonationTokenFromUrl();

      if (!token) {
        setError(
          'Missing impersonation token. Close this tab and try “Login as user” again from the admin panel.',
        );
        return undefined;
      }

      _impersonatePromise = establishImpersonationSession(token)
        .then((u) => {
          clearImpersonationBootstrapToken();
          return u;
        })
        .catch((e) => {
          clearImpersonationBootstrapToken();
          _impersonatePromise = null;
          throw e;
        });
    }

    _impersonatePromise
      .then(() => {
        if (!cancelled) navigate('/dashboard', { replace: true });
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e?.message
            || 'Could not start impersonation session. The link may have expired — try again from admin.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [establishImpersonationSession, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-lg font-bold text-rose-300 text-center max-w-md">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="px-5 py-2.5 rounded-xl bg-gold text-surface-dark text-sm font-bold"
        >
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center gap-4 px-6">
      <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-white/65">Signing you in as user…</p>
    </div>
  );
}
