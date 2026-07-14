/**
 * DepositSuccessModal
 *
 * Celebratory pop-up shown the moment the on-demand deposit monitor detects
 * a new incoming transaction. Works for both fully-credited deposits and
 * deposits still confirming on-chain (copy adapts to `deposit.status`).
 */

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock3, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CREDITED_STATUSES = new Set(['credited', 'approved']);

function fmtAmount(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export default function DepositSuccessModal({ open, onClose, deposit }) {
  if (!deposit) return null;
  const isCredited = CREDITED_STATUSES.has(String(deposit.status || '').toLowerCase());

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-sm rounded-3xl border border-gold/25 bg-gradient-to-b from-surface-card to-surface-dark shadow-2xl shadow-black/60 overflow-hidden"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow backdrop */}
            <div className={`absolute -top-16 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full blur-3xl ${
              isCredited ? 'bg-green-400/30' : 'bg-sky-400/25'
            }`} />

            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="relative px-6 pt-9 pb-7 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 16 }}
                className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ring-8 ${
                  isCredited
                    ? 'bg-green-500/15 ring-green-500/10 text-green-400'
                    : 'bg-sky-500/15 ring-sky-500/10 text-sky-400'
                }`}
              >
                {isCredited ? <CheckCircle2 size={34} /> : <Clock3 size={34} />}
              </motion.div>

              <h3 className="text-lg font-extrabold text-white">
                {isCredited ? 'Deposit successful!' : 'Deposit detected!'}
              </h3>
              <p className="text-sm text-white/60 mt-1.5 leading-relaxed">
                {isCredited
                  ? 'Your transaction was found on-chain and credited to your wallet.'
                  : 'Your transaction was found on-chain and is confirming now — your balance will update automatically.'}
              </p>

              {(deposit.asset || deposit.amount != null) && (
                <div className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3.5 flex items-center justify-between gap-3">
                  <span className="text-xs text-white/50 uppercase tracking-wider font-bold">Amount</span>
                  <span className="text-base font-mono font-bold text-gold-light truncate">
                    +{fmtAmount(deposit.amount)} {deposit.asset}
                  </span>
                </div>
              )}

              {deposit.network && (
                <p className="text-[11px] text-white/40 mt-2.5">
                  via <span className="text-white/60 font-semibold">{deposit.network}</span>
                </p>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-white/15 text-white/80 hover:bg-white/5 transition-colors"
                >
                  Close
                </button>
                <Link
                  to="/wallet?tab=history"
                  onClick={onClose}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-gold to-gold-light text-surface-dark hover:opacity-95 transition-opacity"
                >
                  View history <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
