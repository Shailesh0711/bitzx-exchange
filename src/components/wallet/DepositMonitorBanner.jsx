/**
 * DepositMonitorBanner
 *
 * Static "we're checking for your deposit" note. Intentionally shows no
 * countdown / timer — the 7-minute monitoring window is a backend
 * implementation detail. The user only sees a gentle reminder not to
 * navigate away until their transaction is picked up.
 */

import { RefreshCw, ShieldCheck } from 'lucide-react';
import { MONITOR_STATUS } from '@/hooks/useDepositMonitor';

function BannerShell({ children, className = '' }) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 text-sm ${className}`}>
      {children}
    </div>
  );
}

/**
 * @param {object} props
 * @param {ReturnType<import('@/hooks/useDepositMonitor').useDepositMonitor>} props.monitor
 * @param {string}   [props.className]
 */
export default function DepositMonitorBanner({ monitor, className = '' }) {
  const { status } = monitor;

  if (status === MONITOR_STATUS.IDLE || status === MONITOR_STATUS.STARTING) {
    return (
      <BannerShell className={`bg-white/3 border-white/10 ${className}`}>
        <RefreshCw size={15} className="text-gold/60 shrink-0 animate-spin mt-0.5" />
        <p className="text-white/50 text-xs">Starting deposit check…</p>
      </BannerShell>
    );
  }

  if (status === MONITOR_STATUS.ACTIVE) {
    return (
      <BannerShell className={`bg-green-500/8 border-green-500/20 ${className}`}>
        <span className="relative flex h-3.5 w-3.5 shrink-0 mt-0.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 animate-ping" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-green-400" />
        </span>
        <div className="min-w-0">
          <p className="text-green-300 font-semibold text-xs tracking-wide">
            Checking for your deposit on-chain
          </p>
          <p className="text-white/60 text-[11px] mt-0.5 leading-relaxed flex items-start gap-1.5">
            <ShieldCheck size={12} className="text-green-300/80 shrink-0 mt-[1px]" />
            Please don&apos;t close or leave this page until your transaction is detected — you&apos;ll
            get a confirmation the moment it&apos;s found.
          </p>
        </div>
      </BannerShell>
    );
  }

  // Expired, stopped, or error — hide the banner entirely.
  return null;
}
