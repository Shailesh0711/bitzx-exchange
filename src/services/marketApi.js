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
  { symbol: 'BZXUSDT',  base: 'BZX',  quote: 'USDT', source: 'internal' },
  { symbol: 'BTCUSDT',  base: 'BTC',  quote: 'USDT', source: 'binance'  },
  { symbol: 'ETHUSDT',  base: 'ETH',  quote: 'USDT', source: 'binance'  },
  { symbol: 'BNBUSDT',  base: 'BNB',  quote: 'USDT', source: 'binance'  },
  { symbol: 'SOLUSDT',  base: 'SOL',  quote: 'USDT', source: 'binance'  },
  { symbol: 'XRPUSDT',  base: 'XRP',  quote: 'USDT', source: 'binance'  },
  { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT', source: 'binance'  },
  { symbol: 'ADAUSDT',  base: 'ADA',  quote: 'USDT', source: 'binance'  },
  { symbol: 'POLUSDT',  base: 'POL',  quote: 'USDT', source: 'binance'  },
  { symbol: 'AVAXUSDT', base: 'AVAX', quote: 'USDT', source: 'binance'  },
  { symbol: 'DOTUSDT',  base: 'DOT',  quote: 'USDT', source: 'binance'  },
  { symbol: 'LINKUSDT', base: 'LINK', quote: 'USDT', source: 'binance'  },
  { symbol: 'LTCUSDT',  base: 'LTC',  quote: 'USDT', source: 'binance'  },
  // BZX-quoted pairs
  { symbol: 'BTCBZX',  base: 'BTC',  quote: 'BZX',  source: 'internal' },
  { symbol: 'ETHBZX',  base: 'ETH',  quote: 'BZX',  source: 'internal' },
  { symbol: 'BNBBZX',  base: 'BNB',  quote: 'BZX',  source: 'internal' },
  { symbol: 'SOLBZX',  base: 'SOL',  quote: 'BZX',  source: 'internal' },
  { symbol: 'XRPBZX',  base: 'XRP',  quote: 'BZX',  source: 'internal' },
  { symbol: 'DOGEBZX', base: 'DOGE', quote: 'BZX',  source: 'internal' },
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

/** Backend wire symbol for the internal BZX pair. */
export const INTERNAL_SPOT_SYMBOL = 'BZXUSDT';

/** Route `/trade/BZXUSDT` → API symbol (identity for bitzx). */
export function apiSymbolFromRouteParam(param) {
  return String(param || '').trim().toUpperCase();
}

const SPOT_SYMBOL_SET = new Set(PAIRS.map((p) => p.symbol));

/** BZX-quoted pair from route, e.g. USDDBZX (includes dynamic Web3 catalog pairs). */
export function isBzxQuotedRouteSymbol(param) {
  const upper = apiSymbolFromRouteParam(param);
  return Boolean(upper && /^[A-Z0-9]{2,12}BZX$/.test(upper) && upper !== 'BZXBZX');
}

/** Valid spot pair from `/trade/:symbol`, or null if unknown / empty. */
export function tradeSymbolFromRouteParam(param) {
  const upper = apiSymbolFromRouteParam(param);
  if (upper && SPOT_SYMBOL_SET.has(upper)) return upper;
  if (isBzxQuotedRouteSymbol(upper)) return upper;
  return null;
}

/** Pretty path segment for `/trade/:symbol`. */
export function tradePathForApiSymbol(apiSym) {
  return String(apiSym || '').toUpperCase();
}

/** Parse API wire symbol → { symbol, base, quote } (static PAIRS + dynamic *BZX). */
export function parsePairFromApiSymbol(apiSym) {
  const s = String(apiSym || '').toUpperCase();
  const row = PAIRS.find((x) => x.symbol === s);
  if (row) return { symbol: s, base: row.base, quote: row.quote };
  if (s.endsWith('BZX') && s.length > 3) {
    return { symbol: s, base: s.slice(0, -3), quote: 'BZX' };
  }
  if (s.endsWith('USDT') && s.length > 4) {
    return { symbol: s, base: s.slice(0, -4), quote: 'USDT' };
  }
  return { symbol: s, base: s.replace(/USDT$/, ''), quote: 'USDT' };
}

/** UI base ticker for an API pair symbol (e.g. DOTBZX → DOT, BZXUSDT → BZX). */
export function displayBaseForApiSymbol(apiSym) {
  return parsePairFromApiSymbol(apiSym).base;
}

/** Quote asset for an API pair symbol (e.g. DOTBZX → BZX, BTCUSDT → USDT). */
export function quoteForApiSymbol(apiSym) {
  return parsePairFromApiSymbol(apiSym).quote;
}

/** `BZXUSDT` → `BZX/USDT`, `DOTBZX` → `DOT/BZX` for header, tables, order rows. */
export function displayPairSlash(apiSymbol) {
  const { base, quote } = parsePairFromApiSymbol(apiSymbol);
  return `${base}/${quote}`;
}

/** Wallet / balance row: returns the asset label (identity for bitzx). */
export function walletAssetLabel(asset) {
  return asset;
}

export function tradeHrefForWalletAsset(asset) {
  return `/trade/${asset}USDT`;
}

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
    quote: m.quote ?? m.quoteAsset ?? (m.symbol?.endsWith('BZX') ? 'BZX' : 'USDT'),
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
    project_name: m.project_name,
    token_name: m.token_name,
    logo_url: m.logo_url,
    description: m.description,
    market_tagline: m.market_tagline,
    market_category: m.market_category,
    market_visible: m.market_visible,
    featured_landing: m.featured_landing,
    market_sort_order: m.market_sort_order,
    listed_token_id: m.listed_token_id,
    is_listed: m.is_listed,
    stats_source: m.stats_source ?? (src === 'binance' ? 'binance' : src === 'internal' ? 'internal' : ''),
    is_platform_default: m.is_platform_default,
    blockchain_network: m.blockchain_network,
    official_website: m.official_website,
  };
}

export function normalizeMarketsList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeMarketRow).filter(Boolean);
}

/** WebSocket path for BZX market streams. */
export function bzxWsPath(pathWithQuery) {
  return exchangeWsPath(pathWithQuery);
}

export const marketApi = {
  /** All markets — single backend call (BZX + Binance batch server-side) */
  async getMarkets() {
    const raw = await safeFetch(`${BACKEND}/api/trading/markets`, null);
    return normalizeMarketsList(raw);
  },

  /** Paginated BZX-quoted markets. Params: skip, limit, tier, q */
  async getBZXMarkets(params = {}) {
    const q = new URLSearchParams({
      skip: String(params.skip ?? 0),
      limit: String(params.limit ?? 80),
      tier: params.tier ?? 'all',
    });
    if (params.q) q.set('q', params.q);
    const raw = await safeFetch(`${BACKEND}/api/trading/bzx-markets?${q}`, null);
    if (raw && Array.isArray(raw.markets)) return raw;
    if (Array.isArray(raw)) return { markets: raw, total: raw.length };
    return { markets: [], total: 0 };
  },

  /** Full BZX catalog (majors + all Web3), paginated until complete. */
  async fetchAllBzxMarkets() {
    const PAGE = 80;
    const seen = new Set();
    const out = [];
    let skip = 0;
    let total = 1;
    while (skip < total) {
      const d = await marketApi.getBZXMarkets({ tier: 'all', skip, limit: PAGE });
      const list = d?.markets ?? [];
      total = Number(d?.total) ?? skip + list.length;
      for (const m of list) {
        const sym = String(m?.symbol || '').toUpperCase();
        if (sym && !seen.has(sym)) {
          seen.add(sym);
          out.push(m);
        }
      }
      skip += list.length;
      if (!list.length) break;
    }
    return out;
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
