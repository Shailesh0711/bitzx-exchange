import { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { Loader2 } from 'lucide-react';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

/** Default bars in view on first load (recent history, zoomed to the right). */
const VISIBLE_BARS_BY_INTERVAL = {
  '1m': 90,
  '5m': 72,
  '15m': 64,
  '1h': 48,
  '4h': 42,
  '1d': 36,
};
const DEFAULT_VISIBLE_BARS = 72;
const RIGHT_OFFSET_BARS = 12;

function visibleBarsForInterval(iv) {
  return VISIBLE_BARS_BY_INTERVAL[iv] ?? DEFAULT_VISIBLE_BARS;
}

function focusRecentBars(chart, barCount, intervalKey) {
  if (!chart || barCount <= 0) return;
  const visible = Math.min(visibleBarsForInterval(intervalKey), barCount);
  const from = Math.max(0, barCount - visible);
  chart.timeScale().setVisibleLogicalRange({ from, to: barCount - 1 });
}

export default function BZXChart({ candles = [], interval = '1m', onIntervalChange, fill = false, loading = false }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const volRef = useRef(null);
  const tooltipRef = useRef(null);
  const [active, setActive] = useState(interval);

  const chartData = useMemo(
    () => (candles || []).map((c) => ({ time: Number(c.time), open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close), volume: Number(c.volume || 0) })),
    [candles],
  );

  useEffect(() => {
    setActive(interval);
  }, [interval]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const initialH = fill
      ? Math.max(200, containerRef.current.clientHeight)
      : 430;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: initialH,
      layout: { background: { color: 'transparent' }, textColor: '#c7c9d1' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        rightOffset: RIGHT_OFFSET_BARS,
      },
      crosshair: { mode: CrosshairMode.Normal },
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderVisible: false,
    });
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      color: 'rgba(91,184,255,0.4)',
    });
    volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    seriesRef.current = candleSeries;
    volRef.current = volSeries;

    const tip = document.createElement('div');
    tip.style.position = 'absolute';
    tip.style.display = 'none';
    tip.style.pointerEvents = 'none';
    tip.style.padding = '8px 10px';
    tip.style.background = 'rgba(8,10,14,0.92)';
    tip.style.border = '1px solid rgba(255,255,255,0.15)';
    tip.style.borderRadius = '8px';
    tip.style.fontSize = '12px';
    tip.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    tip.style.color = '#fff';
    tip.style.zIndex = '100';
    tooltipRef.current = tip;
    containerRef.current.appendChild(tip);

    chart.subscribeCrosshairMove((param) => {
      if (!param?.point || !param?.time) {
        tip.style.display = 'none';
        return;
      }
      const c = param.seriesData.get(candleSeries);
      const v = param.seriesData.get(volSeries);
      if (!c) {
        tip.style.display = 'none';
        return;
      }
      tip.style.display = 'block';
      tip.style.left = `${Math.min(containerRef.current.clientWidth - 170, Math.max(8, param.point.x + 14))}px`;
      tip.style.top = `${Math.max(8, param.point.y - 14)}px`;
      tip.innerHTML = `O ${Number(c.open).toFixed(6)}<br/>H ${Number(c.high).toFixed(6)}<br/>L ${Number(c.low).toFixed(6)}<br/>C ${Number(c.close).toFixed(6)}<br/>V ${Number(v?.value || 0).toFixed(2)}`;
    });

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = fill
        ? Math.max(200, containerRef.current.clientHeight)
        : 430;
      chart.applyOptions({ width: w, height: h });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      if (tooltipRef.current && tooltipRef.current.parentNode) {
        tooltipRef.current.parentNode.removeChild(tooltipRef.current);
      }
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volRef.current = null;
    };
  }, [fill]);

  const isFittedRef = useRef(false);

  useEffect(() => {
    isFittedRef.current = false;
  }, [interval]);

  useEffect(() => {
    if (!seriesRef.current || !volRef.current) return;

    if (chartData.length === 0) {
      isFittedRef.current = false;
      return;
    }

    seriesRef.current.setData(chartData);
    volRef.current.setData(
      chartData.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)',
      })),
    );

    if (!isFittedRef.current) {
      focusRecentBars(chartRef.current, chartData.length, active);
      isFittedRef.current = true;
    }
  }, [chartData, active]);

  return (
    <div className="w-full h-full bg-[#0d0f14] flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 shrink-0">
        {INTERVALS.map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => {
              setActive(iv);
              onIntervalChange?.(iv);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              active === iv ? 'text-gold-light border-gold/50 bg-gold/10' : 'text-white/70 border-white/10 hover:text-white'
            }`}
          >
            {iv}
          </button>
        ))}
      </div>
      <div className="relative flex-1 min-h-0">
        {loading && chartData.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0d0f14]/80">
            <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
            <span className="text-white/50 text-sm font-semibold tracking-wider uppercase">Loading chart...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0d0f14]/80">
            <span className="text-white/50 text-sm font-semibold tracking-wider uppercase">No price data</span>
          </div>
        ) : null}
        <div
          ref={containerRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
