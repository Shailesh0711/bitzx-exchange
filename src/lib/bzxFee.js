/** BZX fee estimates — matches backend/services/bzx_fee.py */

export const FEE_ASSET = 'BZX';
export const DEFAULT_BZX_PRICE_USDT = 0.4523;

export function estimateBzxFee({
  quoteNotional,
  feeRate,
  quoteAsset = 'USDT',
  bzxPriceUsdt = DEFAULT_BZX_PRICE_USDT,
}) {
  const q = Math.max(Number(quoteNotional) || 0, 0);
  const r = Math.max(Number(feeRate) || 0, 0);
  if (q <= 0 || r <= 0) return 0;
  if (String(quoteAsset || 'USDT').toUpperCase() === 'BZX') {
    return roundBzx(q * r);
  }
  const px = Math.max(Number(bzxPriceUsdt) || 0, 1e-12);
  return roundBzx((q * r) / px);
}

export function usdtFeeToBzx(usdtFee, bzxPriceUsdt = DEFAULT_BZX_PRICE_USDT) {
  const amt = Math.max(Number(usdtFee) || 0, 0);
  if (amt <= 0) return 0;
  const px = Math.max(Number(bzxPriceUsdt) || 0, 1e-12);
  return roundBzx(amt / px);
}

export function roundBzx(n) {
  return Math.round(Number(n) * 1e8) / 1e8;
}

export function formatBzxFee(feeBzx, { maxDecimals = 8 } = {}) {
  const v = Number(feeBzx) || 0;
  if (v <= 0) return `0 ${FEE_ASSET}`;
  const s = v.toFixed(maxDecimals).replace(/\.?0+$/, '');
  return `${s} ${FEE_ASSET}`;
}

/** Pick venue rates from GET /api/trading/fee-config */
export function feeRatesForVenue(config, venue = 'spot') {
  const block = config?.[venue];
  if (block) {
    return {
      maker: Number(block.maker_fee_rate) || 0,
      taker: Number(block.taker_fee_rate) || 0,
    };
  }
  return {
    maker: Number(config?.maker_fee_rate) || 0.001,
    taker: Number(config?.taker_fee_rate) || 0.001,
  };
}

export function maxFeeRate(config, venue = 'spot') {
  const { maker, taker } = feeRatesForVenue(config, venue);
  return Math.max(maker, taker);
}
