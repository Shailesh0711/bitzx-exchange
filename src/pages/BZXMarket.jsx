import { useMemo, useState } from 'react';
import BZXChart from '@/components/BZXChart/BZXChart';
import OrderBook from '@/components/trading/OrderBook';
import BZXTicker from '@/components/BZXTicker/BZXTicker';
import TradeForm from '@/components/trading/TradeForm';
import { useBZXMarket } from '@/hooks/useBZXMarket';
import { displayBaseForApiSymbol } from '@/services/marketApi';

const SYMBOLS = ['BZXUSDT', 'BTCBZX', 'ETHBZX', 'SOLBZX'];

function baseFromSymbol(symbol) {
  if (symbol.endsWith('USDT')) return symbol.slice(0, -4);
  if (symbol.endsWith('BZX')) return symbol.slice(0, -3);
  return symbol;
}

export default function BZXMarket({ initialSymbol = 'BZXUSDT', embedded = false }) {
  const [symbol, setSymbol] = useState(
    SYMBOLS.includes(String(initialSymbol).toUpperCase()) ? String(initialSymbol).toUpperCase() : 'BZXUSDT',
  );
  const [interval, setInterval] = useState('1m');
  const { candles, orderbook, trades, ticker, connected, loading, error } = useBZXMarket({ symbol, interval });
  const base = useMemo(() => baseFromSymbol(symbol), [symbol]);
  
  const displayBase = displayBaseForApiSymbol(symbol);
  const livePrice = ticker?.price ?? null;

  return (
    <div className="bg-[#0a0b0f] min-h-screen flex flex-col h-screen overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-[#0d0f14] flex items-center gap-2 flex-wrap shrink-0">
        {SYMBOLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSymbol(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
              s === symbol ? 'text-gold-light border-gold/50 bg-gold/10' : 'text-white/70 border-white/10 hover:text-white'
            }`}
          >
            {s.replace('USDT', '/USDT').replace('BZX', '/BZX')}
          </button>
        ))}
        {error && <span className="ml-2 text-xs font-bold text-red-400">{error}</span>}
        <span className={`ml-auto text-xs font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>
          {connected ? 'LIVE' : 'DISCONNECTED'}
        </span>
      </div>

      <div className="shrink-0">
        <BZXTicker ticker={ticker} />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Column 1: Chart */}
        <div className="flex-1 min-w-0 border-r border-white/10 relative">
          <BZXChart candles={candles} interval={interval} onIntervalChange={setInterval} fill loading={loading} />
        </div>
        
        {/* Column 2: OrderBook */}
        <div className="flex flex-col w-[340px] shrink-0 border-r border-white/10 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <OrderBook 
              symbol={symbol} 
              baseAsset={displayBase} 
              lastPrice={livePrice} 
              bookOverride={orderbook} 
            />
          </div>
        </div>

        {/* Column 3: Trade Form */}
        <div className="w-[420px] shrink-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <TradeForm symbol={symbol} lastPrice={livePrice} />
          </div>
          {!embedded && (
            <div className="px-4 py-3 text-xs text-white/50 border-t border-white/10 shrink-0 bg-[#0d0f14]">
              Trading form executes through existing engine. This page only replaces BZX market visualization.
              {base ? ` Pair base: ${base}` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
