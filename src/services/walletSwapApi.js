import { authFetch } from '@/context/AuthContext';
import { exchangeApiOrigin } from '@/lib/apiBase';
import { formatApiDetail } from '@/lib/authValidation';

const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

async function parseErr(res) {
  const data = await res.json().catch(() => ({}));
  throw new Error(formatApiDetail(data?.detail) || data?.message || 'Request failed');
}

export async function fetchSwapQuote(direction, amount) {
  const q = new URLSearchParams({ direction, amount: String(amount) });
  const res = await authFetch(`${API}/api/wallet/swap/quote?${q}`);
  if (!res.ok) await parseErr(res);
  return res.json();
}

export async function executeSwap(direction, amount) {
  const res = await authFetch(`${API}/api/wallet/swap`, {
    method: 'POST',
    body: { direction, amount },
  });
  if (!res.ok) await parseErr(res);
  return res.json();
}

/** Recent BZXUSDT market orders (swap executions). */
export async function fetchSwapOrderHistory(limit = 12) {
  const res = await authFetch(`${API}/api/orders/history`);
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.orders ?? [];
  return list
    .filter((o) => String(o.symbol || '').toUpperCase() === 'BZXUSDT')
    .filter((o) => String(o.type || '').toLowerCase() === 'market')
    .slice(0, limit);
}
