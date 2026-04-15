// ── Constants ────────────────────────────────────────────────────────────────
import { exchangeApiOrigin } from '@/lib/apiBase';

const BACKEND = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

/**
 * WebSocket origin for `/api/ws/...` paths.
 * Set `VITE_WS_URL` (e.g. `wss://api.yourdomain.com`) if sockets are on a different host than `VITE_BACKEND_URL`.
 */
const WS_ORIGIN = (import.meta.env.VITE_WS_URL || String(BACKEND).replace(/^http/, 'ws')).replace(/\/$/, '');

/** Build full `ws://` / `wss://` URL for exchange streams (public or `token=` auth). */
export function exchangeWsPath(pathWithQuery) {
  const p = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  return `${WS_ORIGIN}${p}`;
}

const BZX_PRICE  = 0.4523;
const BZX_CHANGE = 2.33;
const BZX_HIGH   = 0.4812;
const BZX_LOW    = 0.4156;
const BZX_VOL    = 7_284_521;

// ── Supported pairs (must match backend SYMBOL_BASE_MAP / BINANCE_USDT_PAIRS + BZX) ──
export const PAIRS = [
  { symbol: 'BZXUSDT',  base: 'BZX',  source: 'internal' },
  { symbol: 'BTCUSDT',  base: 'BTC',  source: 'binance'  },
  { symbol: 'ETHUSDT',  base: 'ETH',  source: 'binance'  },
  { symbol: 'BNBUSDT',  base: 'BNB',  source: 'binance'  },
  { symbol: 'SOLUSDT',  base: 'SOL',  source: 'binance'  },
  { symbol: 'XRPUSDT',  base: 'XRP',  source: 'binance'  },
  { symbol: 'DOGEUSDT', base: 'DOGE', source: 'binance'  },
  { symbol: 'ADAUSDT',  base: 'ADA',  source: 'binance'  },
  { symbol: 'POLUSDT', base: 'POL', source: 'binance' },
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
  POL: 'https://assets.coingecko.com/coins/images/32440/small/polygon.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  DOT:  'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  LTC:  'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
};

function bzxTickerFallback() {
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

async function safeFetch(url, fallback = null) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  } catch {
    return fallback;
  }
}

/** Normalize `/api/trading/markets` row → legacy client shape */
function normalizeMarketRow(m) {
  if (!m || !m.symbol) return null;
  const base = m.base ?? m.baseAsset ?? m.symbol.replace('USDT', '');
  const src = m.source ?? (m.symbol === 'BZXUSDT' ? 'internal' : 'binance');
  const px = parseFloat(m.price || 0);
  const spr = px * 0.0004;
  return {
    symbol: m.symbol,
    base,
    source: src,
    price: m.price,
    priceChange: m.priceChange,
    priceChangePercent: m.priceChangePercent,
    openPrice: m.openPrice,
    highPrice: m.highPrice,
    lowPrice: m.lowPrice,
    volume: m.volume,
    quoteVolume: m.quoteVolume,
    weightedAvgPrice: m.weightedAvgPrice ?? m.price,
    bidPrice: m.bidPrice ?? String(Math.max(px - spr / 2, 1e-8)),
    askPrice: m.askPrice ?? String(px + spr / 2),
    prevClosePrice: m.prevClosePrice,
    count: m.count != null ? String(m.count) : undefined,
  };
}

export function normalizeMarketsList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeMarketRow).filter(Boolean);
}

export const marketApi = {
  /** All markets — single backend call (BZX + Binance batch server-side) */
  async getMarkets() {
    const raw = await safeFetch(`${BACKEND}/api/trading/markets`, null);
    return normalizeMarketsList(raw);
  },

  async getTicker(symbol) {
    const sym = symbol.toUpperCase();
    const d = await safeFetch(`${BACKEND}/api/trading/ticker/${sym}`, sym === 'BZXUSDT' ? bzxTickerFallback() : null);
    if (!d) return null;
    if (sym === 'BZXUSDT') return d;
    return {
      symbol:             d.symbol,
      price:              d.price,
      priceChangePercent: d.priceChangePercent,
      priceChange:        d.priceChange,
      highPrice:          d.highPrice,
      lowPrice:           d.lowPrice,
      volume:             d.volume,
      quoteVolume:        d.quoteVolume,
      openPrice:          d.openPrice,
      bidPrice:           d.bidPrice,
      askPrice:           d.askPrice,
    };
  },

  async getKlines(symbol, interval = '1h', limit = 200) {
    const sym = symbol.toUpperCase();
    const d = await safeFetch(
      `${BACKEND}/api/trading/klines/${sym}?interval=${encodeURIComponent(interval)}&limit=${limit}`,
      [],
    );
    return Array.isArray(d) ? d : [];
  },

  async getOrderBook(symbol, limit = 20) {
    const sym = symbol.toUpperCase();
    return safeFetch(
      `${BACKEND}/api/trading/orderbook/${sym}?limit=${limit}`,
      { asks: [], bids: [] },
    );
  },

  async getRecentTrades(symbol, limit = 50) {
    const sym = symbol.toUpperCase();
    const d = await safeFetch(`${BACKEND}/api/trading/trades/${sym}?limit=${limit}`, []);
    return Array.isArray(d) ? d : [];
  },
};
