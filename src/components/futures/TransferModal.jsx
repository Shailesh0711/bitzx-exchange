import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFutures } from '@/context/FuturesContext';

export default function TransferModal({ open, onClose }) {
  const { balance } = useAuth();
  const { wallet, transfer } = useFutures();
  const [direction, setDirection] = useState('spot_to_futures');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  if (!open) return null;

  const spotAvail   = Number(balance?.USDT || 0);
  const futAvail    = Number(wallet?.available || 0);
  const max         = direction === 'spot_to_futures' ? spotAvail : futAvail;

  const submit = async () => {
    setErr(null); setOk(null); setBusy(true);
    try {
      await transfer({ direction, asset: 'USDT', amount: Number(amount) });
      setOk('Transfer complete');
      setAmount('');
    } catch (e) { setErr(e?.detail || e?.message || 'transfer failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#0d1018] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Transfer USDT</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDirection('spot_to_futures')}
            className={`py-2 rounded text-xs font-medium ${
              direction === 'spot_to_futures' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                              : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
          >Spot → Futures</button>
          <button
            onClick={() => setDirection('futures_to_spot')}
            className={`py-2 rounded text-xs font-medium ${
              direction === 'futures_to_spot' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                              : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
          >Futures → Spot</button>
        </div>

        <div className="text-xs text-white/60 flex justify-between">
          <span>Source available</span>
          <span className="font-mono text-white">{max.toFixed(2)} USDT</span>
        </div>

        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-white/50">Amount</span>
          <div className="flex gap-2 mt-1">
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono" />
            <button onClick={() => setAmount(String(max))}
              className="px-3 py-2 rounded bg-white/5 text-white/80 text-xs hover:bg-white/10">Max</button>
          </div>
        </label>

        {err && <div className="text-xs text-rose-400">{String(err)}</div>}
        {ok &&  <div className="text-xs text-emerald-400">{ok}</div>}

        <button disabled={busy || !amount || Number(amount) <= 0 || Number(amount) > max}
          onClick={submit}
          className="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-sm font-semibold disabled:opacity-40">
          {busy ? 'Transferring…' : 'Transfer'}
        </button>
      </div>
    </div>
  );
}
