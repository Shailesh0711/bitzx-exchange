/**
 * Landing — INR deposit & INR payout (sell BZX) for Indian users.
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  IndianRupee,
  Banknote,
} from 'lucide-react';
import { InrMinDepositChip, InrMinDepositNote } from '@/components/inr/InrMinDepositChip';
import { useInrMinDeposit } from '@/hooks/useInrMinDeposit';

export default function LandingInrFiat() {
  const { user, authLoading } = useAuth();
  const { minDepositInr } = useInrMinDeposit();

  return (
    <section
      id="inr-fiat"
      className="relative border-y border-white/[0.06] overflow-hidden"
      style={{ background: 'linear-gradient(180deg, rgba(10,11,15,1) 0%, rgba(12,13,18,0.98) 50%, rgba(10,11,15,1) 100%)' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_30%,rgba(34,197,94,0.07),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_15%_70%,rgba(156,121,65,0.1),transparent_50%)]" />

      <div className="relative bitzx-landing-container bitzx-section-y">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-10 md:mb-14"
        >
          <p className="bitzx-eyebrow mb-3 inline-flex items-center justify-center gap-2">
            <IndianRupee size={14} className="text-gold-light" />
            India · INR
          </p>
          <h2 className="bitzx-title-lg mb-4">
            Deposit &amp; withdraw in <span className="text-gradient">Indian Rupees</span>
          </h2>
          <p className="bitzx-lead text-zinc-400 max-w-none">
            Add INR via bank or UPI and receive BZX after review. When you are ready to cash out, sell BZX and
            get INR paid to your linked bank or UPI — with full status in Wallet → History → INR history.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-6 max-w-5xl mx-auto">
          <motion.article
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8 flex flex-col h-full hover:border-emerald-500/25 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                <ArrowDownCircle size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-400/90">Deposit</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-white font-semibold text-xl">INR in → BZX credited</h3>
                  <InrMinDepositChip minDepositInr={minDepositInr} />
                </div>
              </div>
            </div>
            <p className="text-zinc-400 text-[14px] sm:text-[15px] leading-[1.65] mb-2 flex-1">
              Transfer Indian Rupees using our payment details, submit your UTR and proof, and trade once BZX is
              added to your spot balance.
            </p>
            <InrMinDepositNote minDepositInr={minDepositInr} className="mb-5" />
            <ul className="space-y-2.5 mb-6">
              {['Bank transfer or UPI', 'UTR + payment proof in wallet', 'BZX credited after admin review'].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <CheckCircle size={15} className="text-gold-light shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              to="/wallet/deposit/inr"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-6 py-3 text-[15px] font-semibold text-surface-dark w-full sm:w-auto"
            >
              Deposit INR <ArrowRight size={16} />
            </Link>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8 flex flex-col h-full hover:border-gold/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 border border-gold/25 text-gold-light">
                <ArrowUpCircle size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light/90">Withdraw</p>
                <h3 className="text-white font-semibold text-xl">Sell BZX → INR out</h3>
              </div>
            </div>
            <p className="text-zinc-400 text-[14px] sm:text-[15px] leading-[1.65] mb-5 flex-1">
              Sell BZX from your wallet, request an INR payout to your verified bank or UPI, and track approval
              with payout reference in your history.
            </p>
            <ul className="space-y-2.5 mb-6">
              {['BZX reserved when you submit', 'INR to bank or UPI after review', 'Email updates on status'].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <CheckCircle size={15} className="text-gold-light shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              to="/wallet/withdraw/inr"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold/35 bg-gold/5 px-6 py-3 text-[15px] font-semibold text-gold-light hover:bg-gold/10 w-full sm:w-auto transition-colors"
            >
              Sell for INR <ArrowRight size={16} />
            </Link>
          </motion.article>
        </div>

        {!authLoading && user ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 max-w-5xl mx-auto rounded-2xl border border-gold/20 bg-gold/[0.04] px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <Banknote size={22} className="text-gold-light shrink-0 hidden sm:block" />
            <p className="text-sm sm:text-[15px] text-zinc-400 leading-relaxed flex-1">
              <span className="text-white font-medium">KYC may be required</span> before INR deposit or payout.
              Manage all requests under{' '}
              <Link to="/wallet?tab=history" className="text-gold-light hover:text-gold font-medium">
                Wallet → History
              </Link>
              .
            </p>
            <Link
              to="/wallet?tab=history&inr=withdraw"
              className="text-[14px] font-semibold text-gold-light hover:text-gold whitespace-nowrap inline-flex items-center gap-1"
            >
              INR history <ArrowRight size={14} />
            </Link>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
