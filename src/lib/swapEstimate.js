/** Client-side BZX ↔ USDT swap preview (mirrors backend/services/bzx_swap.py). */

export function swapUsdtNotional(direction, fromAmount, priceUsdt) {
  const px = Math.max(Number(priceUsdt) || 0, 1e-12);
  const amt = Math.max(Number(fromAmount) || 0, 0);
  return direction === 'bzx_to_usdt' ? amt * px : amt;
}

export function computeSwapPlatformFeeBzx(direction, fromAmount, priceUsdt, swapFeeRate, swapFeeBzxFixed, bzxPriceUsdt) {
  const rate = Math.max(Number(swapFeeRate) || 0, 0);
  const fixed = Math.max(Number(swapFeeBzxFixed) || 0, 0);
  const notional = swapUsdtNotional(direction, fromAmount, priceUsdt);
  const feeUsdt = rate > 0 ? notional * rate : 0;
  const px = Math.max(Number(bzxPriceUsdt) || 0, 1e-12);
  const feeFromRate = feeUsdt > 0 ? feeUsdt / px : 0;
  return Math.round((feeFromRate + fixed) * 1e8) / 1e8;
}

export function estimateTradingFeeBzx(direction, fromAmount, priceUsdt, takerFeeRate, bzxPriceUsdt) {
  const notional = swapUsdtNotional(direction, fromAmount, priceUsdt);
  const feeUsdt = notional * Math.max(Number(takerFeeRate) || 0, 0);
  const px = Math.max(Number(bzxPriceUsdt) || 0, 1e-12);
  return feeUsdt > 0 ? Math.round((feeUsdt / px) * 1e8) / 1e8 : 0;
}

export function buildLocalSwapQuote(direction, amount, priceUsdt, config, availableFrom) {
  const px = Math.max(Number(priceUsdt) || 0, 1e-12);
  const amt = Math.max(Number(amount) || 0, 0);
  const fromAsset = direction === 'bzx_to_usdt' ? 'BZX' : 'USDT';
  const toAsset = direction === 'bzx_to_usdt' ? 'USDT' : 'BZX';
  const toAmount = direction === 'bzx_to_usdt' ? amt * px : amt / px;
  const bzxPx = config.bzx_price_usdt > 0 ? config.bzx_price_usdt : px;
  const platformFee = computeSwapPlatformFeeBzx(
    direction, amt, px, config.swap_fee_rate, config.swap_fee_bzx_fixed, bzxPx,
  );
  const tradingFee = estimateTradingFeeBzx(direction, amt, px, config.taker_fee_rate, bzxPx);
  const feeTotal = Math.round((platformFee + tradingFee) * 1e8) / 1e8;
  return {
    direction,
    symbol: 'BZXUSDT',
    from_asset: fromAsset,
    to_asset: toAsset,
    from_amount: Math.round(amt * 1e8) / 1e8,
    to_amount_estimated: Math.round(toAmount * 1e8) / 1e8,
    price_usdt: Math.round(px * 1e8) / 1e8,
    fee_bzx_estimated: platformFee,
    trading_fee_bzx_estimated: tradingFee,
    fee_bzx_total: feeTotal,
    swap_fee_rate: config.swap_fee_rate,
    swap_fee_bzx_fixed: config.swap_fee_bzx_fixed,
    fee_asset: 'BZX',
    available_from: availableFrom,
  };
}
