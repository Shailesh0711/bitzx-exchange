// ── Constants ────────────────────────────────────────────────────────────────
const BINANCE   = 'https://api.binance.com/api/v3';
const BACKEND   = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const BZX_PRICE  = 0.4523;
const BZX_CHANGE = 2.33;
const BZX_HIGH   = 0.4812;
const BZX_LOW    = 0.4156;
const BZX_VOL    = 7_284_521;

// ── Supported pairs ──────────────────────────────────────────────────────────
export const PAIRS = [
  { symbol: 'BZXUSDT',  base: 'BZX',  source: 'internal' },
  { symbol: 'BTCUSDT',  base: 'BTC',  source: 'binance'  },
  { symbol: 'ETHUSDT',  base: 'ETH',  source: 'binance'  },
  { symbol: 'BNBUSDT',  base: 'BNB',  source: 'binance'  },
  { symbol: 'SOLUSDT',  base: 'SOL',  source: 'binance'  },
  { symbol: 'XRPUSDT',  base: 'XRP',  source: 'binance'  },
  { symbol: 'DOGEUSDT', base: 'DOGE', source: 'binance'  },
  { symbol: 'ADAUSDT',  base: 'ADA',  source: 'binance'  },
  { symbol: 'AVAXUSDT', base: 'AVAX', source: 'binance'  },
  { symbol: 'DOTUSDT',  base: 'DOT',  source: 'binance'  },
  { symbol: 'LINKUSDT', base: 'LINK', source: 'binance'  },
  { symbol: 'LTCUSDT',  base: 'LTC',  source: 'binance'  },
];

export const COIN_ICONS = {
  BZX:  'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png',
  BTC:  'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH:  'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  BNB:  'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  SOL:  'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  XRP:  'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  ADA:  'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  DOT:  'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  LTC:  'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
};

// ── BZX fallback data ────────────────────────────────────────────────────────
function bzxTicker() {
  return {
    symbol:             'BZXUSDT',
    price:              String(BZX_PRICE),
    priceChangePercent: String(BZX_CHANGE),
    priceChange:        String((BZX_PRICE * BZX_CHANGE / 100).toFixed(6)),
    highPrice:          String(BZX_HIGH),
    lowPrice:           String(BZX_LOW),
    volume:             String(BZX_VOL),
    quoteVolume:        String((BZX_VOL * BZX_PRICE).toFixed(2)),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function safeFetch(url, fallback = null) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  } catch {
    return fallback;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export const marketApi = {
  /** All markets (BZX from backend, rest from Binance) */
  async getMarkets() {
    const syms = PAIRS.filter(p => p.source === 'binance').map(p => `"${p.symbol}"`).join(',');
    const [bzxRaw, binance] = await Promise.all([
      safeFetch(`${BACKEND}/api/trading/ticker/BZXUSDT`, bzxTicker()),
      safeFetch(`${BINANCE}/ticker/24hr?symbols=[${syms}]`, []),
    ]);

    const bzx = {
      symbol: 'BZXUSDT', base: 'BZX',
      price:              bzxRaw?.price              || String(BZX_PRICE),
      priceChangePercent: bzxRaw?.priceChangePercent || String(BZX_CHANGE),
      highPrice:          bzxRaw?.highPrice           || String(BZX_HIGH),
      lowPrice:           bzxRaw?.lowPrice            || String(BZX_LOW),
      volume:             bzxRaw?.volume              || String(BZX_VOL),
      quoteVolume:        bzxRaw?.quoteVolume         || String(BZX_VOL * BZX_PRICE),
    };

    const others = Array.isArray(binance) ? binance.map(t => ({
      symbol: t.symbol,
      base:   t.symbol.replace('USDT', ''),
      price:              t.lastPrice,
      priceChangePercent: t.priceChangePercent,
      highPrice:          t.highPrice,
      lowPrice:           t.lowPrice,
      volume:             t.volume,
      quoteVolume:        t.quoteVolume,
    })) : [];

    return [bzx, ...others];
  },

  /** Single ticker */
  async getTicker(symbol) {
    if (symbol === 'BZXUSDT') {
      const d = await safeFetch(`${BACKEND}/api/trading/ticker/BZXUSDT`, bzxTicker());
      return d;
    }
    const d = await safeFetch(`${BINANCE}/ticker/24hr?symbol=${symbol}`);
    if (!d) return null;
    return { symbol: d.symbol, price: d.lastPrice, priceChangePercent: d.priceChangePercent,
             highPrice: d.highPrice, lowPrice: d.lowPrice, volume: d.volume, quoteVolume: d.quoteVolume };
  },

  /** Kline / candlestick data */
  async getKlines(symbol, interval = '1h', limit = 200) {
    if (symbol === 'BZXUSDT') {
      const d = await safeFetch(`${BACKEND}/api/trading/klines/BZXUSDT?interval=${interval}&limit=${limit}`, []);
      return d;
    }
    const raw = await safeFetch(`${BINANCE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, []);
    return raw.map(c => ({
      time:   Math.floor(c[0] / 1000),
      open:   parseFloat(c[1]),
      high:   parseFloat(c[2]),
      low:    parseFloat(c[3]),
      close:  parseFloat(c[4]),
      volume: parseFloat(c[5]),
    }));
  },

  /** Order book */
  async getOrderBook(symbol, limit = 20) {
    if (symbol === 'BZXUSDT') {
      return safeFetch(`${BACKEND}/api/trading/orderbook/BZXUSDT?limit=${limit}`, { asks: [], bids: [] });
    }
    return safeFetch(`${BINANCE}/depth?symbol=${symbol}&limit=${limit}`, { asks: [], bids: [] });
  },

  /** Recent trades */
  async getRecentTrades(symbol, limit = 50) {
    if (symbol === 'BZXUSDT') {
      return safeFetch(`${BACKEND}/api/trading/trades/BZXUSDT?limit=${limit}`, []);
    }
    const raw = await safeFetch(`${BINANCE}/trades?symbol=${symbol}&limit=${limit}`, []);
    return raw.map(t => ({ ...t, price: String(t.price), qty: String(t.qty) }));
  },
};
