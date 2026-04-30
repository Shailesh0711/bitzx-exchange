import { useEffect, useState } from 'react';
import { useFutures } from '@/context/FuturesContext';

export default function LeverageSelector({ symbol, max }) {
  const { settings, setLeverage, leverageOptions } = useFutures();
  const cur = settings[symbol]?.leverage ?? 10;
  const [value, setValue] = useState(cur);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { setValue(cur); }, [cur]);

  const opts = (leverageOptions || []).filter((l) => !max || l <= max);

  const apply = async (v) => {
    setBusy(true); setErr(null);
    try { await setLeverage(symbol, v); setValue(v); }
    catch (e) { setErr(e.message || 'failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>Leverage</span>
        <span className="font-mono text-white">{value}x</span>
      </div>
      <input
        type="range"
        min={Math.min(...opts) || 1}
        max={Math.max(...opts) || 125}
        value={value}
        disabled={busy}
        onChange={(e) => setValue(Number(e.target.value))}
        onMouseUp={(e) => apply(Number(e.target.value))}
        onTouchEnd={(e) => apply(Number(e.target.value))}
        className="w-full mt-2 accent-amber-400"
      />
      <div className="flex flex-wrap gap-1 mt-2">
        {opts.map((l) => (
          <button
            key={l}
            disabled={busy}
            onClick={() => apply(l)}
            className={`px-2 py-1 rounded text-xs font-mono ${
              value === l ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {l}x
          </button>
        ))}
      </div>
      {err && <div className="text-xs text-rose-400 mt-2">{err}</div>}
    </div>
  );
}
