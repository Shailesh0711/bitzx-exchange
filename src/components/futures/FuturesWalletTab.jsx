/**
 * FuturesWalletTab
 *
 * Self-contained "Futures" tab for the user-facing Wallet page. The user
 * wallet page lives outside of the futures trade page and therefore
 * doesn't have a ``<FuturesProvider>`` mounted in its tree, so this
 * component wraps itself in the provider — that way the rest of the
 * exchange stays unaware of futures internals.
 *
 * It surfaces:
 *   - Live margin balance + free / used breakdown
 *   - Unrealized PnL (live, from the account WS)
 *   - One-click Spot ↔ Futures transfer (via the existing modal)
 *   - Recent margin ledger entries with a "Refresh" button
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight, Wallet, TrendingUp, TrendingDown, RefreshCw, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { FuturesProvider, useFutures } from '@/context/FuturesContext';
import { futuresApi } from '@/services/futuresApi';
import TransferModal from './TransferModal';

const LEDGER_TYPE_LABELS = {
  transfer_in:      'Transfer in',
  transfer_out:     'Transfer out',
  realized_pnl:     'Realized PnL',
  funding_payment:  'Funding payment',
  funding_received: 'Funding received',
  funding:          'Funding settlement',
  fee:              'Trading fee',
  liquidation:      'Liquidation',
  liquidation_fee:  'Liquidation fee',
  margin_lock:      'Margin locked',
  margin_unlock:    'Margin released',
  adjustment:       'Adjustment',
  admin_credit:     'Admin credit',
  admin_debit:      'Admin debit',
};

/**
 * Translate a ledger direction into the signed amount the user wants to
 * see. The backend stores ``amount`` as a positive scalar plus a
 * ``direction`` discriminator — credit/unlock add to spendable balance,
 * debit/lock remove it.
 */
function signedAmount(t) {
  const amt = Math.abs(Number(t?.amount || 0));
  const dir = t?.direction;
  if (dir === 'credit' || dir === 'unlock') return  amt;
  if (dir === 'debit'  || dir === 'lock')   return -amt;
  return amt;
}

function txnLabel(t) {
  const label = LEDGER_TYPE_LABELS[t?.type] || (t?.type || '—').replace(/_/g, ' ');
  const signed = signedAmount(t);
  const color  = signed >= 0 ? 'text-emerald-300' : 'text-rose-300';
  return { label, color };
}

function fmtAmount(n) {
  const v = Number(n || 0);
  const sign = v > 0 ? '+' : v < 0 ? '' : '';
  return `${sign}${v.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
}

function balanceAfter(t) {
  if (!t?.balance_after) return 0;
  if (typeof t.balance_after === 'number') return t.balance_after;
  const av = Number(t.balance_after.available || 0);
  const lk = Number(t.balance_after.locked    || 0);
  return av + lk;
}

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function StatCard({ label, value, icon: Icon, tone = 'default', sub }) {
  const toneCls = tone === 'positive' ? 'text-emerald-300'
                : tone === 'negative' ? 'text-rose-300'
                : tone === 'gold'     ? 'text-amber-300'
                : 'text-white';
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-white/55 uppercase tracking-wider mb-2">
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className={`text-xl sm:text-2xl font-bold font-mono ${toneCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-white/45 mt-1">{sub}</div>}
    </div>
  );
}

function FuturesWalletTabInner() {
  const { wallet } = useFutures();
  const [open, setOpen]       = useState(false);
  const [txns, setTxns]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);

  const balance         = Number(wallet?.wallet_balance   || 0);
  const available       = Number(wallet?.available        || 0);
  const usedMargin      = Number(wallet?.used_margin      || 0);
  const unrealizedPnl   = Number(wallet?.unrealized_pnl   || 0);
  const marginBalance   = Number(wallet?.margin_balance   || 0);
  const freeMargin      = Number(wallet?.free_margin      || 0);
  const positionMargin  = Number(wallet?.position_margin  || usedMargin);

  const equity = marginBalance || (balance + unrealizedPnl);
  const marginRatio = equity > 0 && positionMargin > 0
    ? (positionMargin / equity) * 100
    : 0;

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await futuresApi.walletTxns({ limit: 50 });
      setTxns(Array.isArray(res?.txns) ? res.txns : (Array.isArray(res) ? res : []));
    } catch (e) {
      setErr(e?.detail || e?.message || 'failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Refetch txns whenever the wallet snapshot changes balance — this picks
  // up newly-completed transfers without spamming the endpoint on every
  // 1s account WS tick. We compare the rounded balance string so micro
  // PnL drift doesn't trigger refetches.
  const balanceKey = Number(wallet?.wallet_balance || 0).toFixed(6);
  useEffect(() => {
    if (!wallet) return;
    reload();
    // intentional: only the materialised balance, not unrealizedPnl, drives
    // a refresh. The WS-pushed `wallet` object itself is enough for stats.
  }, [balanceKey, reload, wallet]);

  const pnlTone = unrealizedPnl > 0 ? 'positive' : unrealizedPnl < 0 ? 'negative' : 'default';

  return (
    <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
      {/* ── Headline + actions ───────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-400/20 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-300/80 font-bold">
              USDT-M Futures Wallet
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {balance.toFixed(2)} <span className="text-white/60 text-base">USDT</span>
            </h2>
            <p className="text-xs text-white/55 mt-1">
              Margin balance ≈ {marginBalance.toFixed(2)} USDT
              {unrealizedPnl !== 0 && (
                <span className={unrealizedPnl > 0 ? 'text-emerald-300 ml-2' : 'text-rose-300 ml-2'}>
                  ({unrealizedPnl > 0 ? '+' : ''}{unrealizedPnl.toFixed(2)} unrealized)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm"
            >
              <ArrowLeftRight size={14} /> Transfer
            </button>
            <Link
              to="/futures/BTCUSDT-PERP"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[.05] hover:bg-white/10 text-white font-semibold text-sm border border-white/10"
            >
              <ExternalLink size={14} /> Open trading
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Available"       value={`${available.toFixed(2)} USDT`} icon={Wallet} tone="gold"
                  sub="Free for new orders & withdrawals" />
        <StatCard label="Used margin"     value={`${usedMargin.toFixed(2)} USDT`}
                  sub="Locked by open orders & positions" />
        <StatCard label="Unrealized PnL"  value={`${unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)} USDT`}
                  tone={pnlTone}
                  icon={unrealizedPnl >= 0 ? TrendingUp : TrendingDown}
                  sub="Mark-to-market PnL on open positions" />
        <StatCard label="Free margin"     value={`${freeMargin.toFixed(2)} USDT`}
                  sub="Equity − initial margin requirement" />
      </div>

      {/* ── Margin health bar ───────────────────────────────────────── */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-white/55 uppercase tracking-wider">Margin ratio</span>
          <span className="font-mono text-white">{marginRatio.toFixed(2)}%</span>
        </div>
        <div className="h-2 rounded bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded transition-all ${
              marginRatio < 40 ? 'bg-emerald-400' :
              marginRatio < 70 ? 'bg-amber-400' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, marginRatio)}%` }}
          />
        </div>
        <p className="text-[11px] text-white/45 mt-2">
          A higher ratio means more of your equity is tied up as collateral. Liquidations begin
          when the ratio approaches 100%.
        </p>
      </div>

      {/* ── Recent ledger ───────────────────────────────────────────── */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <h3 className="text-sm font-bold text-white">Recent margin ledger</h3>
          <button
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white px-2 py-1 rounded hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {err && (
          <div className="p-4 text-xs text-rose-300">{String(err)}</div>
        )}

        {!err && txns.length === 0 && (
          <div className="p-8 text-center text-white/45 text-sm">
            {loading ? 'Loading…' : 'No futures wallet activity yet. Transfer USDT from your spot wallet to start trading.'}
          </div>
        )}

        {txns.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-white/55 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5">When</th>
                  <th className="text-left px-4 py-2.5">Type</th>
                  <th className="text-right px-4 py-2.5">Amount</th>
                  <th className="text-right px-4 py-2.5">Balance after</th>
                  <th className="text-left px-4 py-2.5 hidden sm:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t, idx) => {
                  const m = txnLabel(t);
                  const signed = signedAmount(t);
                  return (
                    <tr key={t.id || `${t.created_at}-${idx}`} className="border-t border-surface-border/60 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-white/65 whitespace-nowrap">{fmtTime(t.created_at)}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs font-semibold ${m.color}`}>{m.label}</span></td>
                      <td className={`px-4 py-2.5 text-right font-mono ${signed >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {fmtAmount(signed)} <span className="text-white/40">USDT</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-white/80">
                        {balanceAfter(t).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-white/55 hidden sm:table-cell truncate max-w-[280px]">
                        {t.meta?.note || t.note || t.meta?.symbol || (t.ref_id ? `#${String(t.ref_id).slice(0, 12)}` : '')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TransferModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export default function FuturesWalletTab() {
  // Self-contained provider — keeps the rest of the wallet page agnostic
  // of futures-specific WebSocket lifecycle.
  return (
    <FuturesProvider>
      <FuturesWalletTabInner />
    </FuturesProvider>
  );
}
