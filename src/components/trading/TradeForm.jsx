import { useState } from 'react';
import { Wallet, TrendingUp, AlertCircle, CheckCircle, Shield, Clock } from 'lucide-react';
import { useAuth, authFetch } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const API  = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const PCTS = [25, 50, 75, 100];

export default function TradeForm({ symbol, currentPrice }) {
  const { user, balance, fetchWallet, fetchOrders, kyc } = useAuth();
  const navigate = useNavigate();
  const base = symbol.replace('USDT', '');

  const [side,    setSide]    = useState('buy');
  const [type,    setType]    = useState('limit');
  const [price,   setPrice]   = useState('');
  const [amount,  setAmount]  = useState('');
  const [placing, setPlacing] = useState(false);
  const [result,  setResult]  = useState(null);

  const isBuy    = side === 'buy';
  const isMarket = type === 'market';
  const effPrice = isMarket ? parseFloat(currentPrice || 0) : parseFloat(price || 0);
  const total    = effPrice * parseFloat(amount || 0);
  const avail    = isBuy ? (balance?.USDT || 0) : (balance?.[base] || 0);

  const setPct = pct => {
    if (isBuy) setAmount(((avail * (pct / 100)) / (effPrice || 1)).toFixed(6));
    else       setAmount(((avail * pct) / 100).toFixed(6));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!user)                                            { navigate('/login'); return; }
    if (!amount || parseFloat(amount) <= 0)              return;
    if (!isMarket && (!price || parseFloat(price) <= 0)) return;

    setPlacing(true);
    setResult(null);
    try {
      const body = {
        symbol, side, type,
        amount: parseFloat(amount),
        ...(isMarket ? {} : { price: parseFloat(price) }),
      };
      const res  = await authFetch(`${API}/api/orders`, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Order placement failed');
      setResult({ ok: true, order: data });
      setAmount('');
      if (!isMarket) setPrice('');
      await Promise.all([fetchWallet(), fetchOrders()]);
      setTimeout(() => setResult(null), 5500);
    } catch (err) {
      setResult({ ok: false, error: err.message });
      setTimeout(() => setResult(null), 7000);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-DEFAULT">

      {/* Buy / Sell tabs */}
      <div className="flex border-b border-surface-border flex-shrink-0">
        {['buy', 'sell'].map(s => (
          <button key={s} onClick={() => setSide(s)}
            className={`flex-1 py-4 text-base font-extrabold capitalize transition-colors border-b-2 tracking-wide ${
              side === s
                ? s === 'buy'
                  ? 'border-green-400 text-green-400 bg-green-500/[.07]'
                  : 'border-red-400 text-red-400 bg-red-500/[.07]'
                : 'border-transparent text-[#4A4B50] hover:text-[#8A8B90]'
            }`}>
            {s === 'buy' ? `▲ Buy ${base}` : `▼ Sell ${base}`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scrollbar-hide">

        {/* Order type */}
        <div className="flex gap-2 bg-surface-card rounded-xl p-1.5">
          {['limit', 'market'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2.5 text-sm capitalize rounded-lg font-bold transition-colors ${
                type === t ? 'bg-surface-hover text-white shadow' : 'text-[#4A4B50] hover:text-[#8A8B90]'
              }`}>{t === 'limit' ? 'Limit' : 'Market'}</button>
          ))}
        </div>

        {/* Available balance */}
        <div className="flex items-center justify-between text-sm text-[#8A8B90] px-1">
          <span className="flex items-center gap-1.5 font-semibold">
            <Wallet size={14} /> Available
          </span>
          <span className="text-white font-mono font-bold text-base">
            {isBuy
              ? `${avail.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`
              : `${avail.toFixed(6)} ${base}`}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Price input */}
          {!isMarket ? (
            <div>
              <label className="block text-xs text-[#4A4B50] mb-2 uppercase tracking-widest font-extrabold">
                Price (USDT)
              </label>
              <div className="flex items-center bg-surface-card border border-surface-border rounded-xl px-4 py-3.5 focus-within:border-gold/60 transition-colors">
                <input
                  type="number" step="any" min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder={currentPrice || '0.0000'}
                  className="flex-1 bg-transparent text-lg text-white outline-none font-mono font-semibold"
                />
                <span className="text-sm text-[#4A4B50] ml-2 font-bold flex-shrink-0">USDT</span>
              </div>
            </div>
          ) : (
            <div className="bg-surface-card border border-surface-border rounded-xl px-4 py-3.5 flex justify-between items-center">
              <span className="text-sm text-[#4A4B50] font-bold">Market Price</span>
              <span className="text-lg text-white font-mono font-bold">{currentPrice || '—'}</span>
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="block text-xs text-[#4A4B50] mb-2 uppercase tracking-widest font-extrabold">
              Amount ({base})
            </label>
            <div className="flex items-center bg-surface-card border border-surface-border rounded-xl px-4 py-3.5 focus-within:border-gold/60 transition-colors">
              <input
                type="number" step="any" min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.0000"
                className="flex-1 bg-transparent text-lg text-white outline-none font-mono font-semibold"
              />
              <span className="text-sm text-[#4A4B50] ml-2 font-bold flex-shrink-0">{base}</span>
            </div>
          </div>

          {/* % quick-fill buttons */}
          <div className="grid grid-cols-4 gap-2">
            {PCTS.map(pct => (
              <button key={pct} type="button" onClick={() => setPct(pct)}
                className="py-3 text-sm rounded-xl bg-surface-card text-[#4A4B50]
                  hover:bg-gold/10 hover:text-gold-light
                  border border-surface-border transition-colors font-bold">
                {pct}%
              </button>
            ))}
          </div>

          {/* Total + fee */}
          <div className="bg-surface-card border border-surface-border rounded-xl px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4A4B50] font-semibold">Order Total</span>
              <span className="text-base text-white font-mono font-bold">
                {total.toFixed(4)} USDT
              </span>
            </div>
            {amount && parseFloat(amount) > 0 && (
              <div className="flex items-center justify-between text-xs text-[#4A4B50] pt-1 border-t border-surface-border/60">
                <span className="font-semibold">Est. Fee (0.1%)</span>
                <span className="font-mono font-bold text-[#6B6B70]">
                  {isBuy
                    ? `${(parseFloat(amount) * 0.001).toFixed(6)} ${base}`
                    : `${(total * 0.001).toFixed(4)} USDT`}
                </span>
              </div>
            )}
          </div>

          {/* Not logged in */}
          {!user && (
            <div className="text-center py-2">
              <p className="text-sm text-[#4A4B50] mb-3">Sign in to start trading</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => navigate('/login')}
                  className="flex-1 py-3 bg-gold/90 hover:bg-gold text-surface-dark font-bold rounded-xl text-sm transition-all">
                  Log In
                </button>
                <button type="button" onClick={() => navigate('/register')}
                  className="flex-1 py-3 border border-gold/30 text-gold-light hover:bg-gold/10 font-bold rounded-xl text-sm transition-all">
                  Register
                </button>
              </div>
            </div>
          )}

          {/* KYC gate */}
          {user && kyc?.status !== 'approved' && (
            <div className={`rounded-xl p-4 border ${
              kyc?.status === 'pending'
                ? 'bg-amber-500/8 border-amber-500/25'
                : 'bg-red-500/8 border-red-500/25'
            }`}>
              <p className={`font-extrabold flex items-center gap-2 mb-2 text-sm ${
                kyc?.status === 'pending' ? 'text-amber-300' : 'text-red-300'}`}>
                {kyc?.status === 'pending'
                  ? <><Clock size={14} /> KYC Under Review</>
                  : <><Shield size={14} /> KYC Verification Required</>}
              </p>
              <p className="text-[#8A8B90] text-xs mb-3 leading-relaxed">
                {kyc?.status === 'pending'
                  ? 'Your documents are being reviewed. Trading will be enabled once approved.'
                  : kyc?.status === 'rejected'
                  ? 'Your KYC was rejected. Please resubmit with valid documents.'
                  : 'Complete identity verification to start trading on BITZX Exchange.'}
              </p>
              <Link to="/kyc"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold ${
                  kyc?.status === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-gold/20 text-gold-light hover:bg-gold/30'
                } transition-colors`}>
                <Shield size={13} />
                {kyc?.status === 'pending' ? 'Check Status' : kyc?.status === 'rejected' ? 'Resubmit KYC' : 'Verify Now →'}
              </Link>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={placing || !amount || parseFloat(amount) <= 0 || (user && kyc?.status !== 'approved')}
            className={`w-full py-4 rounded-xl font-extrabold text-base tracking-wider
              transition-all disabled:opacity-40 active:scale-[.98] ${
              isBuy
                ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-900/30'
                : 'bg-red-500   hover:bg-red-400   text-white shadow-lg shadow-red-900/30'
            }`}>
            {placing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Placing Order…
              </span>
            ) : isBuy
              ? `Buy ${base}`
              : `Sell ${base}`}
          </button>
        </form>

        {/* Result toast */}
        {result && (
          <div className={`rounded-xl p-4 space-y-2 ${
            result.ok
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            {result.ok ? (
              <>
                <p className="text-sm text-green-400 font-extrabold flex items-center gap-2">
                  <CheckCircle size={15} />
                  {result.order.status === 'filled' ? 'Order Filled!' : `Order Placed (${result.order.status})`}
                </p>
                <p className="text-sm text-[#8A8B90] font-mono">
                  {result.order.side.toUpperCase()}{' '}
                  {result.order.filled > 0 ? result.order.filled.toFixed(4) : result.order.amount.toFixed(4)}{' '}
                  {base}
                  {result.order.avg_price > 0 && ` @ $${result.order.avg_price.toFixed(4)}`}
                </p>
                {result.order.total_fee > 0 && (
                  <p className="text-xs text-[#4A4B50] font-mono">
                    Fee: {result.order.total_fee.toFixed(6)} {result.order.total_fee_asset}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-red-400 flex items-center gap-2 font-semibold">
                <AlertCircle size={15} /> {result.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
