/**
 * DepositMonitorBanner
 *
 * Shows the current deposit monitoring status at the top of the Deposit
 * History section.  Consumes a ``useDepositMonitor`` hook instance passed
 * in as props so the parent controls the lifecycle and can react to events.
 *
 * States rendered
 * ───────────────
 *  idle      → "Start monitoring" CTA
 *  starting  → spinner
 *  active    → animated pulse + countdown + stop button
 *  expired   → amber explanation + Restart CTA (+ cooldown if blocked)
 *  stopped   → neutral notice + Restart CTA
 *  error     → red inline error + retry option
 */

import { Activity, Wifi, WifiOff, RefreshCw, Square, Clock, AlertCircle } from 'lucide-react';
import { MONITOR_STATUS } from '@/hooks/useDepositMonitor';

function fmtCountdown(secs) {
  if (secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PulsingDot({ color = 'bg-green-400' }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  );
}

function BannerShell({ children, className = '' }) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start sm:items-center gap-3 text-sm ${className}`}>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {ReturnType<import('@/hooks/useDepositMonitor').useDepositMonitor>} props.monitor
 * @param {string}   [props.className]
 */
export default function DepositMonitorBanner({ monitor, className = '' }) {
  const {
    status, session, config, secondsLeft, cooldownSec,
    lastScanAt, error, start, stop, canRestart,
  } = monitor;

  const message        = config?.message        ?? 'Monitoring active — new deposits typically appear within 1–3 minutes.';
  const expiredMessage = config?.expired_message ?? 'Monitoring stopped. Tap Restart to resume watching for deposits.';

  // ── idle / starting — both show the same "connecting" state since auto-start
  // fires immediately on mount. The idle state is only briefly visible.
  if (status === MONITOR_STATUS.IDLE || status === MONITOR_STATUS.STARTING) {
    return (
      <BannerShell className={`bg-white/3 border-white/10 ${className}`}>
        <RefreshCw size={15} className="text-gold/60 shrink-0 animate-spin mt-0.5 sm:mt-0" />
        <p className="text-white/50 text-xs">Connecting to deposit monitoring…</p>
      </BannerShell>
    );
  }

  // ── active ─────────────────────────────────────────────────────────────────
  if (status === MONITOR_STATUS.ACTIVE) {
    const scanCount    = session?.scan_count ?? 0;
    const maxScans     = session?.max_scans ?? 20;
    const scansPercent = maxScans > 0 ? Math.round((scanCount / maxScans) * 100) : 0;

    return (
      <BannerShell className={`bg-green-500/8 border-green-500/20 ${className}`}>
        <PulsingDot color="bg-green-400" />

        <div className="flex-1 min-w-0">
          {/* Top row: label + timer */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="text-green-300 font-semibold text-xs tracking-wide uppercase">
              Monitoring active
            </span>
            <span className="flex items-center gap-1 text-white/50 text-xs">
              <Clock size={11} />
              {fmtCountdown(secondsLeft)} remaining
            </span>
            {lastScanAt && (
              <span className="text-white/35 text-xs hidden sm:inline">
                Last check: {new Date(lastScanAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-white/55 text-xs mt-0.5 leading-snug">{message}</p>

          {/* Progress bar (scan quota) */}
          <div className="mt-2 h-0.5 bg-white/10 rounded-full w-full max-w-xs overflow-hidden">
            <div
              className="h-full bg-green-400/50 rounded-full transition-all"
              style={{ width: `${scansPercent}%` }}
            />
          </div>
          <p className="text-white/30 text-[10px] mt-0.5">
            {scanCount}/{maxScans} checks used
          </p>
        </div>

        <button
          onClick={stop}
          title="Stop monitoring"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 text-xs transition-colors"
        >
          <Square size={11} />
          <span className="hidden sm:inline">Stop</span>
        </button>
      </BannerShell>
    );
  }

  // ── expired ────────────────────────────────────────────────────────────────
  if (status === MONITOR_STATUS.EXPIRED) {
    return (
      <BannerShell className={`bg-amber-500/8 border-amber-500/20 ${className}`}>
        <WifiOff size={16} className="text-amber-400/70 shrink-0 mt-0.5 sm:mt-0" />

        <div className="flex-1 min-w-0">
          <p className="text-amber-300/90 text-xs font-medium">{expiredMessage}</p>
          {cooldownSec > 0 && (
            <p className="text-white/40 text-xs mt-0.5">
              Available to restart in {fmtCountdown(cooldownSec)}
            </p>
          )}
        </div>

        <button
          onClick={start}
          disabled={!canRestart}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            canRestart
              ? 'bg-gold/15 border-gold/30 text-gold-light hover:bg-gold/25'
              : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <RefreshCw size={12} className={canRestart ? '' : 'opacity-40'} />
          {cooldownSec > 0 ? `Wait ${fmtCountdown(cooldownSec)}` : 'Restart'}
        </button>
      </BannerShell>
    );
  }

  // ── stopped ────────────────────────────────────────────────────────────────
  if (status === MONITOR_STATUS.STOPPED) {
    return (
      <BannerShell className={`bg-white/3 border-white/10 ${className}`}>
        <Activity size={15} className="text-white/30 shrink-0 mt-0.5 sm:mt-0" />
        <p className="flex-1 text-white/45 text-xs">
          Monitoring paused. Restart to continue watching for new deposits.
        </p>
        <button
          onClick={start}
          disabled={!canRestart}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gold/15 border border-gold/30 text-gold-light text-xs font-semibold hover:bg-gold/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw size={12} />
          Restart
        </button>
      </BannerShell>
    );
  }

  // ── error ──────────────────────────────────────────────────────────────────
  if (status === MONITOR_STATUS.ERROR) {
    return (
      <BannerShell className={`bg-red-500/8 border-red-500/20 ${className}`}>
        <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5 sm:mt-0" />
        <p className="flex-1 text-red-300/80 text-xs">
          {error || 'Monitoring error — please try again.'}
        </p>
        <button
          onClick={start}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white text-xs transition-colors"
        >
          Retry
        </button>
      </BannerShell>
    );
  }

  return null;
}
