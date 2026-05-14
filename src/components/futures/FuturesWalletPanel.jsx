import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useFutures } from '@/context/FuturesContext';
import TransferModal from './TransferModal';

function Stat({ label, value, className = '' }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/60">{label}</span>
      <span className={`font-mono ${className || 'text-white'}`}>{value}</span>
    </div>
  );
}

export default function FuturesWalletPanel() {
  const { wallet, syncLocked } = useFutures();
  const [open,     setOpen]     = useState(false);
  const [syncing,  setSyncing]  = useState(false);
  const [syncMsg,  setSyncMsg]  = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await syncLocked();
      if (res?.ok) {
        const adj = Number(res.adjusted || 0);
        setSyncMsg(adj !== 0
          ? `Released ${adj.toFixed(4)} USDT of stuck margin`
          : 'Locked margin is already correct');
      } else {
        setSyncMsg(res?.error || 'Sync failed');
      }
    } catch {
      setSyncMsg('Sync failed — try again');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  const lockedMargin = Number(wallet?.used_margin || 0);

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">Margin Wallet</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setOpen(true)}
            className="px-2 py-1 text-xs rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30">
            Transfer
          </button>
        </div>
      </div>

      <Stat label="Wallet balance" value={`${Number(wallet?.wallet_balance || 0).toFixed(2)} USDT`} />
      <Stat label="Available"      value={`${Number(wallet?.available || 0).toFixed(2)} USDT`} />

      {/* Locked margin row with inline sync button */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60">Locked margin</span>
        <div className="flex items-center gap-2">
          <span className={`font-mono ${lockedMargin > 0 ? 'text-amber-300' : 'text-white'}`}>
            {lockedMargin.toFixed(2)} USDT
          </span>
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Sync locked margin — fixes any stuck amounts after closing all positions"
            className="text-white/40 hover:text-amber-300 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {syncMsg && (
        <p className="text-[10px] text-amber-300/80 pl-0.5">{syncMsg}</p>
      )}

      <Stat
        label="Unrealized PnL"
        value={`${Number(wallet?.unrealized_pnl || 0) >= 0 ? '+' : ''}${Number(wallet?.unrealized_pnl || 0).toFixed(2)} USDT`}
        className={Number(wallet?.unrealized_pnl || 0) > 0 ? 'text-emerald-300' :
                   Number(wallet?.unrealized_pnl || 0) < 0 ? 'text-rose-300' : 'text-white/70'}
      />
      <Stat label="Margin balance" value={`${Number(wallet?.margin_balance || 0).toFixed(2)} USDT`} />
      <Stat label="Free margin"    value={`${Number(wallet?.free_margin || 0).toFixed(2)} USDT`} className="text-amber-300" />
      <TransferModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
