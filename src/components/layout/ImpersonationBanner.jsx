import { useEffect, useMemo, useState } from 'react';
import { useAuth, getStoredExchangeToken } from '@/context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

function jwtExpMs(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    const exp = Number(payload?.exp);
    if (!Number.isFinite(exp) || exp <= 0) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

function formatRemaining(ms) {
  if (ms <= 0) return 'expired';
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min <= 0) return `${sec}s`;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export default function ImpersonationBanner() {
  const { user, impersonationActive, impersonatorAdminId, logout } = useAuth();
  const [now, setNow] = useState(Date.now());

  const expiresAt = useMemo(() => {
    if (!impersonationActive) return null;
    return jwtExpMs(getStoredExchangeToken() || '');
  }, [impersonationActive]);

  useEffect(() => {
    if (!impersonationActive || !expiresAt) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [impersonationActive, expiresAt]);

  useEffect(() => {
    if (!impersonationActive || !expiresAt) return;
    if (expiresAt <= Date.now()) logout();
  }, [impersonationActive, expiresAt, now, logout]);

  if (!impersonationActive || !user) return null;

  const remaining = expiresAt ? expiresAt - now : null;

  return (
    <div
      className="shrink-0 z-[45] border-b border-amber-500/40 bg-amber-500/15 px-4 py-2.5"
      role="status"
    >
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-amber-100">
        <div className="flex items-start gap-2 min-w-0">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" aria-hidden />
          <p className="leading-snug">
            <span className="font-bold text-amber-50">Support view:</span>{' '}
            you are signed in as <span className="font-mono font-semibold text-white">{user.email}</span>.
            {impersonatorAdminId ? (
              <span className="text-amber-200/80 text-xs block sm:inline sm:ml-1 font-mono">
                (admin {impersonatorAdminId})
              </span>
            ) : null}
            {remaining != null ? (
              <span className="text-amber-200/90 text-xs block sm:inline sm:ml-2">
                Session expires in <span className="font-semibold text-amber-50">{formatRemaining(remaining)}</span>
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            // Close the support tab when possible — the user's real session in other tabs is untouched.
            try { window.close(); } catch { /* ignore */ }
          }}
          className="inline-flex items-center justify-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-surface-dark border border-amber-500/35 text-amber-50 font-bold text-xs hover:bg-amber-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Exit session
        </button>
      </div>
    </div>
  );
}
