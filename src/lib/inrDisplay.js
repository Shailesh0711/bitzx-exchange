/** Shared INR deposit / ledger display helpers for wallet UI. */

export const INR_STATUS_LABELS = {
  pending: 'Pending review',
  approving: 'Processing',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function inrStatusLabel(status) {
  const key = String(status || 'pending').toLowerCase();
  return INR_STATUS_LABELS[key] || key.replace(/_/g, ' ');
}

export function formatInrAmount(amountInr) {
  const n = Number(amountInr);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getInrRefDisplay(row) {
  if (!row) return { utr: null, depositId: null };
  const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
  const utr = String(meta.utr_number || row.utr_number || '').trim() || null;
  const depositId = row.ref_id ? String(row.ref_id) : null;
  return { utr, depositId };
}

/** Short ref for ledger tables (UTR only; full context in tooltip). */
export function formatInrDepositRef(row) {
  const { utr, depositId } = getInrRefDisplay(row);
  if (utr) return utr;
  if (depositId) return depositId.length > 14 ? `${depositId.slice(0, 12)}…` : depositId;
  return '—';
}

export function formatInrDepositRefTitle(row) {
  if (!row) return '';
  const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
  const lines = [];
  if (row.ref_id) lines.push(`Deposit ID: ${row.ref_id}`);
  if (meta.amount_inr != null) lines.push(`Amount: ${formatInrAmount(meta.amount_inr)}`);
  const utr = meta.utr_number || row.utr_number;
  if (utr) lines.push(`UTR: ${utr}`);
  if (meta.amount_bzx != null) lines.push(`BZX credited: ${Number(meta.amount_bzx).toFixed(4)}`);
  if (meta.payment_method_label) lines.push(`Method: ${meta.payment_method_label}`);
  if (row.status) lines.push(`Status: ${row.status}`);
  return lines.join('\n') || formatInrDepositRef(row);
}

export function formatWalletTxnRef(row) {
  if (!row) return '—';
  if (row._ledgerKind === 'inr_request' || row.ref_type === 'inr_deposit') {
    return formatInrDepositRef(row);
  }
  return [row.ref_type, row.ref_id].filter(Boolean).join(' · ') || '—';
}

export function ledgerTypeLabel(row) {
  if (row?._ledgerKind === 'inr_request' || row?.type === 'inr_deposit') return 'INR deposit';
  if (row?.ref_type === 'inr_deposit' && row?.type === 'deposit') return 'INR deposit';
  return row?.type || '—';
}

/** Fiat deposit request as a ledger row (pending / rejected / approving — not yet in wallet_txns). */
export function inrDepositToLedgerRow(dep) {
  if (!dep?.id) return null;
  const status = dep.status || 'pending';
  return {
    id: `inr-dep-${dep.id}`,
    _ledgerKind: 'inr_request',
    created_at: dep.created_at,
    asset: 'INR',
    type: 'inr_deposit',
    direction: 'request',
    amount: dep.amount_inr,
    balance_after: null,
    ref_type: 'inr_deposit',
    ref_id: dep.id,
    status,
    meta: {
      amount_inr: dep.amount_inr,
      utr_number: dep.utr_number,
      amount_bzx: dep.amount_bzx,
      payment_method_label: dep.payment_method_label,
    },
  };
}

/** Merge wallet_txns with INR requests; skip INR rows already credited on-chain ledger. */
function enrichInrLedgerRow(row, inrById) {
  if (!row || !inrById) return row;
  const isInr = row._ledgerKind === 'inr_request' || row.ref_type === 'inr_deposit';
  if (!isInr || !row.ref_id) return row;
  const dep = inrById.get(String(row.ref_id));
  if (!dep) return row;
  const meta = { ...(row.meta && typeof row.meta === 'object' ? row.meta : {}) };
  if (!meta.utr_number && dep.utr_number) meta.utr_number = dep.utr_number;
  if (meta.amount_inr == null && dep.amount_inr != null) meta.amount_inr = dep.amount_inr;
  if (meta.amount_bzx == null && dep.amount_bzx != null) meta.amount_bzx = dep.amount_bzx;
  return { ...row, meta };
}

export function mergeLedgerWithInrDeposits(walletItems, inrDeposits) {
  const wallet = Array.isArray(walletItems) ? walletItems : [];
  const inr = Array.isArray(inrDeposits) ? inrDeposits : [];
  const inrById = new Map(inr.filter((d) => d?.id).map((d) => [String(d.id), d]));
  const creditedIds = new Set(
    wallet
      .filter((w) => w.ref_type === 'inr_deposit' && w.ref_id)
      .map((w) => String(w.ref_id)),
  );
  const supplemental = inr
    .filter((d) => d?.id && !creditedIds.has(String(d.id)))
    .map(inrDepositToLedgerRow)
    .filter(Boolean);
  const merged = [...supplemental, ...wallet].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || ''),
  );
  return merged.map((row) => enrichInrLedgerRow(row, inrById));
}

export function formatLedgerAmount(row) {
  if (row?._ledgerKind === 'inr_request') {
    return formatInrAmount(row.amount);
  }
  const positive = ['credit', 'unlock'].includes(String(row.direction || '').toLowerCase());
  const dec = row.asset === 'USDT' ? 4 : 6;
  const n = Number(row.amount || 0).toFixed(dec);
  return `${positive ? '+' : '−'}${n}`;
}
