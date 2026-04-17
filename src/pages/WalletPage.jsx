import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QrImagePreview from '@/components/ui/QrImagePreview';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, Clock, BarChart2,
  CheckCircle, XCircle, AlertCircle, ChevronDown, Copy, Check,
  ExternalLink, Info, Shield,
} from 'lucide-react';
import { useAuth, authFetch } from '@/context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { COIN_ICONS, exchangeWsPath, normalizeMarketsList } from '@/services/marketApi';
import { exchangeApiOrigin } from '@/lib/apiBase';
import { MIN_WALLET_NOTIONAL_USDT } from '@/lib/walletValidation';

const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

const SUPPORTED_ASSETS = [
  'USDT', 'BZX', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'POL',
  'AVAX', 'DOT', 'LINK', 'LTC',
];

// NOTE: The deposit asset/network table is no longer hardcoded here. It is
// fetched from ``GET /api/wallet/supported-networks`` so the UI reflects
// whatever combinations the blockchain provider can actually serve (e.g.
// ETH on Sepolia in dev, or ETH+BTC on mainnet in prod). See ``DepositTab``.

const STATUS_STYLES = {
  pending:          { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20',  icon: Clock,       label: 'Pending' },
  confirming:       { color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/20',        icon: RefreshCw,   label: 'Confirming' },
  credited:         { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',    icon: CheckCircle, label: 'Credited' },
  approved:         { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',    icon: CheckCircle, label: 'Approved' },
  rejected:         { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',        icon: XCircle,     label: 'Rejected' },
  pending_kyc:      { color: 'text-amber-300',  bg: 'bg-amber-400/10 border-amber-400/20',    icon: AlertCircle, label: 'KYC required' },
  below_min:        { color: 'text-white/70',   bg: 'bg-white/5 border-white/10',             icon: AlertCircle, label: 'Below minimum' },
  orphan:           { color: 'text-white/60',   bg: 'bg-white/5 border-white/10',             icon: AlertCircle, label: 'Unassigned' },
  crediting:        { color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/20',        icon: RefreshCw,   label: 'Crediting' },
  reorg_review:     { color: 'text-red-300',    bg: 'bg-red-400/10 border-red-400/20',        icon: AlertCircle, label: 'Reorg review' },
  // Phase 6 — withdrawal request statuses.
  pending_approval: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20',  icon: Clock,       label: 'Awaiting approval' },
  broadcasting:     { color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/20',        icon: RefreshCw,   label: 'Broadcasting' },
  broadcasted:      { color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/20',        icon: RefreshCw,   label: 'In mempool' },
  confirmed:        { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',    icon: CheckCircle, label: 'Confirmed' },
  failed:           { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',        icon: XCircle,     label: 'Failed' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const Icon = s.icon;
  const label = s.label || String(status || 'pending').replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${s.bg} ${s.color}`}>
      <Icon size={11} /> {label}
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

function AssetSelect({ value, onChange, label, assets }) {
  const [open, setOpen] = useState(false);
  // Falls back to the static list so callers that don't pass ``assets``
  // (e.g. the balances tab) keep working identically. Deposit flows pass
  // the dynamic list returned by /api/wallet/supported-networks so the
  // dropdown matches whatever the blockchain provider can actually serve.
  const list = (Array.isArray(assets) && assets.length > 0) ? assets : SUPPORTED_ASSETS;
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
            {list.map(a => (
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

function DepositTab({ kycBlocked, kyc }) {
  // Supported (asset, network) combinations come from the backend —
  // GET /api/wallet/supported-networks reflects the live provider
  // configuration (which QuickNode URLs are set, mainnet vs testnet, …).
  // ``asset`` / ``network`` are empty strings until the list lands so we
  // never fire a deposit-addresses call with a combo the server can't serve.
  const [supported, setSupported]       = useState([]);
  const [netsLoading, setNetsLoading]   = useState(true);
  const [netsError, setNetsError]       = useState(null);
  const [asset,   setAsset]             = useState('');
  const [network, setNetwork]           = useState('');
  const [depositAddresses, setDepositAddresses] = useState([]);
  const [depAddrLoading, setDepAddrLoading]     = useState(false);
  const [depAddrError, setDepAddrError]         = useState(null);

  // Fetch supported networks once on mount. This endpoint is public so it
  // works the same way regardless of auth state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNetsLoading(true);
      setNetsError(null);
      try {
        const res = await fetch(`${API}/api/wallet/supported-networks`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setSupported(list);
        if (list.length > 0) {
          setAsset(list[0].asset);
          setNetwork(list[0].network);
        } else {
          setAsset('');
          setNetwork('');
        }
      } catch (e) {
        if (!cancelled) {
          setSupported([]);
          setNetsError(
            e?.message?.includes('Failed to fetch')
              ? 'Could not reach the API. Check VITE_BACKEND_URL and CORS.'
              : 'Could not load supported networks. Try again in a moment.',
          );
        }
      } finally {
        if (!cancelled) setNetsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Derived dropdown sources — unique assets, and networks for the current asset.
  const availableAssets = Array.from(new Set(supported.map(r => r.asset)));
  const networks        = supported.filter(r => r.asset === asset);

  useEffect(() => {
    // Don't hit the deposit-addresses endpoint until we know which combo
    // the provider supports; otherwise the server just returns 400.
    if (!asset || !network) {
      setDepositAddresses([]);
      setDepAddrError(null);
      setDepAddrLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setDepAddrLoading(true);
      setDepAddrError(null);
      try {
        const u = new URLSearchParams({ asset, network });
        // Phase 4 — strictly the authenticated user's HD-derived deposit
        // address. The backend no longer returns shared fallback addresses,
        // so this list has at most one row (the user's own).
        const res = await authFetch(`${API}/api/wallet/deposit-addresses?${u}`);
        if (!res.ok) {
          let detail = `Could not load deposit addresses (HTTP ${res.status}).`;
          try {
            const j = await res.json();
            if (j?.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail);
          } catch {
            /* ignore */
          }
          if (!cancelled) {
            setDepositAddresses([]);
            setDepAddrError(detail);
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setDepositAddresses(list);
      } catch (e) {
        if (!cancelled) {
          setDepositAddresses([]);
          const isNet =
            e?.name === 'TypeError'
            || (typeof e?.message === 'string' && /fetch|network|Failed to fetch/i.test(e.message));
          setDepAddrError(
            isNet
              ? 'Could not reach the API. Confirm VITE_BACKEND_URL matches your backend and that CORS allows this site.'
              : 'Could not load deposit addresses. Try again in a moment.',
          );
        }
      } finally {
        if (!cancelled) setDepAddrLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [asset, network]);

  const handleAsset = (a) => {
    setAsset(a);
    const firstForAsset = supported.find(r => r.asset === a);
    setNetwork(firstForAsset ? firstForAsset.network : '');
  };

  const personalAddress = depositAddresses[0] || null;
  const hasSupported    = supported.length > 0;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Address panel (left column — was the manual submit form) */}
      <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-1">Your Deposit Address</h3>
        <p className="text-white text-sm mb-6">
          Send funds to your personal address below. Deposits are detected on-chain and credited
          automatically once the network confirms the transaction.
        </p>

        {kycBlocked && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center gap-2 ${
            kyc?.status === 'pending'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}>
            <Shield size={16} className="flex-shrink-0" />
            <span>
              {kyc?.status === 'pending'
                ? 'Your KYC is pending admin review. You can view your deposit address, but deposits will only be credited after approval.'
                : kyc?.status === 'rejected'
                  ? 'Your KYC was rejected. Resubmit documents to unlock deposits. Your deposit address still appears below.'
                  : 'Identity verification (KYC) is required before deposits are credited. Your personal deposit address still appears below so you can prepare.'}{' '}
              <Link to="/kyc" className="font-bold underline text-gold-light">Go to KYC →</Link>
            </span>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-[11px] text-white/55 uppercase font-bold tracking-wider -mb-1">Step 1 — Asset &amp; network</p>

          {netsLoading && (
            <p className="text-xs text-white/45">Loading supported networks…</p>
          )}
          {netsError && !netsLoading && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
              <span className="font-bold text-amber-200">Could not load networks: </span>{netsError}
            </div>
          )}
          {!netsLoading && !netsError && !hasSupported && (
            <div className="rounded-xl border border-surface-border bg-surface-card/50 px-3 py-2.5 text-xs text-white/65">
              No deposit networks are currently enabled. Please check back shortly — the operator is
              still configuring the blockchain provider.
            </div>
          )}
          {hasSupported && (
            <>
              <AssetSelect value={asset} onChange={handleAsset} label="Asset" assets={availableAssets} />

              <div>
                <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Network</label>
                <select value={network} onChange={e => setNetwork(e.target.value)} required
                  className="w-full bg-surface-card border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold/50 transition-colors border-surface-border">
                  {networks.map(n => (
                    <option key={`${n.asset}-${n.network}-${n.chain || ''}`} value={n.network}>
                      {n.label ? n.label : n.network}{n.testnet ? ' · testnet' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <p className="text-[11px] text-white/55 uppercase font-bold tracking-wider pt-1">Step 2 — Scan or copy</p>

          {hasSupported && depAddrLoading && (
            <p className="text-xs text-white/45">Loading your deposit address…</p>
          )}
          {hasSupported && depAddrError && !depAddrLoading && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
              <span className="font-bold text-amber-200">Could not load address: </span>
              {depAddrError}
            </div>
          )}
          {hasSupported && !depAddrLoading && !depAddrError && personalAddress && (
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 flex flex-col sm:flex-row gap-4 items-start">
              <div className="shrink-0 bg-white p-2 rounded-xl">
                <QrImagePreview
                  key={`${personalAddress.id}-${(personalAddress.qr_payload || personalAddress.address || '').slice(0, 96)}`}
                  value={personalAddress.qr_payload || personalAddress.address}
                  size={128}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gold-light mb-2">{personalAddress.label || 'Your deposit address'}</p>
                <p className="text-[11px] text-white/45 uppercase mb-1">Address</p>
                <p className="text-sm text-white font-mono break-all leading-relaxed">{personalAddress.address}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-white/50">Copy</span>
                  <CopyBtn text={personalAddress.address} />
                </div>
              </div>
            </div>
          )}
          {hasSupported && !depAddrLoading && !depAddrError && !personalAddress && (
            <div className="rounded-xl border border-surface-border bg-surface-card/50 px-3 py-2.5 text-xs text-white/65 space-y-1.5">
              <p>
                A deposit address for <strong className="text-gold-light font-mono">{asset}</strong>{' '}
                on <strong className="text-white font-mono">{network}</strong> is not available yet.
              </p>
              <p className="text-white/50">
                The blockchain provider may not support this asset / network combination yet, or
                onboarding is still in progress. Try another network, or contact support if this
                persists.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info panel (unchanged layout) */}
      <div className="space-y-5">
        <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-6">
          <p className="text-white font-bold mb-3 flex items-center gap-2"><Info size={15} className="text-gold-light" /> How it works</p>
          <ol className="space-y-3 text-sm text-white">
            {[
              'Pick the asset and network you want to deposit.',
              'Scan the QR code or copy your personal deposit address.',
              'Send the funds from your external wallet to that address.',
              'The network confirms, we detect the transaction and credit your balance automatically.',
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
            <li>Minimum deposit: {MIN_WALLET_NOTIONAL_USDT} USDT equivalent.</li>
            <li>Your balance is credited automatically once the required confirmations are reached.</li>
            <li>Incoming transactions appear in the History tab as soon as they are detected on-chain.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Withdraw Tab ──────────────────────────────────────────────────────────────

function WithdrawTab({ walletAssets, kycBlocked, kyc }) {
  // Phase 6 — on-chain withdrawals via BlockchainProvider.send_transaction.
  // Only assets the backend can actually broadcast appear in the dropdown;
  // the same ``/api/wallet/supported-networks`` endpoint powers both tabs.
  const [supported, setSupported]     = useState([]);
  const [netsLoading, setNetsLoading] = useState(true);
  const [netsError, setNetsError]     = useState(null);

  const [asset,   setAsset]           = useState('');
  const [network, setNetwork]         = useState('');
  const [address, setAddress]         = useState('');
  const [amount,  setAmount]          = useState('');
  const [note,    setNote]            = useState('');
  const [totp,    setTotp]            = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitOk,    setSubmitOk]    = useState(null);

  // Phase 7a — fetch 2FA status so we know whether to show the TOTP input
  // (user has enrolled) and whether it's strictly required. Refreshed on
  // every mount so a user who just turned 2FA off in another tab doesn't
  // keep seeing the input.
  const [twofa, setTwofa] = useState({ enabled: false, required_for_withdrawal: false });
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API}/api/auth/2fa/status`);
        if (res.ok) setTwofa(await res.json());
      } catch { /* silent — worst case the UI just hides the field */ }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNetsLoading(true);
      setNetsError(null);
      try {
        const res = await fetch(`${API}/api/wallet/supported-networks`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setSupported(list);
        if (list.length > 0) {
          setAsset(list[0].asset);
          setNetwork(list[0].network);
        }
      } catch (e) {
        if (!cancelled) {
          setSupported([]);
          setNetsError(
            e?.message?.includes('Failed to fetch')
              ? 'Could not reach the API. Check VITE_BACKEND_URL and CORS.'
              : 'Could not load supported networks. Try again in a moment.',
          );
        }
      } finally {
        if (!cancelled) setNetsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const availableAssets = Array.from(new Set(supported.map(r => r.asset)));
  const networks        = supported.filter(r => r.asset === asset);
  const hasSupported    = supported.length > 0;

  const handleAsset = (a) => {
    setAsset(a);
    const firstForAsset = supported.find(r => r.asset === a);
    setNetwork(firstForAsset ? firstForAsset.network : '');
  };

  // Available balance for the currently selected asset (drives the Max button
  // + live balance readout). ``walletAssets`` is the canonical source from
  // AuthContext so trades and other tabs stay in sync.
  const assetRow = (walletAssets || []).find(w => w.asset === asset) || { available: 0, locked: 0 };
  const availableBalance = Number(assetRow.available || 0);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitOk(null);
    if (!asset || !network) {
      setSubmitError('Please pick an asset and network.');
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setSubmitError('Enter a valid amount.');
      return;
    }
    if (!address.trim()) {
      setSubmitError('Enter a destination address.');
      return;
    }
    if (twofa.enabled && !totp.trim()) {
      setSubmitError('Enter the code from your authenticator app (or a backup code).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(`${API}/api/wallet/withdraw`, {
        method: 'POST',
        body: JSON.stringify({
          asset, network, address: address.trim(),
          amount: amt, note: note.trim() || null,
          totp: totp.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || `Withdrawal failed (HTTP ${res.status}).`);
      }
      setSubmitOk({
        id: data?.withdrawal?.id,
        status: data?.withdrawal?.status,
        auto: !!data?.withdrawal?.auto_approved,
      });
      setAmount('');
      setAddress('');
      setNote('');
      setTotp('');
    } catch (err) {
      setSubmitError(err.message || 'Could not submit withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-1">Withdraw Funds</h3>
        <p className="text-white text-sm mb-6">
          Withdrawals are broadcast on-chain automatically. Large amounts may require admin
          review before broadcast.
        </p>

        {kycBlocked && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center gap-2 ${
            kyc?.status === 'pending'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}>
            <Shield size={16} className="flex-shrink-0" />
            <span>
              {kyc?.status === 'pending'
                ? 'Your KYC is pending review. Withdrawals unlock after approval.'
                : kyc?.status === 'rejected'
                  ? 'Your KYC was rejected. Resubmit documents to unlock withdrawals.'
                  : 'Identity verification (KYC) is required before withdrawing.'}{' '}
              <Link to="/kyc" className="font-bold underline text-gold-light">Go to KYC →</Link>
            </span>
          </div>
        )}

        {netsLoading && (
          <p className="text-xs text-white/45">Loading supported networks…</p>
        )}
        {netsError && !netsLoading && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
            <span className="font-bold text-amber-200">Could not load networks: </span>{netsError}
          </div>
        )}
        {!netsLoading && !netsError && !hasSupported && (
          <div className="rounded-xl border border-surface-border bg-surface-card/50 px-3 py-2.5 text-xs text-white/65">
            No withdrawal networks are currently enabled. Please check back shortly.
          </div>
        )}

        {hasSupported && (
          <form onSubmit={onSubmit} className="space-y-4">
            <AssetSelect value={asset} onChange={handleAsset} label="Asset" assets={availableAssets} />

            <div>
              <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Network</label>
              <select value={network} onChange={e => setNetwork(e.target.value)} required
                className="w-full bg-surface-card border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold/50 transition-colors border-surface-border">
                {networks.map(n => (
                  <option key={`${n.asset}-${n.network}-${n.chain || ''}`} value={n.network}>
                    {n.label ? n.label : n.network}{n.testnet ? ' · testnet' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Destination address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="0x… or bc1…"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs text-white uppercase tracking-wider">Amount ({asset})</label>
                <span className="text-[11px] text-white/60">
                  Available: <span className="text-white font-mono">{availableBalance.toFixed(6)}</span>
                  <button type="button"
                    onClick={() => setAmount(availableBalance > 0 ? String(availableBalance) : '')}
                    className="ml-2 text-gold-light hover:text-gold font-bold">Max</button>
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                step="any"
                min="0"
                placeholder="0.00"
                className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">Note <span className="text-white/40 normal-case">(optional, for your records)</span></label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={200}
                placeholder="e.g. personal wallet"
                className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            {twofa.enabled && (
              <div>
                <label className="block text-xs text-white mb-1.5 uppercase tracking-wider">
                  2FA code <span className="text-white/40 normal-case">(authenticator or backup code)</span>
                </label>
                <input
                  type="text"
                  value={totp}
                  onChange={e => setTotp(e.target.value)}
                  autoComplete="one-time-code"
                  inputMode="text"
                  placeholder="123 456 or backup code"
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-sm text-white font-mono tracking-widest outline-none focus:border-gold/50 transition-colors"
                />
              </div>
            )}
            {!twofa.enabled && twofa.required_for_withdrawal && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100 flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  Two-factor authentication is required for withdrawals. Enable 2FA in your{' '}
                  <Link to="/profile" className="font-bold underline">Profile → Security</Link> first.
                </span>
              </div>
            )}

            {submitError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-100 flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}
            {submitOk && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-xs text-green-100 flex items-start gap-2">
                <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  Withdrawal <span className="font-mono">{submitOk.id}</span> submitted — status{' '}
                  <span className="font-bold">{submitOk.status}</span>
                  {submitOk.auto ? ' (auto-approved; broadcasting shortly)' : ' (awaiting admin approval)'}.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || kycBlocked}
              className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark disabled:bg-gold/40 text-black font-bold py-3.5 rounded-xl transition-colors"
            >
              {submitting ? (<><RefreshCw size={16} className="animate-spin" /> Submitting…</>)
                : (<><ArrowUpCircle size={16} /> Submit withdrawal</>)}
            </button>
          </form>
        )}
      </div>

      <div className="space-y-5">
        <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-6">
          <p className="text-white font-bold mb-3 flex items-center gap-2"><Info size={15} className="text-gold-light" /> How it works</p>
          <ol className="space-y-3 text-sm text-white">
            {[
              'Pick the asset, network and paste your destination address.',
              'We lock the amount (plus the platform fee) in your balance the moment you submit.',
              'Small withdrawals auto-broadcast on-chain; larger ones wait for admin approval.',
              'Once the network confirms the transaction, the lock is released from your balance.',
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
            <li>Double-check the destination address — on-chain sends are irreversible.</li>
            <li>Withdrawals to the platform&apos;s own deposit addresses are blocked.</li>
            <li>Network fees come out of the treasury; you are charged the platform fee rate on top of your amount.</li>
            <li>Track progress and tx hashes in the History tab.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab() {
  // Phase 6 — two sub-tabs. Deposits come from ``/api/wallet/deposit-events``
  // (blockchain sightings), withdrawals from ``/api/wallet/withdrawals``
  // (user-initiated on-chain sends). Status badge + confirmation progress
  // are shared across both, so this stays one component.
  const [subTab, setSubTab]   = useState('deposits');
  const [events,  setEvents]  = useState([]);
  const [wds,     setWds]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dRes, wRes] = await Promise.all([
        authFetch(`${API}/api/wallet/deposit-events?limit=200`),
        authFetch(`${API}/api/wallet/withdrawals?limit=200`),
      ]);
      if (!dRes.ok) {
        const j = await dRes.json().catch(() => ({}));
        throw new Error(j?.detail || `Could not load deposits (HTTP ${dRes.status}).`);
      }
      if (!wRes.ok) {
        const j = await wRes.json().catch(() => ({}));
        throw new Error(j?.detail || `Could not load withdrawals (HTTP ${wRes.status}).`);
      }
      const dData = await dRes.json();
      const wData = await wRes.json();
      setEvents(Array.isArray(dData.items) ? dData.items : []);
      setWds(Array.isArray(wData.items) ? wData.items : []);
    } catch (e) {
      setError(e.message || 'Could not load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const depositRows = events
    .slice()
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const withdrawRows = wds
    .slice()
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  const fmt = iso => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '—');
  const fmtAmt = (amount, asset) => Number(amount || 0).toFixed(asset === 'USDT' ? 2 : 6);
  const subTabBtn = (id, label) => (
    <button key={id}
      onClick={() => setSubTab(id)}
      className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
        subTab === id ? 'bg-gold/20 text-gold-light' : 'text-white/70 hover:text-white'
      }`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border border-surface-border rounded-xl p-1 bg-surface-DEFAULT">
          {subTabBtn('deposits', 'Deposits')}
          {subTabBtn('withdrawals', 'Withdrawals')}
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-white hover:text-white transition-colors disabled:opacity-40">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && !loading && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-start gap-2">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {subTab === 'deposits' && (
        <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-white">
              <RefreshCw size={20} className="animate-spin" /> Loading deposits…
            </div>
          ) : depositRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white">
              <Clock size={32} />
              <p>No on-chain deposits detected yet</p>
              <p className="text-xs text-white/50 max-w-sm text-center">
                Send funds to your personal deposit address from the Deposit tab — we&apos;ll record
                and credit them here automatically once the network confirms.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] text-white uppercase tracking-wider border-b border-surface-border">
                    {['Date', 'Type', 'Asset', 'Amount', 'Tx Hash', 'Network', 'Confirmations', 'Status'].map(h => (
                      <th key={h} className={`px-5 py-3 ${h === 'Status' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {depositRows.map(r => (
                    <tr key={`${r.asset}-${r.network}-${r.tx_hash}-${r.address}`} className="border-b border-surface-border/40 hover:bg-white/[.02] transition-colors">
                      <td className="px-5 py-3 text-xs text-white whitespace-nowrap">{fmt(r.created_at)}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
                          <ArrowDownCircle size={12} /> Deposit
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-white font-bold">{r.asset}</td>
                      <td className="px-5 py-3 text-sm text-white font-mono">{fmtAmt(r.amount, r.asset)}</td>
                      <td className="px-5 py-3 text-xs text-white font-mono">
                        <span className="flex items-center gap-1">
                          {(r.tx_hash || '—').slice(0, 16)}…
                          {r.tx_hash && <CopyBtn text={r.tx_hash} />}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-white whitespace-nowrap">{r.network}</td>
                      <td className="px-5 py-3 text-xs text-white whitespace-nowrap font-mono">
                        {Number.isFinite(Number(r.threshold)) && Number(r.threshold) > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <span className={Number(r.confirmations ?? 0) >= Number(r.threshold) ? 'text-green-400' : 'text-white/80'}>
                              {Math.min(Number(r.confirmations ?? 0), Number(r.threshold))}
                            </span>
                            <span className="text-white/40">/</span>
                            <span className="text-white/70">{Number(r.threshold)}</span>
                          </span>
                        ) : (
                          Number(r.confirmations ?? 0)
                        )}
                      </td>
                      <td className="px-5 py-3 text-right"><StatusBadge status={r.status || 'pending'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'withdrawals' && (
        <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-white">
              <RefreshCw size={20} className="animate-spin" /> Loading withdrawals…
            </div>
          ) : withdrawRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white">
              <Clock size={32} />
              <p>No withdrawals yet</p>
              <p className="text-xs text-white/50 max-w-sm text-center">
                Submit a withdrawal from the Withdraw tab — small amounts are broadcast
                on-chain automatically, larger ones are sent to admin for approval first.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] text-white uppercase tracking-wider border-b border-surface-border">
                    {['Date', 'Asset', 'Amount', 'Fee', 'Destination', 'Tx Hash', 'Network', 'Confirmations', 'Status'].map(h => (
                      <th key={h} className={`px-5 py-3 ${h === 'Status' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withdrawRows.map(r => (
                    <tr key={r.id} className="border-b border-surface-border/40 hover:bg-white/[.02] transition-colors">
                      <td className="px-5 py-3 text-xs text-white whitespace-nowrap">{fmt(r.created_at)}</td>
                      <td className="px-5 py-3 text-sm text-white font-bold">{r.asset}</td>
                      <td className="px-5 py-3 text-sm text-white font-mono">{fmtAmt(r.amount, r.asset)}</td>
                      <td className="px-5 py-3 text-xs text-white/70 font-mono">{fmtAmt(r.fee_amount, r.asset)}</td>
                      <td className="px-5 py-3 text-xs text-white font-mono">
                        <span className="flex items-center gap-1">
                          {(r.address || '—').slice(0, 10)}…{(r.address || '').slice(-6)}
                          {r.address && <CopyBtn text={r.address} />}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-white font-mono">
                        {r.tx_hash ? (
                          <span className="flex items-center gap-1">
                            {r.tx_hash.slice(0, 16)}…
                            <CopyBtn text={r.tx_hash} />
                          </span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-white whitespace-nowrap">{r.network}</td>
                      <td className="px-5 py-3 text-xs text-white whitespace-nowrap font-mono">
                        {Number.isFinite(Number(r.threshold)) && Number(r.threshold) > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <span className={Number(r.confirmations ?? 0) >= Number(r.threshold) ? 'text-green-400' : 'text-white/80'}>
                              {Math.min(Number(r.confirmations ?? 0), Number(r.threshold))}
                            </span>
                            <span className="text-white/40">/</span>
                            <span className="text-white/70">{Number(r.threshold)}</span>
                          </span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right"><StatusBadge status={r.status || 'pending_approval'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
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
            {tab === 'deposit'   && <DepositTab kycBlocked={kycBlocked} kyc={kyc} />}
            {tab === 'withdraw'  && <WithdrawTab walletAssets={walletAssets} kycBlocked={kycBlocked} kyc={kyc} />}
            {tab === 'history'   && <HistoryTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
