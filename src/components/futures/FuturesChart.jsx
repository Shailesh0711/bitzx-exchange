// Thin adapter: strip "-PERP" so the existing TVChart picks up the spot symbol.
import TVChart from '@/components/trading/TVChart';

export default function FuturesChart({ symbol }) {
  const spot = (symbol || '').replace(/-PERP$/i, '');
  return <TVChart symbol={spot || 'BTCUSDT'} />;
}
