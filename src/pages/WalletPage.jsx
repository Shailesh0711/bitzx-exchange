import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, Clock, BarChart2,
  CheckCircle, XCircle, AlertCircle, ChevronDown, Copy, Check,
  ExternalLink, Info, Shield,
} from 'lucide-react';
import { useAuth, authFetch } from '@/context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { COIN_ICONS, exchangeWsPath, normalizeMarketsList } from '@/services/marketApi';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const SUPPORTED_ASSETS = [
  'USDT', 'BZX', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'POL',
  'AVAX', 'DOT', 'LINK', 'LTC',
];

const ASSET_NETWORKS = {
  USDT: ['BEP-20 (BNB Chain)', 'ERC-20 (Ethereum)', 'TRC-20 (Tron)'],
  BZX:  ['BEP-20 (BNB Chain)'],
  BTC:  ['Bitcoin Network', 'BEP-20 (BNB Chain)'],
  ETH:  ['ERC-20 (Ethereum)', 'BEP-20 (BNB Chain)'],
  BNB:  ['BEP-20 (BNB Chain)'],
  SOL:  ['Solana'],
  XRP:  ['XRP Ledger', 'BEP-20 (BNB Chain)'],
  DOGE: ['Dogecoin Network', 'BEP-20 (BNB Chain)'],
  ADA:  ['Cardano', 'BEP-20 (BNB Chain)'],
  POL: ['Polygon PoS', 'BEP-20 (BNB Chain)'],
  AVAX: ['Avalanche C-Chain', 'BEP-20 (BNB Chain)'],
  DOT:  ['Polkadot', 'BEP-20 (BNB Chain)'],
  LINK: ['ERC-20 (Ethereum)', 'BEP-20 (BNB Chain)'],
  LTC:  ['Litecoin Network', 'BEP-20 (BNB Chain)'],
};

const STATUS_STYLES = {
  pending:  { color: 'text-yellow-400',  bg: 'bg-yellow-400/10 border-yellow-400/20', icon: Clock },
  approved: { color: 'text-green-400',   bg: 'bg-green-400/10 border-green-400/20',   icon: CheckCircle },
  rejected: { color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20',        icon: XCircle },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${s.bg} ${s.color} capitalize`}>
      <Icon size={11} /> {status}
    </span>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-white hover:text-gold-light transition-colors ml-1">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

function AssetSelect({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {label && <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">{label}</label>}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between bg-surface-card border border-surface-border rounded-xl px-4 py-3 focus:border-gold/50 transition-colors">
        <div className="flex items-center gap-2.5">
          {COIN_ICONS[value]
            ? <img src={COIN_ICONS[value]} alt={value} className="w-6 h-6 rounded-full" />
            : <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-[10px] font-bold">{value?.slice(0, 2)}</div>}
          <span className="text-white font-semibold">{value}</span>
        </div>
        <ChevronDown size={14} className={`text-white transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden">
            {SUPPORTED_ASSETS.map(a => (
              <button key={a} type="button"
                onClick={() => { onChange(a); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-hover transition-colors ${a === value ? 'text-gold-light' : 'text-white'}`}>
                {COIN_ICONS[a]
                  ? <img src={COIN_ICONS[a]} alt={a} className="w-5 h-5 rounded-full" />
                  : <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-[10px] font-bold">{a.slice(0, 2)}</div>}
                <span className="text-sm font-semibold">{a}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Balances Tab ─────────────────────────────────────────────────────────────

function BalancesTab({ walletAssets, walletLoading, fetchWallet, priceByAsset }) {
  const px = a => (a === 'USDT' ? 1 : (priceByAsset[a] ?? 0));
  const totalUSD = walletAssets.reduce((s, w) => s + (w.available + w.locked) * px(w.asset), 0);
  const availUSD = walletAssets.reduce((s, w) => s + w.available * px(w.asset), 0);

  return (
    <div className="space-y-6">
      {/* Total value strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Portfolio', value: `$${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-white' },
          { label: 'Available',       value: `$${availUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-green-400' },
          { label: 'Locked',          value: `$${(totalUSD - availUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-5">
            <p className="text-white text-xs mb-1 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Asset table */}
      <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <p className="text-white font-bold text-lg">Your Assets</p>
          <button onClick={fetchWallet} disabled={walletLoading}
            className="flex items-center gap-1.5 text-xs text-white hover:text-white transition-colors disabled:opacity-40">
            <RefreshCw size={13} className={walletLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] text-white uppercase tracking-wider border-b border-surface-border">
                {['Asset', 'Available', 'Locked', 'Total', 'Value (USD)', 'Actions'].map(h => (
                  <th key={h} className={`px-6 py-3 ${h === 'Asset' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {walletAssets.map(w => {
                const total = w.available + w.locked;
                const usd   = total * px(w.asset);
                const icon  = COIN_ICONS[w.asset];
                return (
                  <tr key={w.asset} className="border-b border-surface-border/40 hover:bg-white/[.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {icon ? <img src={icon} alt={w.asset} className="w-8 h-8 rounded-full" />
                               : <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-xs font-bold">{w.asset.slice(0, 2)}</div>}
                        <span className="text-white font-bold">{w.asset}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-green-400 font-mono font-semibold">
                      {w.available.toFixed(w.asset === 'USDT' ? 2 : 6)}
                    </td>
                    <td className="px-6 py-4 text-right text-yellow-400 font-mono font-semibold">
                      {w.locked.toFixed(w.asset === 'USDT' ? 2 : 6)}
                    </td>
                    <td className="px-6 py-4 text-right text-white font-mono">
                      {total.toFixed(w.asset === 'USDT' ? 2 : 6)}
                    </td>
                    <td className="px-6 py-4 text-right text-white font-semibold">
                      ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          to={`/trade/${w.asset}USDT?side=buy`}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-colors"
                        >
                          Buy
                        </Link>
                        {w.asset !== 'USDT' && (
                          <Link
                            to={`/trade/${w.asset}USDT?side=sell`}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                              w.available > 1e-12
                                ? 'bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/25'
                                : 'bg-white/[.04] text-white/35 border-white/10 pointer-events-none cursor-not-allowed'
                            }`}
                            title={w.available <= 1e-12 ? 'No available balance to sell' : 'Sell spot balance'}
                            aria-disabled={w.available <= 1e-12}
                            onClick={e => { if (w.available <= 1e-12) e.preventDefault(); }}
                          >
                            Sell
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Deposit Tab ───────────────────────────────────────────────────────────────

function DepositTab({ fetchWallet, kycBlocked, kyc }) {
  const [asset,   setAsset]   = useState('USDT');
  const [amount,  setAmount]  = useState('');
  const [txHash,  setTxHash]  = useState('');
  const [network, setNetwork] = useState(ASSET_NETWORKS['USDT'][0]);
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null); // {ok, message}

  const networks = ASSET_NETWORKS[asset] || [];

  const handleAsset = (a) => {
    setAsset(a);
    setNetwork(ASSET_NETWORKS[a]?.[0] || '');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (kycBlocked) {
      setResult({
        ok: false,
        message: kyc?.status === 'pending'
          ? 'KYC is under review. Deposits unlock after an administrator approves your application.'
          : 'Complete identity verification (KYC) before submitting a deposit request.',
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res  = await authFetch(`${API}/api/wallet/deposit`, {
        method: 'POST',
        body:   JSON.stringify({ asset, amount: parseFloat(amount), tx_hash: txHash, network, notes: notes || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      setResult({ ok: true, id: data.id, message: `Deposit request submitted (ID: ${data.id}). An admin will credit your balance after verification.` });
      setAmount(''); setTxHash(''); setNotes('');
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Form */}
      <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-1">Submit Deposit Request</h3>
        <p className="text-white text-sm mb-6">Send funds to our wallet address, then submit your transaction hash for verification.</p>

        {kycBlocked && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center gap-2 ${
            kyc?.status === 'pending'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}>
            <Shield size={16} className="flex-shrink-0" />
            <span>
              {kyc?.status === 'pending'
                ? 'Your KYC is pending admin review. You can submit deposits after approval.'
                : kyc?.status === 'rejected'
                  ? 'Your KYC was rejected. Resubmit documents to enable deposits.'
                  : 'Verify your identity (KYC) before depositing.'}{' '}
              <Link to="/kyc" className="font-bold underline text-gold-light">Go to KYC →</Link>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AssetSelect value={asset} onChange={handleAsset} label="Asset" />

          {/* Network */}
          <div>
            <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Network</label>
            <select value={network} onChange={e => setNetwork(e.target.value)} required
              className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold/50 transition-colors">
              {networks.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Amount</label>
            <div className="flex items-center bg-surface-card border border-surface-border rounded-xl px-4 py-3 focus-within:border-gold/50 transition-colors">
              <input type="number" step="any" min="0" value={amount} onChange={e => setAmount(e.target.value)} required
                placeholder="0.00" className="flex-1 bg-transparent text-sm text-white outline-none font-mono" />
              <span className="text-xs text-white font-semibold">{asset}</span>
            </div>
          </div>

          {/* TX Hash */}
          <div>
            <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Transaction Hash / Reference</label>
            <div className="flex items-center bg-surface-card border border-surface-border rounded-xl px-4 py-3 focus-within:border-gold/50 transition-colors">
              <input type="text" value={txHash} onChange={e => setTxHash(e.target.value)} required
                placeholder="0x..." className="flex-1 bg-transparent text-sm text-white outline-none font-mono" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Any extra information for the admin..."
              className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-gold/50 transition-colors resize-none" />
          </div>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`rounded-xl p-4 text-sm flex items-start gap-2 ${result.ok ? 'bg-green-500/10 border border-green-500/25 text-green-400' : 'bg-red-500/10 border border-red-500/25 text-red-400'}`}>
                {result.ok ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />}
                {result.message}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={loading || kycBlocked}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold to-gold-light text-surface-dark font-bold py-3.5 rounded-xl hover:scale-[1.01] active:scale-[.99] transition-all disabled:opacity-50">
            {loading ? <div className="w-5 h-5 border-2 border-surface-dark border-t-transparent rounded-full animate-spin" /> : <><ArrowDownCircle size={16} /> Submit Deposit Request</>}
          </button>
        </form>
      </div>

      {/* Info panel */}
      <div className="space-y-5">
        <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-6">
          <p className="text-white font-bold mb-3 flex items-center gap-2"><Info size={15} className="text-gold-light" /> How it works</p>
          <ol className="space-y-3 text-sm text-white">
            {[
              'Select the asset and network you\'ll send from.',
              'Transfer funds to our deposit wallet address.',
              'Paste your transaction hash and submit.',
              'Our team verifies and credits your account (usually within 1–3 hours).',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-gold/20 text-gold-light text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-5">
          <p className="text-yellow-400 font-semibold text-sm flex items-center gap-1.5 mb-2"><AlertCircle size={14} /> Important</p>
          <ul className="text-xs text-white space-y-1.5 list-disc list-inside">
            <li>Always send on the correct network to avoid permanent loss.</li>
            <li>Minimum deposit: 10 USDT equivalent.</li>
            <li>Deposits are credited after 1 network confirmation.</li>
            <li>This is a demo platform — no real funds are involved.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Withdraw Tab ──────────────────────────────────────────────────────────────

function WithdrawTab({ walletAssets, fetchWallet, kycBlocked, kyc }) {
  const [asset,   setAsset]   = useState('USDT');
  const [amount,  setAmount]  = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState(ASSET_NETWORKS['USDT'][0]);
  const [memo,    setMemo]    = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const networks    = ASSET_NETWORKS[asset] || [];
  const walletEntry = walletAssets.find(w => w.asset === asset);
  const available   = walletEntry?.available || 0;

  const handleAsset = (a) => {
    setAsset(a);
    setNetwork(ASSET_NETWORKS[a]?.[0] || '');
    setAmount('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (kycBlocked) {
      setResult({
        ok: false,
        message: kyc?.status === 'pending'
          ? 'KYC is under review. Withdrawals unlock after an administrator approves your application.'
          : 'Complete identity verification (KYC) before requesting a withdrawal.',
      });
      return;
    }
    if (parseFloat(amount) > available) {
      setResult({ ok: false, message: `Insufficient balance. You have ${available} ${asset} available.` });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res  = await authFetch(`${API}/api/wallet/withdraw`, {
        method: 'POST',
        body:   JSON.stringify({ asset, amount: parseFloat(amount), address, network, memo: memo || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      setResult({ ok: true, message: `Withdrawal request submitted (ID: ${data.id}). Funds moved to locked. You will be notified once processed.` });
      setAmount(''); setAddress(''); setMemo('');
      await fetchWallet(); // refresh balance to show new locked amount
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Form */}
      <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-1">Withdraw Funds</h3>
        <p className="text-white text-sm mb-6">Submit a withdrawal request. Funds will be locked immediately and released after admin approval.</p>

        {kycBlocked && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center gap-2 ${
            kyc?.status === 'pending'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}>
            <Shield size={16} className="flex-shrink-0" />
            <span>
              {kyc?.status === 'pending'
                ? 'Your KYC is pending admin review. Withdrawals are available after approval.'
                : kyc?.status === 'rejected'
                  ? 'Your KYC was rejected. Resubmit documents to enable withdrawals.'
                  : 'Verify your identity (KYC) before withdrawing.'}{' '}
              <Link to="/kyc" className="font-bold underline text-gold-light">Go to KYC →</Link>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AssetSelect value={asset} onChange={handleAsset} label="Asset" />

          {/* Available balance hint */}
          <div className="flex items-center justify-between text-xs text-white bg-surface-card border border-surface-border rounded-lg px-3 py-2">
            <span className="flex items-center gap-1"><Wallet size={11} /> Available</span>
            <span className="text-white font-mono font-semibold">{available.toFixed(asset === 'USDT' ? 2 : 6)} {asset}</span>
          </div>

          {/* Network */}
          <div>
            <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Network</label>
            <select value={network} onChange={e => setNetwork(e.target.value)} required
              className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold/50 transition-colors">
              {networks.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Amount</label>
            <div className="flex items-center bg-surface-card border border-surface-border rounded-xl px-4 py-3 focus-within:border-gold/50 transition-colors">
              <input type="number" step="any" min="0" max={available} value={amount} onChange={e => setAmount(e.target.value)} required
                placeholder="0.00" className="flex-1 bg-transparent text-sm text-white outline-none font-mono" />
              <button type="button" onClick={() => setAmount(String(available))}
                className="text-[10px] font-bold text-gold-light hover:text-gold bg-gold/10 px-2 py-0.5 rounded mr-2 transition-colors">MAX</button>
              <span className="text-xs text-white font-semibold">{asset}</span>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Destination Wallet Address</label>
            <div className="flex items-center bg-surface-card border border-surface-border rounded-xl px-4 py-3 focus-within:border-gold/50 transition-colors">
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} required
                placeholder="0x..." className="flex-1 bg-transparent text-sm text-white outline-none font-mono" />
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Memo / Tag (optional)</label>
            <input type="text" value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="For exchanges that require a memo or tag..."
              className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold/50 transition-colors" />
          </div>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`rounded-xl p-4 text-sm flex items-start gap-2 ${result.ok ? 'bg-green-500/10 border border-green-500/25 text-green-400' : 'bg-red-500/10 border border-red-500/25 text-red-400'}`}>
                {result.ok ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />}
                {result.message}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={loading || kycBlocked || !amount || parseFloat(amount) <= 0}
            className="w-full flex items-center justify-center gap-2 bg-red-500/80 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl hover:scale-[1.01] active:scale-[.99] transition-all disabled:opacity-50">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><ArrowUpCircle size={16} /> Submit Withdrawal Request</>}
          </button>
        </form>
      </div>

      {/* Info panel */}
      <div className="space-y-5">
        <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-6">
          <p className="text-white font-bold mb-3 flex items-center gap-2"><Info size={15} className="text-gold-light" /> Withdrawal Process</p>
          <ol className="space-y-3 text-sm text-white">
            {[
              'Submit your withdrawal request with destination address.',
              'Funds are immediately moved from available → locked.',
              'An admin reviews and processes the transfer.',
              'Once sent, your locked balance is deducted and the transfer is complete.',
              'If rejected, locked funds are returned to your available balance.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-gold/20 text-gold-light text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-5">
          <p className="text-yellow-400 font-semibold text-sm flex items-center gap-1.5 mb-2"><AlertCircle size={14} /> Before You Withdraw</p>
          <ul className="text-xs text-white space-y-1.5 list-disc list-inside">
            <li>Double-check the destination address — transfers are irreversible.</li>
            <li>Ensure the network matches where you are receiving funds.</li>
            <li>Processing time: typically 1–24 hours on business days.</li>
            <li>Minimum withdrawal: 10 USDT equivalent.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab() {
  const [deposits,     setDeposits]     = useState([]);
  const [withdrawals,  setWithdrawals]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, wRes] = await Promise.all([
        authFetch(`${API}/api/wallet/deposits`),
        authFetch(`${API}/api/wallet/withdrawals`),
      ]);
      if (dRes.ok) setDeposits(await dRes.json());
      if (wRes.ok) setWithdrawals(await wRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const all = [
    ...deposits.map(d => ({ ...d, kind: 'deposit' })),
    ...withdrawals.map(w => ({ ...w, kind: 'withdrawal' })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const filtered = activeFilter === 'all'       ? all
                 : activeFilter === 'deposits'   ? all.filter(r => r.kind === 'deposit')
                 : all.filter(r => r.kind === 'withdrawal');

  const fmt = iso => new Date(iso).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="space-y-4">
      {/* Filter tabs + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border border-surface-border rounded-xl p-1 bg-surface-DEFAULT overflow-x-auto scrollbar-hide">
          {['all', 'deposits', 'withdrawals'].map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${activeFilter === f ? 'bg-gold/20 text-gold-light' : 'text-white hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-white hover:text-white transition-colors disabled:opacity-40">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-white">
            <RefreshCw size={20} className="animate-spin" /> Loading history…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-white">
            <Clock size={32} />
            <p>No {activeFilter === 'all' ? '' : activeFilter} transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-white uppercase tracking-wider border-b border-surface-border">
                  {['Date', 'Type', 'Asset', 'Amount', 'Reference', 'Network', 'Status'].map(h => (
                    <th key={h} className={`px-5 py-3 ${h === 'Date' || h === 'Type' || h === 'Asset' ? 'text-left' : h === 'Status' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-surface-border/40 hover:bg-white/[.02] transition-colors">
                    <td className="px-5 py-3 text-xs text-white whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${r.kind === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {r.kind === 'deposit' ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                        {r.kind === 'deposit' ? 'Deposit' : 'Withdrawal'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-white font-bold">{r.asset}</td>
                    <td className="px-5 py-3 text-sm text-white font-mono">{r.amount.toFixed(r.asset === 'USDT' ? 2 : 6)}</td>
                    <td className="px-5 py-3 text-xs text-white font-mono">
                      <span className="flex items-center gap-1">
                        {(r.tx_hash || r.address || '—').slice(0, 16)}…
                        {(r.tx_hash || r.address) && <CopyBtn text={r.tx_hash || r.address} />}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-white whitespace-nowrap">{r.network}</td>
                    <td className="px-5 py-3 text-right"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main WalletPage ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'balances',    label: 'Balances',    icon: Wallet },
  { id: 'deposit',     label: 'Deposit',     icon: ArrowDownCircle },
  { id: 'withdraw',    label: 'Withdraw',    icon: ArrowUpCircle },
  { id: 'history',     label: 'History',     icon: Clock },
];

function tabFromSearchParams(params) {
  const t = params.get('tab');
  return TABS.some(x => x.id === t) ? t : 'balances';
}

export default function WalletPage() {
  const { user, walletAssets, walletLoading, fetchWallet, kyc, fetchKyc } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => tabFromSearchParams(searchParams));
  const [priceByAsset, setPriceByAsset] = useState({ USDT: 1 });
  const kycBlocked = user && kyc?.status !== 'approved';

  useEffect(() => {
    const url = exchangeWsPath('/api/ws/exchange/markets');
    let closed = false;
    let reconnectTimer = null;
    let ws = null;
    const applyRows = (rows) => {
      if (!Array.isArray(rows)) return;
      const m = { USDT: 1 };
      for (const row of rows) {
        const b = row.base || row.symbol?.replace('USDT', '');
        if (b) m[b] = parseFloat(row.price) || 0;
      }
      setPriceByAsset(m);
    };
    const connect = () => {
      if (closed) return;
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const j = JSON.parse(ev.data);
          if (j.type === 'exchange_markets' && Array.isArray(j.markets)) {
            applyRows(normalizeMarketsList(j.markets));
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        ws = null;
        if (!closed) reconnectTimer = window.setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  useEffect(() => {
    setTab(tabFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (user && (tab === 'deposit' || tab === 'withdraw')) fetchKyc();
  }, [user, tab, fetchKyc]);

  const selectTab = id => {
    setTab(id);
    if (id === 'balances') setSearchParams({}, { replace: true });
    else setSearchParams({ tab: id }, { replace: true });
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-surface-dark w-full overflow-x-hidden">
      <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-white/70 text-sm mb-1">Manage your funds</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex flex-wrap items-center gap-3">
            <Wallet className="text-gold-light flex-shrink-0" size={26} /> Wallet
          </h1>
          <p className="text-white/60 text-sm mt-1 truncate max-w-full">{user.email}</p>
        </motion.div>

        {/* Tabs + actions — one toolbar row uses full width without duplicating balance stats */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-surface-border pb-0 mb-6 w-full min-w-0">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px flex-1 min-w-0">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} type="button" onClick={() => selectTab(t.id)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex-shrink-0 ${
                    tab === t.id ? 'border-gold text-gold-light' : 'border-transparent text-white/85 hover:text-white'
                  }`}>
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2 shrink-0 pb-3 sm:pb-0 justify-end">
            <button
              type="button"
              onClick={() => fetchWallet()}
              disabled={walletLoading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold border border-surface-border
                text-white hover:border-gold/40 hover:bg-white/[.04] transition-all disabled:opacity-40"
            >
              <RefreshCw size={14} className={walletLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              to="/trade/BZXUSDT"
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold
                bg-gradient-to-r from-gold to-gold-light text-surface-dark hover:opacity-95 transition-opacity"
            >
              <BarChart2 size={14} /> Trade
            </Link>
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {tab === 'balances'  && <BalancesTab walletAssets={walletAssets} walletLoading={walletLoading} fetchWallet={fetchWallet} priceByAsset={priceByAsset} />}
            {tab === 'deposit'   && <DepositTab fetchWallet={fetchWallet} kycBlocked={kycBlocked} kyc={kyc} />}
            {tab === 'withdraw'  && <WithdrawTab walletAssets={walletAssets} fetchWallet={fetchWallet} kycBlocked={kycBlocked} kyc={kyc} />}
            {tab === 'history'   && <HistoryTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
