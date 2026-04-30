import { useState } from 'react';
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
  const { wallet } = useFutures();
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">Margin Wallet</span>
        <button onClick={() => setOpen(true)}
          className="px-2 py-1 text-xs rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30">
          Transfer
        </button>
      </div>
      <Stat label="Wallet balance" value={`${Number(wallet?.wallet_balance || 0).toFixed(2)} USDT`} />
      <Stat label="Available"      value={`${Number(wallet?.available || 0).toFixed(2)} USDT`} />
      <Stat label="Locked margin"  value={`${Number(wallet?.used_margin || 0).toFixed(2)} USDT`} />
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
