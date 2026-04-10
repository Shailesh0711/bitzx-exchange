/**
 * TradingChart — thin wrapper that forwards to TVChart.
 *
 * Every pair (including BZXUSDT) uses the TradingView Advanced Chart widget
 * so users always get the full TradingView experience:
 * drawing tools, 100+ indicators, replay, multiple chart types, etc.
 *
 * BZXUSDT is not listed on TradingView, so TVChart maps it to
 * BINANCE:BTCUSDT as a market-reference chart (see TVChart.jsx).
 *
 * Parent column must have `position: relative; overflow: hidden`
 * because TVChart renders as `position: absolute; inset: 0`.
 */
import TVChart from './TVChart';

export default function TradingChart({ symbol }) {
  return <TVChart symbol={symbol} />;
}
