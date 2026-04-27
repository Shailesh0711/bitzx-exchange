import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle,
  TrendingUp, Shield, Zap, BarChart2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  validateAuthEmail,
  validateAuthPasswordLogin,
  authFormBannerMessage,
  isAuthRequestError,
} from '@/lib/authValidation';

const LOGO      = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';
const TOKEN_URL = import.meta.env.VITE_TOKEN_URL || 'https://bitzx.io';

const STATS = [
  { label: 'Daily Volume',   value: '$3.28M',  icon: TrendingUp, color: '#22c55e' },
  { label: 'Active Traders', value: '2.55K+',  icon: Zap,        color: '#EBD38D' },
  { label: 'Trading Pairs',  value: '100+',    icon: BarChart2,  color: '#60a5fa' },
  { label: 'Security',       value: 'Level 5', icon: Shield,     color: '#a78bfa' },
];

const FEATURES = [
  { title: 'Real-time Order Book',      desc: 'Live depth data updated every 1.5s' },
  { title: 'TradingView Charts',        desc: 'Full indicator suite with 100+ studies' },
  { title: 'Maker / Taker Fee 0.1%',   desc: 'Industry-leading low trading costs' },
  { title: 'KYC-Secured Withdrawals',  desc: 'Your funds stay safe, always' },
];

function FloatingCard({ stat, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bitzx-hover-lift bitzx-hover-glow bg-white/[.04] border border-white/[.07] rounded-2xl px-5 py-4
        backdrop-blur-sm flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}30` }}>
        <stat.icon size={18} style={{ color: stat.color }} />
      </div>
      <div>
        <p className="text-xl font-extrabold text-white leading-none">{stat.value}</p>
        <p className="text-xs text-white mt-0.5">{stat.label}</p>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const clearApiState = () => {
    setError('');
    setFieldErrors({ email: '', password: '' });
  };
  const showFieldError = field => Boolean(fieldErrors[field]) && (submitAttempted || touched[field]);

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitAttempted(true);
    clearApiState();
    const emErr = validateAuthEmail(email);
    const pwErr = validateAuthPasswordLogin(password);
    const fe = {};
    if (emErr) fe.email = emErr;
    if (pwErr) fe.password = pwErr;
    if (Object.keys(fe).length) {
      setFieldErrors({ email: fe.email || '', password: fe.password || '' });
      setError(authFormBannerMessage(fe, emErr || pwErr));
      return;
    }
    const em = email.trim();
    setLoading(true);
    try {
      await login(em, password);
      navigate('/dashboard');
    } catch (err) {
      if (isAuthRequestError(err) && err.fieldErrors) {
        setFieldErrors({
          email: err.fieldErrors.email || '',
          password: err.fieldErrors.password || '',
        });
        setError(err.message);
      } else {
        setFieldErrors({ email: '', password: '' });
        setError(err.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex flex-col lg:flex-row">

      {/* ══ LEFT — Brand panel ════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden px-16 py-12">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(156,121,65,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(96,165,250,0.06),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[.025]"
          style={{ backgroundImage: 'linear-gradient(#9C7941 1px,transparent 1px),linear-gradient(90deg,#9C7941 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Logo */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-auto relative z-10">
          <img src={LOGO} alt="BITZX" className="h-11 w-11 object-contain" />
          <div>
            <span className="font-extrabold text-2xl tracking-tight">
              <span className="text-white">BITZ</span>
              <span className="text-gradient">X</span>
            </span>
            <span className="block text-[10px] text-white font-bold uppercase tracking-widest -mt-1">
              Exchange
            </span>
          </div>
        </motion.div>

        {/* Hero text */}
        <div className="relative z-10 my-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] mb-5">
            Trade Smarter.<br />
            <span className="text-gradient">Earn More.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-white leading-relaxed max-w-md">
            Professional-grade crypto exchange with real-time charts, a live order book,
            and institutional-level security — all in one place.
          </motion.p>
        </div>

        {/* Stats grid */}
        <div className="relative z-10 grid grid-cols-2 gap-3 mb-10 max-w-md">
          {STATS.map((s, i) => <FloatingCard key={s.label} stat={s} delay={0.25 + i * 0.08} />)}
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-3 max-w-md">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
              className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs text-white">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT — Login form ════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[480px] xl:w-[520px] lg:flex-shrink-0 flex flex-col
        justify-center px-6 sm:px-10 lg:px-14 py-10 sm:py-12
        bg-[#0d0f14] lg:border-l border-white/[.05] relative">

        {/* Subtle top glow */}
        <div className="absolute top-0 left-0 right-0 h-64
          bg-[radial-gradient(ellipse_at_50%_0%,rgba(156,121,65,0.08),transparent_70%)]
          pointer-events-none" />

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <img src={LOGO} alt="BITZX" className="h-9 w-9 object-contain" />
          <span className="font-extrabold text-xl">
            <span className="text-white">BITZ</span>
            <span className="text-gradient">X</span>
          </span>
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white mb-1">Welcome back</h2>
          <p className="text-white text-base mb-8">Sign in to your exchange account</p>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-red-500/10 border border-red-500/25
                rounded-xl px-4 py-3 mb-6 text-sm text-red-400">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Email Address
              </label>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
                showFieldError('email') ? 'border-red-500/50' : 'border-surface-border'
              }`}>
                <Mail size={17} className="text-white mr-3 group-focus-within:text-gold transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setFieldErrors(f => ({ ...f, email: '' }));
                    setError('');
                  }}
                  onBlur={() => {
                    setTouched(t => ({ ...t, email: true }));
                    const msg = validateAuthEmail(email);
                    setFieldErrors(f => ({ ...f, email: msg || '' }));
                  }}
                  required
                  placeholder="you@email.com"
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45"
                />
              </div>
              {showFieldError('email') && (
                <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-white">Password</label>
                <Link to="/forgot-password" className="text-xs text-gold-light hover:underline">Forgot password?</Link>
              </div>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
                showFieldError('password') ? 'border-red-500/50' : 'border-surface-border'
              }`}>
                <Lock size={17} className="text-white mr-3 group-focus-within:text-gold transition-colors" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setFieldErrors(f => ({ ...f, password: '' }));
                    setError('');
                  }}
                  onBlur={() => {
                    setTouched(t => ({ ...t, password: true }));
                    const msg = validateAuthPasswordLogin(password);
                    setFieldErrors(f => ({ ...f, password: msg || '' }));
                  }}
                  required
                  placeholder="Your password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="text-white hover:text-white transition-colors ml-2">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {showFieldError('password') && (
                <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-4 h-4 rounded border border-surface-border bg-surface-card
                  peer-checked:bg-gold peer-checked:border-gold transition-colors" />
              </div>
              <span className="text-sm text-white">Remember me on this device</span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2.5
                bg-gradient-to-r from-gold to-gold-light text-surface-dark
                font-bold text-base py-4 rounded-xl
                hover:shadow-lg hover:shadow-gold/20 hover:scale-[1.01]
                active:scale-[0.99] transition-all disabled:opacity-50 mt-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-surface-dark border-t-transparent rounded-full animate-spin" />
                : <><span>Sign In to Exchange</span> <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="text-xs text-white">OR</span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          <p className="text-center text-white text-sm">
            New to BITZX?{' '}
            <Link to="/register" className="text-gold-light font-bold hover:underline">
              Create a free account
            </Link>
          </p>

          <p className="text-center text-xs text-white mt-6">
            <a href={TOKEN_URL} className="hover:text-white transition-colors">
              ← Back to Token Website
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
