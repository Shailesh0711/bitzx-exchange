/**
 * Landing — BZX token spotlight + deposit → trade user journey (responsive).
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ArrowDownToLine, Search, LineChart, ShieldCheck,
  Wallet, Coins, TrendingUp, ChevronRight, Sparkles, Layers, Banknote,
} from 'lucide-react';

import { BRAND_LOGO } from '@/lib/brandAssets';

const LOGO = BRAND_LOGO;

const BZX_POINTS = [
  { title: 'Native quote asset', desc: 'Trade altcoins against BZX on dedicated BZX Markets — not only USDT.' },
  { title: 'Platform utility', desc: 'Fees, ecosystem pairs, and featured listings revolve around the BitZX token.' },
  { title: 'Live BZX/USDT', desc: 'Spot market with full 24h stats, depth, and TradingView charts like any major pair.' },
];

const DEPOSIT_PATHS = [
  {
    icon: Wallet,
    color: '#60a5fa',
    title: 'USDT & top assets',
    desc: 'Deposit stablecoins and majors to your secure wallet. Balances credit after on-chain confirmation.',
    link: '/wallet',
    cta: 'Deposit USDT',
  },
  {
    icon: Search,
    color: '#22c55e',
    title: 'Any BEP-20 token',
    desc: 'Search by name or contract address — the same Web3 catalog as wallet deposit. Hundreds of BNB Chain tokens supported.',
    link: '/wallet',
    cta: 'Search tokens',
  },
  {
    icon: Coins,
    color: '#EBD38D',
    title: 'Listed project coins',
    desc: 'After listing approval, your token gets deposit, withdraw, and spot markets (USDT or BZX quote).',
    link: '/list-coin',
    cta: 'Apply to list',
  },
  {
    icon: Banknote,
    color: '#22c55e',
    title: 'INR (Indian Rupees)',
    desc: 'Deposit INR by bank or UPI and receive BZX. Sell BZX and withdraw INR to your linked bank or UPI.',
    link: '/wallet/deposit/inr',
    cta: 'Deposit INR',
    altLink: '/wallet/withdraw/inr',
    altCta: 'Sell for INR',
  },
];

const JOURNEY_STEPS = [
  {
    n: '01',
    icon: ShieldCheck,
    title: 'Create & verify',
    desc: 'Register in minutes. Complete KYC to unlock deposits, withdrawals, and full trading limits.',
    to: '/register',
    cta: 'Create account',
  },
  {
    n: '02',
    icon: ArrowDownToLine,
    title: 'Deposit funds',
    desc: 'Open Wallet → Deposit. Add INR (bank/UPI), USDT, or any supported BEP-20, then copy your address and send.',
    to: '/wallet',
    cta: 'Go to wallet',
  },
  {
    n: '03',
    icon: Layers,
    title: 'Pick a market',
    desc: 'USDT pairs for majors, or BZX Markets for Web3 tokens quoted in BZX. Browse live 24h stats before you trade.',
    to: '/markets',
    cta: 'Browse markets',
    altTo: '/bzx-markets',
    altCta: 'BZX Markets',
  },
  {
    n: '04',
    icon: LineChart,
    title: 'Trade & track',
    desc: 'Use limit or market orders, live order book, TradingView charts, and portfolio P&L — on web or mobile app.',
    to: '/trade/BZXUSDT',
    cta: 'Open terminal',
  },
];

function StepCard({ step, index }) {
  const Icon = step.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className="relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6 md:p-7 h-full min-w-0"
    >
      <div className="flex items-start gap-4 mb-4">
        <div
          className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl font-extrabold text-gold text-lg"
          style={{ background: 'linear-gradient(135deg, rgba(156,121,65,0.2), rgba(235,211,141,0.08))', border: '1px solid rgba(156,121,65,0.35)' }}
        >
          {step.n}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 border border-gold/25 text-gold-light">
          <Icon size={20} />
        </div>
      </div>
      <h3 className="text-white font-semibold text-lg sm:text-xl mb-2 tracking-tight">{step.title}</h3>
      <p className="text-zinc-400 text-[14px] sm:text-[15px] leading-[1.65] flex-1">{step.desc}</p>
      {step.note ? (
        <p className="mt-2 text-[12px] sm:text-[13px] text-gold-light/90">{step.note}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          to={step.to}
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-gold-light hover:text-gold transition-colors"
        >
          {step.cta} <ChevronRight size={14} />
        </Link>
        {step.altTo ? (
          <Link
            to={step.altTo}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors"
          >
            {step.altCta} <ArrowRight size={13} />
          </Link>
        ) : null}
      </div>
    </motion.article>
  );
}

export default function LandingPlatformFlow() {
  return (
    <div className="space-y-0">
      {/* ── BZX token spotlight ── */}
      <section
        className="relative border-y border-white/[0.06] overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(12,13,18,1) 0%, rgba(10,11,15,0.98) 100%)' }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_50%,rgba(156,121,65,0.12),transparent_60%)]" />
        <div className="relative bitzx-landing-container bitzx-section-y">
          <div className="grid gap-10 lg:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="min-w-0"
            >
              <p className="bitzx-eyebrow mb-3">Platform token</p>
              <h2 className="bitzx-title-lg mb-4">Meet BZX — the heart of BitZX Exchange</h2>
              <p className="bitzx-lead text-zinc-400 max-w-none mb-6">
                BZX is our native token and quote currency for Web3 markets. Hold BZX to trade hundreds of
                project tokens, access BZX/USDT spot, and participate in the ecosystem we are building on BNB Chain.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Link
                  to="/trade/BZXUSDT"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-6 py-3 text-[15px] font-semibold text-surface-dark shadow-lg shadow-gold/15"
                >
                  Trade BZX/USDT <TrendingUp size={18} />
                </Link>
                <Link
                  to="/bzx-markets"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-6 py-3 text-[15px] font-medium text-white hover:bg-white/[0.07]"
                >
                  Explore BZX Markets <ArrowRight size={18} className="text-gold-light" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-[#0c0d12] to-[#0a0b0f] p-1 min-w-0"
            >
              <div className="rounded-[22px] border border-white/[0.06] bg-[#0a0b0f]/90 backdrop-blur-sm p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-6">
                  <img src={LOGO} alt="BZX" className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-2xl border border-gold/25 bg-black/30 p-1" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-light/90">BitZX Token</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">BZX</p>
                    <p className="text-sm text-zinc-500 mt-0.5">Quote · utility · ecosystem</p>
                  </div>
                </div>
                <ul className="space-y-4">
                  {BZX_POINTS.map((p) => (
                    <li key={p.title} className="flex gap-3 min-w-0">
                      <Sparkles size={16} className="text-gold-light shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-[15px]">{p.title}</p>
                        <p className="text-zinc-500 text-[13px] leading-relaxed mt-0.5">{p.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How to deposit ── */}
      <section className="bitzx-landing-container bitzx-section-y" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-10 md:mb-14"
        >
          <p className="bitzx-eyebrow mb-3">Fund your account</p>
          <h2 className="bitzx-title-lg mb-4">How deposits work</h2>
          <p className="bitzx-lead-wide text-zinc-400 mx-auto">
            One wallet for everything — INR via bank or UPI, stablecoins, chain-native assets, and the full BEP-20 catalog.
            Search tokens, copy your address, or submit an INR deposit with UTR and proof.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DEPOSIT_PATHS.map((d, i) => (
            <motion.div
              key={d.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bitzx-hover-border flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6 min-w-0"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${d.color}18`, border: `1px solid ${d.color}35` }}
              >
                <d.icon size={22} style={{ color: d.color }} />
              </div>
              <h3 className="text-white font-semibold text-[17px] mb-2">{d.title}</h3>
              <p className="text-zinc-400 text-[14px] leading-[1.65] flex-1">{d.desc}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  to={d.link}
                  className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-gold-light hover:text-gold"
                >
                  {d.cta} <ChevronRight size={14} />
                </Link>
                {d.altLink ? (
                  <Link
                    to={d.altLink}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-400 hover:text-white"
                  >
                    {d.altCta} <ArrowRight size={13} />
                  </Link>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 md:mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25">
            <ShieldCheck size={18} className="text-emerald-400" />
          </div>
          <p className="text-[13px] sm:text-sm text-zinc-400 leading-relaxed flex-1 min-w-0">
            <span className="text-white font-semibold">Security:</span> Deposits use per-user addresses where configured.
            Always verify network (e.g. BEP-20 on BNB Chain) before sending. Unsupported or wrong-network transfers may be lost.
          </p>
          <Link to="/wallet" className="shrink-0 text-sm font-bold text-gold-light hover:underline whitespace-nowrap">
            Open wallet →
          </Link>
        </motion.div>
      </section>

      {/* ── End-to-end journey ── */}
      <section
        className="border-y border-white/[0.06]"
        style={{ background: 'linear-gradient(165deg, rgba(8,9,12,1) 0%, rgba(14,16,22,0.98) 50%, rgba(10,11,15,1) 100%)' }}
      >
        <div className="bitzx-landing-container bitzx-section-y">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-10 md:mb-14"
          >
            <p className="bitzx-eyebrow mb-3">Your path</p>
            <h2 className="bitzx-title-lg mb-4">From signup to your first trade</h2>
            <p className="bitzx-lead-wide text-zinc-400 mx-auto">
              A clear, guided flow on web and mobile — the same steps whether you trade USDT pairs or BZX-quoted Web3 tokens.
            </p>
          </motion.div>

          {/* Desktop: 2x2 grid; mobile: stack */}
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {JOURNEY_STEPS.map((step, i) => (
              <StepCard key={step.n} step={step} index={i} />
            ))}
          </div>

          {/* Mobile-friendly visual connector */}
          <div className="hidden xl:flex items-center justify-center gap-2 mt-8 text-zinc-600 text-xs font-mono uppercase tracking-widest">
            <span>Register</span>
            <ArrowRight size={12} />
            <span>Deposit</span>
            <ArrowRight size={12} />
            <span>Market</span>
            <ArrowRight size={12} />
            <span>Trade</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 md:mt-12 flex flex-col sm:flex-row flex-wrap justify-center gap-3"
          >
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-8 py-3.5 text-[15px] font-semibold text-surface-dark"
            >
              Get started free <ArrowRight size={18} />
            </Link>
            <Link
              to="/quick-trade"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 px-8 py-3.5 text-[15px] font-medium text-white hover:bg-white/[0.05]"
            >
              Try quick trade
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
