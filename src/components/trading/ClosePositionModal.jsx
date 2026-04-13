import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { authFetch } from '@/context/AuthContext';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

async function parseApiError(res) {
  try {
    const j = await res.json();
    if (typeof j.detail === 'string') return j.detail;
    if (Array.isArray(j.detail)) {
      return j.detail.map(e => (typeof e === 'string' ? e : e.msg || JSON.stringify(e))).join('; ');
    }
    return res.statusText || 'Request failed';
  } catch {
    return res.statusText || 'Request failed';
  }
}

export default function ClosePositionModal({ position, onDismiss, onSuccess }) {
  const [orderType, setOrderType] = useState('market');
  const [sizeMode, setSizeMode] = useState('full');
  const [fraction, setFraction] = useState(1);
  const [amountStr, setAmountStr] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const available = Number(position?.available ?? 0);
  const locked = Number(position?.locked ?? 0);
  const totalAmt = Number(position?.amount ?? 0);

  useEffect(() => {
    setOrderType('market');
    setSizeMode('full');
    setFraction(1);
    setAmountStr('');
    setLimitPrice(position?.current_price ? String(position.current_price) : '');
    setError(null);
  }, [position]);

  if (!position) return null;

  const buildBody = () => {
    const sym = String(position.symbol || '').replace(/\//g, '').toUpperCase();
    if (!sym) throw new Error('Missing trading pair');
    const ot = orderType;
    const body = { symbol: sym, order_type: ot };
    if (ot === 'limit') {
      const p = parseFloat(limitPrice);
      if (!p || p <= 0) throw new Error('Enter a valid limit price');
      body.price = p;
    }
    if (sizeMode === 'full') {
      return body;
    }
    if (sizeMode === 'fraction') {
      const f = Number(fraction);
      if (f <= 0 || f > 1) throw new Error('Fraction must be between 0 and 1');
      body.fraction = f;
      return body;
    }
    const amt = parseFloat(amountStr);
    if (!amt || amt <= 0) throw new Error('Enter a valid amount');
    body.amount = Math.min(amt, available);
    return body;
  };

  const submit = async () => {
    setError(null);
    let body;
    try {
      body = buildBody();
    } catch (e) {
      setError(e.message);
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(`${API}/api/portfolio/close_position`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(await parseApiError(res));
        return;
      }
      onDismiss();
      try {
        await onSuccess?.();
      } catch {
        /* refresh failed — position still closed server-side */
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-pos-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[.08] shadow-2xl overflow-hidden"
        style={{ background: '#12141a' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[.06]">
          <h2 id="close-pos-title" className="text-lg font-extrabold text-white">
            Close {position.asset}
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            className="p-2 rounded-lg text-white hover:text-white hover:bg-white/[.06] transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 text-sm">
          <div className="flex justify-between gap-4 text-white">
            <span>Position size</span>
            <span className="font-mono font-bold text-white">
              {totalAmt.toLocaleString(undefined, { maximumFractionDigits: 8 })} {position.asset}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-white">
            <span>Available to sell</span>
            <span className="font-mono font-bold text-white">
              {available.toLocaleString(undefined, { maximumFractionDigits: 8 })} {position.asset}
            </span>
          </div>
          {locked > 1e-8 && (
            <div
              className="flex gap-2 items-start rounded-xl px-3 py-2.5 text-amber-200/95"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <span>
                {locked.toLocaleString(undefined, { maximumFractionDigits: 8 })} {position.asset} is locked in open
                orders. Cancel those orders first to sell the rest.
              </span>
            </div>
          )}

          <div>
            <span className="text-[11px] font-extrabold text-white uppercase tracking-widest">Order type</span>
            <div className="flex gap-2 mt-2">
              {['market', 'limit'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className={`flex-1 py-2.5 rounded-xl font-bold capitalize transition-colors ${
                    orderType === t
                      ? 'bg-gold/20 text-gold-light border border-gold/40'
                      : 'bg-white/[.04] text-white border border-transparent hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {orderType === 'limit' && (
            <div>
              <label className="text-[11px] font-extrabold text-white uppercase tracking-widest">Limit price (USDT)</label>
              <input
                type="text"
                inputMode="decimal"
                value={limitPrice}
                onChange={e => setLimitPrice(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#0d0f14] border border-white/[.08] px-4 py-3 font-mono text-white focus:outline-none focus:border-gold/50"
                placeholder="0.00"
              />
            </div>
          )}

          <div>
            <span className="text-[11px] font-extrabold text-white uppercase tracking-widest">Size</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { id: 'full', label: '100%' },
                { id: 'fraction', label: 'Partial %' },
                { id: 'amount', label: 'Amount' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSizeMode(id)}
                  className={`px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide ${
                    sizeMode === id
                      ? 'bg-gold/20 text-gold-light border border-gold/35'
                      : 'bg-white/[.04] text-white border border-transparent hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {sizeMode === 'fraction' && (
              <div className="flex flex-wrap gap-2 mt-3">
                {[0.25, 0.5, 0.75, 1].map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFraction(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold ${
                      fraction === f ? 'bg-green-500/20 text-green-400' : 'bg-white/[.04] text-white'
                    }`}
                  >
                    {f * 100}%
                  </button>
                ))}
              </div>
            )}
            {sizeMode === 'amount' && (
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="mt-2 w-full rounded-xl bg-[#0d0f14] border border-white/[.08] px-4 py-3 font-mono text-white focus:outline-none focus:border-gold/50"
                placeholder={`Max ${available}`}
              />
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm font-semibold leading-snug" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-white/[.06] bg-black/20">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-white/[.05] hover:bg-white/[.08] transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || available <= 0}
            className="flex-1 py-3 rounded-xl font-extrabold text-surface-dark bg-gradient-to-r from-gold to-gold-light hover:opacity-95 disabled:opacity-40 transition-opacity"
          >
            {submitting ? 'Submitting…' : orderType === 'market' ? 'Sell now' : 'Place limit sell'}
          </button>
        </div>
      </div>
    </div>
  );
}
