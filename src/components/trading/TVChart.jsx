/**
 * TVChart — TradingView Advanced Real-Time Chart (all spot pairs).
 *
 * BZX-quoted pairs map to the same base on Binance USDT for an identical
 * TradingView UI (toolbars, drawings, intervals). Live BZX price is shown
 * in the page header, order book, and trade form.
 */
import { useEffect, useRef } from 'react';
import { parsePairFromApiSymbol } from '@/services/marketApi';

const TV_SYMBOLS = {
  BZXUSDT:  'BINANCE:BTCUSDT',
  BTCUSDT:  'BINANCE:BTCUSDT',
  ETHUSDT:  'BINANCE:ETHUSDT',
  BNBUSDT:  'BINANCE:BNBUSDT',
  SOLUSDT:  'BINANCE:SOLUSDT',
  XRPUSDT:  'BINANCE:XRPUSDT',
  DOGEUSDT: 'BINANCE:DOGEUSDT',
  ADAUSDT:  'BINANCE:ADAUSDT',
  POLUSDT:  'BINANCE:POLUSDT',
  AVAXUSDT: 'BINANCE:AVAXUSDT',
  DOTUSDT:  'BINANCE:DOTUSDT',
  LINKUSDT: 'BINANCE:LINKUSDT',
  LTCUSDT:  'BINANCE:LTCUSDT',
};

const TV_WIDGET_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

function resolveTvSymbol(apiSymbol) {
  const sym = String(apiSymbol || '').toUpperCase();
  if (TV_SYMBOLS[sym]) return TV_SYMBOLS[sym];

  if (sym.endsWith('BZX')) {
    const { base } = parsePairFromApiSymbol(sym);
    const usdt = `${base}USDT`;
    if (TV_SYMBOLS[usdt]) return TV_SYMBOLS[usdt];
    return `BINANCE:${usdt}`;
  }

  if (sym.endsWith('USDT')) {
    return `BINANCE:${sym}`;
  }

  return 'BINANCE:BTCUSDT';
}

const TV_WIDGET_OPTIONS = {
  autosize: true,
  interval: '60',
  timezone: 'Etc/UTC',
  theme: 'dark',
  style: '1',
  locale: 'en',
  backgroundColor: 'rgba(10,11,15,1)',
  gridColor: 'rgba(26,29,36,0.9)',
  allow_symbol_change: false,
  calendar: false,
  withdateranges: false,
  hide_side_toolbar: false,
  hide_top_toolbar: false,
  hide_legend: false,
  details: false,
  hotlist: false,
  show_popup_button: false,
  overrides: {
    'mainSeriesProperties.candleStyle.upColor': '#22c55e',
    'mainSeriesProperties.candleStyle.downColor': '#ef4444',
    'mainSeriesProperties.candleStyle.borderUpColor': '#22c55e',
    'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
    'mainSeriesProperties.candleStyle.wickUpColor': '#22c55e',
    'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
  },
  support_host: 'https://www.tradingview.com',
};

export default function TVChart({ symbol }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    el.innerHTML = '';

    const tvSymbol = resolveTvSymbol(symbol);
    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.cssText = 'width:100%;height:100%;';

    const widgetEl = document.createElement('div');
    widgetEl.className = 'tradingview-widget-container__widget';
    widgetEl.style.cssText = 'width:100%;height:100%;';
    wrapper.appendChild(widgetEl);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = TV_WIDGET_SCRIPT;
    script.textContent = JSON.stringify({
      ...TV_WIDGET_OPTIONS,
      symbol: tvSymbol,
    });
    wrapper.appendChild(script);
    el.appendChild(wrapper);

    return () => {
      el.innerHTML = '';
    };
  }, [symbol]);

  return (
    <div className="bitzx-tv-chart" style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
