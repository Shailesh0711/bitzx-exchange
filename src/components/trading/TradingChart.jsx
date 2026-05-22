/**
 * TradingChart — unified TradingView Advanced Chart for every spot pair.
 * Same toolbar, drawing tools, and layout for USDT and BZX markets.
 */
import TVChart from './TVChart';

export default function TradingChart({ symbol }) {
  const sym = String(symbol || '').toUpperCase();
  return <TVChart key={sym} symbol={sym} />;
}
