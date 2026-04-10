import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, ArrowRight,
  BarChart2, Clock, CheckCircle, XCircle, Copy, Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { COIN_ICONS } from '@/services/marketApi';

const PRICES = { USDT:1, BZX:0.4523, BTC:84500, ETH:3200, BNB:580, SOL:145 };

// Simulated portfolio value chart
const CHART_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: `Apr ${i + 1}`,
  value: 5000 + Math.sin(i * 0.4) * 400 + i * 60 + Math.random() * 200,
}));

const TABS = ['Portfolio','Orders','History'];

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="text-[#4A4B50] hover:text-gold-light transition-colors">
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

function PortfolioTab({ walletAssets }) {
  const totalUSD = walletAssets.reduce((s, w) => s + (w.available + w.locked) * (PRICES[w.asset] || 0), 0);

  return (
    <div className="space-y-6">
      {/* Total value */}
      <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-6">
        <p className="text-[#4A4B50] text-sm mb-1">Total Portfolio Value</p>
        <p className="text-4xl font-extrabold text-white mb-1">
          ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-green-400 text-sm font-semibold flex items-center gap-1">
          <TrendingUp size={14} /> +$284.50 (+3.2%) today
        </p>
      </div>

      {/* Chart */}
      <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-bold">Portfolio Performance</p>
          <div className="flex gap-1">
            {['7D','1M','3M','1Y'].map(p => (
              <button key={p} className="px-2.5 py-1 text-xs rounded bg-surface-card text-[#4A4B50] hover:text-white hover:bg-surface-hover transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={CHART_DATA}>
            <defs>
              <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9C7941" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#9C7941" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill:'#4A4B50', fontSize:10 }} tickLine={false} axisLine={false} interval={6} />
            <YAxis tick={{ fill:'#4A4B50', fontSize:10 }} tickLine={false} axisLine={false}
              tickFormatter={v => `$${(v/1000).toFixed(1)}K`} width={48} />
            <Tooltip
              contentStyle={{ background:'#12141a', border:'1px solid #2a2d35', borderRadius:8, fontSize:12 }}
              labelStyle={{ color:'#8A8B90' }}
              formatter={v => [`$${v.toFixed(2)}`, 'Value']} />
            <Area type="monotone" dataKey="value" stroke="#9C7941" strokeWidth={2} fill="url(#pv)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Asset list — shows available + locked */}
      <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <p className="text-white font-bold">Your Assets</p>
          <Link to="/wallet" className="text-xs text-gold-light hover:underline flex items-center gap-1">
            Manage <ArrowRight size={11} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] text-[#4A4B50] uppercase tracking-wider border-b border-surface-border">
                <th className="px-5 py-2 text-left">Asset</th>
                <th className="px-5 py-2 text-right">Available</th>
                <th className="px-5 py-2 text-right">Locked</th>
                <th className="px-5 py-2 text-right">Value (USD)</th>
                <th className="px-5 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {walletAssets.map(w => {
                const usd  = (w.available + w.locked) * (PRICES[w.asset] || 0);
                const icon = COIN_ICONS[w.asset];
                return (
                  <tr key={w.asset} className="border-b border-surface-border/50 hover:bg-white/[.025] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {icon ? <img src={icon} alt={w.asset} className="w-8 h-8 rounded-full" />
                               : <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-xs font-bold">{w.asset.slice(0,2)}</div>}
                        <span className="text-white font-bold">{w.asset}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-green-400 font-mono font-semibold">
                      {w.available.toFixed(w.asset === 'USDT' ? 2 : 6)}
                    </td>
                    <td className="px-5 py-3 text-right text-yellow-400 font-mono">
                      {w.locked.toFixed(w.asset === 'USDT' ? 2 : 6)}
                    </td>
                    <td className="px-5 py-3 text-right text-white font-semibold">
                      ${usd.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {w.asset !== 'USDT' && (
                        <Link to={`/trade/${w.asset}USDT`}
                          className="text-xs text-gold-light bg-gold/10 hover:bg-gold/20 border border-gold/20 px-3 py-1 rounded-lg transition-colors inline-flex items-center gap-1">
                          Trade <ArrowRight size={11} />
                        </Link>
                      )}
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

function OrdersTab({ orders }) {
  const fmt  = iso => new Date(iso).toLocaleString('en-US',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  const fmtP = v => { const n = parseFloat(v); return n >= 1000 ? n.toLocaleString(undefined,{maximumFractionDigits:2}) : n >= 1 ? n.toFixed(4) : n.toFixed(6); };
  return (
    <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
        <p className="text-white font-bold">All Orders</p>
        <span className="text-[#4A4B50] text-xs">{orders.length} total</span>
      </div>
      {orders.length===0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#4A4B50]">
          <Clock size={32} />
          <p>No orders yet</p>
          <Link to="/trade/BZXUSDT" className="text-gold-light text-sm hover:underline">Start Trading →</Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 560 }}>
          <thead className="border-b border-surface-border">
            <tr className="text-[11px] text-[#4A4B50] uppercase tracking-wider">
              {['Date','Pair','Type','Side','Price','Amount / Filled','Status'].map(h => (
                <th key={h} className="px-5 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b border-surface-border/50 hover:bg-white/[.025]">
                <td className="px-5 py-2.5 text-xs text-[#4A4B50]">{fmt(o.created_at)}</td>
                <td className="px-5 py-2.5 text-sm text-white font-bold">{o.symbol}</td>
                <td className="px-5 py-2.5 text-xs text-[#8A8B90] capitalize">{o.type}</td>
                <td className="px-5 py-2.5">
                  <span className={`text-xs font-bold ${o.side==='buy'?'text-green-400':'text-red-400'}`}>{o.side?.toUpperCase()}</span>
                </td>
                <td className="px-5 py-2.5 text-sm text-white font-mono">
                  {o.type === 'market'
                    ? <span className="text-[#8A8B90]">MKT</span>
                    : `$${fmtP(o.avg_price > 0 ? o.avg_price : o.price)}`}
                </td>
                <td className="px-5 py-2.5 text-sm text-[#D5D5D0] font-mono">
                  {o.filled > 0 ? `${o.filled.toFixed(4)} / ` : ''}{o.amount.toFixed(4)}
                </td>
                <td className="px-5 py-2.5">
                  <span className={`flex items-center gap-1 text-xs font-semibold capitalize ${
                    o.status==='filled'?'text-green-400':o.status==='cancelled'?'text-red-400':
                    o.status==='partially_filled'?'text-blue-400':'text-[#8A8B90]'
                  }`}>
                    {o.status==='filled'?<CheckCircle size={11}/>:o.status==='cancelled'?<XCircle size={11}/>:<Clock size={11}/>}
                    {o.status.replace('_',' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user, walletAssets, balance, openOrders, orderHistory } = useAuth();
  const [tab, setTab] = useState('Portfolio');

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} className="mb-8">
          <div className="flex flex-wrap items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[#4A4B50] text-sm mb-1">Welcome back,</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{user.name}</h1>
              <p className="text-[#4A4B50] text-xs mt-1 flex items-center gap-1.5">
                {user.email}
                <CopyBtn text={user.email} />
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Link to="/wallet"
                className="flex items-center gap-2 border border-surface-border text-[#D5D5D0] hover:border-gold/40 hover:text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm">
                <Wallet size={15} /> Wallet
              </Link>
              <Link to="/trade/BZXUSDT"
                className="flex items-center gap-2 bg-gradient-to-r from-gold to-gold-light text-surface-dark font-bold px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] text-sm">
                <BarChart2 size={16} /> Trade Now
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon:Wallet,       label:'USDT Balance',  value:`$${(balance?.USDT||0).toFixed(2)}`,                                   color:'text-gold-light' },
            { icon:TrendingUp,   label:'BZX Holdings',  value:`${(walletAssets.find(w=>w.asset==='BZX')?.available||0).toLocaleString(undefined,{maximumFractionDigits:0})} BZX`, color:'text-blue-400'  },
            { icon:ArrowUpRight, label:'Open Orders',   value:`${openOrders.length}`,                                              color:'text-green-400' },
            { icon:CheckCircle,  label:'Filled Orders', value:`${orderHistory.filter(o=>o.status==='filled').length}`,                color:'text-green-400' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.08 }}
              className="bg-surface-DEFAULT border border-surface-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={15} className={s.color} />
                <span className="text-[#4A4B50] text-xs">{s.label}</span>
              </div>
              <p className="text-white font-bold text-lg">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-surface-border mb-6 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${
                tab===t ? 'border-gold text-gold-light' : 'border-transparent text-[#4A4B50] hover:text-[#8A8B90]'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab==='Portfolio' && <PortfolioTab walletAssets={walletAssets} />}
        {tab==='Orders'    && <OrdersTab orders={openOrders} />}
        {tab==='History'   && <OrdersTab orders={orderHistory} />}
      </div>
    </div>
  );
}
