import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function ImpersonationBanner() {
  const { user, impersonationActive, impersonatorAdminId, logout } = useAuth();

  if (!impersonationActive || !user) return null;

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
          </p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center justify-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-surface-dark border border-amber-500/35 text-amber-50 font-bold text-xs hover:bg-amber-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Exit session
        </button>
      </div>
    </div>
  );
}
