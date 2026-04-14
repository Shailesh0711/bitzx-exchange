/**
 * TVChart — full TradingView Advanced Real-Time Chart widget.
 *
 * Features: 100+ indicators, drawing tools (left toolbar), chart types, date-range selector,
 * full-screen pop-out, and more — all provided by TradingView.
 *
 * Symbol mapping:
 *   • All listed pairs  → exact Binance symbol on TradingView
 *   • BZXUSDT           → BINANCE:BTCUSDT (market-reference; BZX is not listed)
 *                         A badge on the chart notifies the user.
 *
 * Sizing contract:
 *   The component renders as `position: absolute; inset: 0`.
 *   The parent column in TradePage must have `position: relative; overflow: hidden`.
 */
import { useEffect, useRef } from 'react';

// ── Symbol map ────────────────────────────────────────────────────────────────
const TV_SYMBOLS = {
  BZXUSDT:  'BINANCE:BTCUSDT',   // BZX is unlisted; show BTC as market reference
  BTCUSDT:  'BINANCE:BTCUSDT',
  ETHUSDT:  'BINANCE:ETHUSDT',
  BNBUSDT:  'BINANCE:BNBUSDT',
  SOLUSDT:  'BINANCE:SOLUSDT',
  XRPUSDT:  'BINANCE:XRPUSDT',
  DOGEUSDT: 'BINANCE:DOGEUSDT',
  ADAUSDT:  'BINANCE:ADAUSDT',
  POLUSDT: 'BINANCE:POLUSDT',
  AVAXUSDT: 'BINANCE:AVAXUSDT',
  DOTUSDT:  'BINANCE:DOTUSDT',
  LINKUSDT: 'BINANCE:LINKUSDT',
  LTCUSDT:  'BINANCE:LTCUSDT',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function TVChart({ symbol }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = '';

    const tvSymbol = TV_SYMBOLS[symbol] ?? 'BINANCE:BTCUSDT';

    /**
     * Official TradingView embed structure:
     *
     *   <div class="tradingview-widget-container" style="height:100%;width:100%">
     *     <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
     *     <script src="embed-widget-advanced-chart.js" async>{ ...JSON config... }</script>
     *   </div>
     *
     * The external script reads its own textContent for configuration.
     */
    const wrapper = document.createElement('div');
    wrapper.className  = 'tradingview-widget-container';
    wrapper.style.cssText = 'width:100%;height:100%;';

    const widgetEl = document.createElement('div');
    widgetEl.className    = 'tradingview-widget-container__widget';
    widgetEl.style.cssText = 'width:100%;height:100%;';
    wrapper.appendChild(widgetEl);

    const script = document.createElement('script');
    script.type    = 'text/javascript';
    script.async   = true;
    script.src     = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.textContent = JSON.stringify({
      autosize:            true,
      symbol:              tvSymbol,
      interval:            '60',
      timezone:            'Etc/UTC',
      theme:               'dark',
      style:               '1',             // candlestick by default
      locale:              'en',
      backgroundColor:     'rgba(10,11,15,1)',
      gridColor:           'rgba(26,29,36,0.9)',
      allow_symbol_change: false,
      calendar:            false,
      withdateranges:      true,
      hide_side_toolbar:   false,           // left drawing-tools column (keep visible)
      details:             true,
      hotlist:             false,
      show_popup_button:   true,
      popup_width:         '1000',
      popup_height:        '700',
      // No forced default studies — user's own indicator choices are respected
      overrides: {
        'mainSeriesProperties.candleStyle.upColor':         '#22c55e',
        'mainSeriesProperties.candleStyle.downColor':       '#ef4444',
        'mainSeriesProperties.candleStyle.borderUpColor':   '#22c55e',
        'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
        'mainSeriesProperties.candleStyle.wickUpColor':     '#22c55e',
        'mainSeriesProperties.candleStyle.wickDownColor':   '#ef4444',
      },
      support_host: 'https://www.tradingview.com',
    });
    wrapper.appendChild(script);

    el.appendChild(wrapper);

    return () => { el.innerHTML = ''; };
  }, [symbol]);

  return (
    // Absolute fill — parent must have `position: relative; overflow: hidden`
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
