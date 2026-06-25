/**
 * Landing — Instant KYC showcase (Aadhaar, PAN, live face match, bank verification).
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CheckCircle,
  Clock,
  CreditCard,
  Fingerprint,
  Lock,
  ScanFace,
  Shield,
  Zap,
} from 'lucide-react';

const STEPS = [
  {
    id: 'aadhaar',
    icon: Fingerprint,
    tag: 'UIDAI · OTP / DigiLocker',
    title: 'Aadhaar e-KYC',
    desc: 'Consent-based Aadhaar authentication in seconds — no branch visit or paper forms.',
    border: 'hover:border-blue-500/30',
    iconWrap: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
  },
  {
    id: 'pan',
    icon: CreditCard,
    tag: 'Income Tax · name match',
    title: 'PAN verification',
    desc: 'PAN validated instantly and cross-checked with your Aadhaar name and date of birth.',
    border: 'hover:border-violet-500/30',
    iconWrap: 'bg-violet-500/10 border-violet-500/25 text-violet-400',
  },
  {
    id: 'face',
    icon: ScanFace,
    tag: 'Liveness · anti-spoof',
    title: 'Live face match',
    desc: 'Selfie matched to your Aadhaar photo with real-time liveness to block impersonation.',
    border: 'hover:border-gold/35',
    iconWrap: 'bg-gold/10 border-gold/25 text-gold-light',
  },
  {
    id: 'bank',
    icon: Building2,
    tag: 'Penny drop · IFSC',
    title: 'Bank verification',
    desc: 'Link your INR payout account with penny-drop verification — deposits and withdrawals stay in your name.',
    border: 'hover:border-emerald-500/30',
    iconWrap: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
  },
];

const TRUST = [
  { icon: Clock, title: 'Under 2 minutes', sub: 'Fully digital onboarding' },
  { icon: Lock, title: 'Encrypted', sub: 'Secure document handling' },
  { icon: Shield, title: 'CKYC-ready', sub: 'Built for Indian regulations' },
];

export default function LandingInstantKyc() {
  return (
    <section
      id="instant-kyc"
      className="relative z-[3] border-y border-white/[0.06] overflow-hidden"
      style={{ background: 'linear-gradient(180deg, rgba(10,11,15,1) 0%, rgba(8,9,12,0.98) 50%, rgba(10,11,15,1) 100%)' }}
      data-testid="instant-kyc-section"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_20%_30%,rgba(96,165,250,0.06),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_60%,rgba(156,121,65,0.1),transparent_50%)]" />

      <div className="relative bitzx-landing-container bitzx-section-y">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-10 md:mb-12"
        >
          <p className="bitzx-eyebrow mb-3 inline-flex items-center justify-center gap-2">
            <Zap size={14} className="text-gold-light" />
            Instant KYC · India
          </p>
          <h2 className="bitzx-title-lg mb-4">
            Verify in minutes — <span className="text-gradient">not days</span>
          </h2>
          <p className="bitzx-lead text-zinc-400 max-w-none">
            Complete digital KYC on BITZX Exchange: Aadhaar and PAN checks, live face match, and bank
            verification — so you can deposit INR, withdraw, and unlock higher limits with confidence.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-10 md:mb-12">
          {STEPS.map((step, i) => (
            <motion.article
              key={step.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6 flex flex-col h-full transition-colors ${step.border}`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl border mb-4 ${step.iconWrap}`}
              >
                <step.icon size={22} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-1.5">
                {step.tag}
              </p>
              <h3 className="text-white font-semibold text-[17px] mb-2">{step.title}</h3>
              <p className="text-zinc-400 text-[14px] leading-[1.6] flex-1">{step.desc}</p>
              <p className="mt-4 inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <CheckCircle size={14} />
                Instant · automated
              </p>
            </motion.article>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          {TRUST.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 border border-gold/20 text-gold-light shrink-0">
                <item.icon size={18} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center gap-3 text-center"
        >
          <Link
            to="/kyc"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-8 py-3.5 text-[15px] font-semibold text-surface-dark shadow-lg shadow-gold/15"
          >
            Start instant KYC <ArrowRight size={16} />
          </Link>
          <p className="text-zinc-500 text-xs max-w-md leading-relaxed">
            Required before INR deposit, INR payout, and higher trading limits.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
