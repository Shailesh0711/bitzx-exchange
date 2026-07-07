/**
 * DepositMonitorBanner
 *
 * Shows a minimal status indicator while the deposit page polls for new
 * deposits via useVerifyDeposit.  Displays:
 *   • A spinner + "Checking for deposits…" while an RPC call is in-flight.
 *   • A quiet "Monitoring active" badge at rest (between polls).
 *   • Nothing when there's an error (silent — errors are non-critical).
 */

import { RefreshCw, CheckCircle } from 'lucide-react';

function fmtTime(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function BannerShell({ children, className = '' }) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 text-sm ${className}`}>
      {children}
    </div>
  );
}

/**
 * @param {object} props
 * @param {ReturnType<import('@/hooks/useVerifyDeposit').useVerifyDeposit>} props.monitor
 * @param {string}  [props.className]
 */
export default function DepositMonitorBanner({ monitor, className = '' }) {
  const { isVerifying, lastVerifiedAt, error } = monitor;

  if (error) return null;

  if (isVerifying) {
    return (
      <BannerShell className={`bg-white/3 border-white/10 ${className}`}>
        <RefreshCw size={15} className="text-gold/70 shrink-0 animate-spin" />
        <p className="text-white/60 text-xs">Checking for deposits…</p>
      </BannerShell>
    );
  }

  if (lastVerifiedAt) {
    return (
      <BannerShell className={`bg-green-500/8 border-green-500/20 ${className}`}>
        <CheckCircle size={15} className="text-green-400 shrink-0" />
        <span className="text-green-300 font-semibold text-xs tracking-wide">
          Monitoring active
        </span>
        <span className="text-white/40 text-xs ml-auto">
          Last checked {fmtTime(lastVerifiedAt)}
        </span>
      </BannerShell>
    );
  }

  return null;
}
