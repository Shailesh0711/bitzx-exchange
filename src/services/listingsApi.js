import { exchangeApiOrigin } from '@/lib/apiBase';

const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

function formatApiDetail(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
      .join(', ');
  }
  return null;
}

export async function fetchListingNetworkOptions() {
  const res = await fetch(`${API}/api/listings/network-options`);
  if (!res.ok) throw new Error('Could not load networks');
  const data = await res.json();
  return data.networks || [];
}

export async function submitListingRequest(formData) {
  const res = await fetch(`${API}/api/listings/submit`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = formatApiDetail(data.detail) || `Submission failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function fetchListedTokensPublic() {
  const res = await fetch(`${API}/api/listings/listed`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}
