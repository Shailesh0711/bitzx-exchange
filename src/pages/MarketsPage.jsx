import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Star, TrendingUp, TrendingDown, ArrowRight, RefreshCw, BarChart2 } from 'lucide-react';
import { marketApi, COIN_ICONS } from '@/services/marketApi';

const fmtP = (v, base) => {
  const n = parseFloat(v);
  if (!n) return '—';
  if (base === 'BTC') return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n >= 1 ? n.toFixed(4) : n.toFixed(6);
};
const fmtVol = v => {
  const n = parseFloat(v);
  return n >= 1e9 ? (n / 1e9).toFixed(2) + 'B'
       : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M'
       : n >= 1e3 ? (n / 1e3).toFixed(2) + 'K'
       : n.toFixed(2);
};

export default function MarketsPage() {
  const navigate = useNavigate();
  const [markets,   setMarkets]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [cat,       setCat]       = useState('All');
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem('bitzxex_favs') || '[]'); } catch { return []; } });
  const [sortKey,   setSortKey]   = useState('');
  const [sortDir,   setSortDir]   = useState(1);
  const timer = useRef(null);

  const load = () => marketApi.getMarkets().then(d => { setMarkets(d); setLoading(false); }).catch(() => setLoading(false));

  useEffect(() => { load(); timer.current = setInterval(load, 5000); return () => clearInterval(timer.current); }, []);

  const toggleFav = sym => {
    const next = favorites.includes(sym) ? favorites.filter(f => f !== sym) : [...favorites, sym];
    setFavorites(next); localStorage.setItem('bitzxex_favs', JSON.stringify(next));
  };

  const handleSort = k => {
    if (sortKey === k) setSortDir(d => -d); else { setSortKey(k); setSortDir(1); }
  };

  const filtered = markets
    .filter(m => cat === 'Favorites' ? favorites.includes(m.symbol) : cat === 'BZX' ? m.base === 'BZX' : true)
    .filter(m => !search || m.symbol?.toLowerCase().includes(search.toLowerCase()) || m.base?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortKey ? (parseFloat(a[sortKey] ?? 0) - parseFloat(b[sortKey] ?? 0)) * sortDir : 0);

  const SortTh = ({ label, field }) => (
    <th onClick={() => handleSort(field)}
      className="px-6 py-4 text-left text-sm font-semibold text-[#4A4B50] uppercase tracking-wider cursor-pointer hover:text-[#8A8B90] select-none whitespace-nowrap">
      {label} {sortKey === field && <span className="ml-1">{sortDir > 0 ? '↑' : '↓'}</span>}
    </th>
  );

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="max-w-10xl mx-auto px-4 sm:px-8 lg:px-16 2xl:px-24 py-8 sm:py-14">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 sm:mb-10">
          <div className="flex items-center gap-2.5 mb-3">
            <BarChart2 size={22} className="text-gold" />
            <span className="text-gold text-sm font-bold uppercase tracking-widest">Live Markets</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3">Market Overview</h1>
          <p className="text-lg text-[#8A8B90]">Real-time prices for all supported trading pairs. Updates every 5 seconds.</p>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-8">
          <div className="flex gap-3">
            {['All', 'Favorites', 'BZX'].map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-5 py-2 rounded-full text-base font-bold transition-colors ${
                  cat === c
                    ? 'bg-gold text-surface-dark'
                    : 'bg-surface-DEFAULT text-[#8A8B90] hover:text-white border border-surface-border'
                }`}>
                {c === 'Favorites' && <Star size={13} className="inline mr-1.5 mb-0.5" />}{c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-surface-DEFAULT border border-surface-border rounded-xl px-5 py-3">
              <Search size={17} className="text-[#4A4B50]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pairs…"
                className="bg-transparent text-base text-white outline-none w-32 sm:w-44 placeholder:text-[#4A4B50]" />
            </div>
            <button onClick={() => { setLoading(true); load(); }}
              className="p-3 rounded-xl bg-surface-DEFAULT border border-surface-border text-[#4A4B50] hover:text-white transition-colors">
              <RefreshCw size={17} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 640 }}>
            <thead className="border-b border-surface-border">
              <tr>
                <th className="px-6 py-4 w-10" />
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#4A4B50] uppercase tracking-wider">Pair</th>
                <SortTh label="Price"    field="price" />
                <SortTh label="24h %"   field="priceChangePercent" />
                <SortTh label="24h High" field="highPrice" />
                <SortTh label="24h Low"  field="lowPrice" />
                <SortTh label="Volume"   field="volume" />
                <th className="px-6 py-4 text-right text-sm font-semibold text-[#4A4B50] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-20">
                  <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-20 text-[#4A4B50] text-base">No pairs found</td></tr>
              ) : filtered.map((m, i) => {
                const pct   = parseFloat(m.priceChangePercent ?? 0);
                const isUp  = pct >= 0;
                const base  = m.base || m.symbol?.replace('USDT', '');
                const icon  = COIN_ICONS[base];
                const isFav = favorites.includes(m.symbol);
                return (
                  <motion.tr key={m.symbol}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-surface-border/50 hover:bg-white/[.025] group transition-colors">

                    {/* Favorite */}
                    <td className="px-6 py-5">
                      <button onClick={() => toggleFav(m.symbol)}>
                        <Star size={16} className={isFav ? 'text-gold fill-gold' : 'text-surface-border group-hover:text-[#4A4B50]'} />
                      </button>
                    </td>

                    {/* Pair */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        {icon
                          ? <img src={icon} alt={base} className="w-10 h-10 rounded-full" />
                          : <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-sm font-bold">{base?.slice(0, 2)}</div>
                        }
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-base">{base}</span>
                            <span className="text-[#4A4B50] text-sm">/USDT</span>
                            {base === 'BZX' && <span className="text-xs bg-gold/20 text-gold-light px-2 py-0.5 rounded font-bold">BITZX</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-5 text-white font-mono font-semibold text-base">
                      ${fmtP(m.price, base)}
                    </td>

                    {/* 24h % */}
                    <td className="px-6 py-5">
                      <span className={`flex items-center gap-1.5 font-bold text-base ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                        {isUp ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    </td>

                    {/* High / Low / Volume */}
                    <td className="px-6 py-5 text-[#8A8B90] font-mono text-base">${fmtP(m.highPrice, base)}</td>
                    <td className="px-6 py-5 text-[#8A8B90] font-mono text-base">${fmtP(m.lowPrice, base)}</td>
                    <td className="px-6 py-5 text-[#8A8B90] text-base">{fmtVol(m.volume)}</td>

                    {/* Action */}
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => navigate(`/trade/${m.symbol}`)}
                        className="inline-flex items-center gap-1.5 bg-gold/10 hover:bg-gold/25 text-gold-light border border-gold/20 text-sm font-bold px-4 py-2 rounded-lg transition-colors">
                        Trade <ArrowRight size={13} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          </div>{/* end overflow-x-auto */}
        </div>

        <p className="text-[#4A4B50] text-sm text-center mt-5">
          BZX data from BITZX backend · Other pairs from Binance public API
        </p>
      </div>
    </div>
  );
}
