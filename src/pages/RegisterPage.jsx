import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Lock, Mail, User, ArrowRight, CheckCircle,
  TrendingUp, Shield, Zap, BarChart2, Star,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  validateRegisterFields,
  validateRegisterName,
  validateRegisterConfirm,
  firstRegisterError,
} from '@/lib/profileValidation';
import {
  getPasswordStrengthMeta,
  validateAuthEmail,
  validateStrongPassword,
  authFormBannerMessage,
  isAuthRequestError,
} from '@/lib/authValidation';

const LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';

const PERKS = [
  { icon: TrendingUp, color: '#22c55e', title: 'Professional Charts',     desc: 'TradingView with 100+ indicators' },
  { icon: Zap,        color: '#EBD38D', title: 'Instant Demo Balance',    desc: '$5,000 USDT + multi-asset demo funds' },
  { icon: BarChart2,  color: '#60a5fa', title: '100+ Trading Pairs',      desc: 'Spot trade all major cryptocurrencies' },
  { icon: Shield,     color: '#a78bfa', title: 'KYC-Secured Platform',    desc: 'Identity verification for safe trading' },
  { icon: Star,       color: '#f59e0b', title: 'Low Fees — 0.1%',         desc: 'Maker & taker fee, no hidden charges' },
];

const emptyRegisterFieldErrors = () => ({
  name: '', email: '', password: '', confirm: '', terms: '',
});

const TICKER = [
  { pair: 'BTC/USDT', price: '$71,903', change: '+0.48%', up: true },
  { pair: 'ETH/USDT', price: '$3,241',  change: '+1.22%', up: true },
  { pair: 'BZX/USDT', price: '$0.453',  change: '+2.33%', up: true },
  { pair: 'SOL/USDT', price: '$186',    change: '-0.71%', up: false },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState(emptyRegisterFieldErrors);

  const strengthMeta = getPasswordStrengthMeta(password);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setFieldErrors(emptyRegisterFieldErrors());
    const nm = name.trim();
    const em = email.trim();
    const regErr = validateRegisterFields({ name: nm, email: em, password });
    if (Object.keys(regErr).length) {
      setFieldErrors({ ...emptyRegisterFieldErrors(), ...regErr });
      setError(authFormBannerMessage(regErr, firstRegisterError(regErr)));
      return;
    }
    const cErr = validateRegisterConfirm(password, confirm);
    if (cErr) {
      setFieldErrors({ ...emptyRegisterFieldErrors(), confirm: cErr });
      setError(cErr);
      return;
    }
    if (!agree) {
      const t = 'Please accept the Terms of Service.';
      setFieldErrors({ ...emptyRegisterFieldErrors(), terms: t });
      setError(t);
      return;
    }
    setLoading(true);
    try {
      await register(nm, em, password);
      navigate('/kyc');
    } catch (err) {
      if (isAuthRequestError(err) && err.fieldErrors) {
        setFieldErrors({
          name: err.fieldErrors.name || '',
          email: err.fieldErrors.email || '',
          password: err.fieldErrors.password || '',
          confirm: '',
          terms: '',
        });
        setError(err.message);
      } else {
        setFieldErrors(emptyRegisterFieldErrors());
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex flex-col lg:flex-row">

      {/* ══ LEFT — Brand panel ════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col w-[420px] xl:w-[480px] flex-shrink-0
        relative overflow-hidden px-12 py-12
        bg-[#0a0b0f] border-r border-white/[.05]">

        {/* Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(156,121,65,0.15),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_85%,rgba(96,165,250,0.06),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[.025]"
          style={{ backgroundImage: 'linear-gradient(#9C7941 1px,transparent 1px),linear-gradient(90deg,#9C7941 1px,transparent 1px)', backgroundSize: '44px 44px' }} />

        {/* Logo */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-10 relative z-10">
          <img src={LOGO} alt="BITZX" className="h-11 w-11 object-contain" />
          <div>
            <span className="font-extrabold text-2xl tracking-tight">
              <span className="text-white">BITZ</span>
              <span className="text-gradient">X</span>
            </span>
            <span className="block text-[10px] text-white font-bold uppercase tracking-widest -mt-1">Exchange</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative z-10 mb-8">
          <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.1] mb-4">
            Start trading<br />
            <span className="text-gradient">in minutes</span>
          </h2>
          <p className="text-white text-base leading-relaxed">
            Get a free demo account with instant balances — no deposit required.
            Full trading experience from day one.
          </p>
        </motion.div>

        {/* Perks */}
        <div className="relative z-10 space-y-3 flex-1">
          {PERKS.map(({ icon: Icon, color, title, desc }, i) => (
            <motion.div key={title}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.25 + i * 0.07 }}
              className="bitzx-hover-lift bitzx-hover-border flex items-center gap-4 rounded-xl px-2 py-2 -mx-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-xs text-white">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Live ticker preview */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="relative z-10 mt-8 bitzx-hover-lift bitzx-hover-glow bg-white/[.03] border border-white/[.06] rounded-2xl p-4">
          <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-3">
            Live Market
          </p>
          <div className="space-y-2">
            {TICKER.map(t => (
              <div key={t.pair} className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{t.pair}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white font-mono">{t.price}</span>
                  <span className={`text-[11px] font-bold ${t.up ? 'text-green-400' : 'text-red-400'}`}>
                    {t.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ══ RIGHT — Registration form ═════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-center
        px-6 sm:px-10 lg:px-14 xl:px-16 py-8 sm:py-10 relative overflow-y-auto">

        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64
          bg-[radial-gradient(ellipse,rgba(156,121,65,0.07),transparent_70%)] pointer-events-none" />

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <img src={LOGO} alt="BITZX" className="h-9 w-9 object-contain" />
          <span className="font-extrabold text-xl">
            <span className="text-white">BITZ</span>
            <span className="text-gradient">X</span>
          </span>
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-lg w-full mx-auto">

          <>
          <h1 className="text-3xl xl:text-4xl font-extrabold text-white mb-1">Create your account</h1>
          <p className="text-white text-base mb-8">Free demo · No deposit required</p>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 bg-red-500/10 border border-red-500/25
                rounded-xl px-4 py-3 mb-6 text-sm text-red-400">
              <span className="flex-shrink-0 mt-0.5">⚠</span> {error}
            </motion.div>
          )}

          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Email row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Full Name</label>
                <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
                  fieldErrors.name ? 'border-red-500/50' : 'border-surface-border'
                }`}>
                  <User size={16} className="text-white mr-3 group-focus-within:text-gold transition-colors" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      setFieldErrors(f => ({ ...f, name: '' }));
                      setError('');
                    }}
                    onBlur={() => {
                      if (!name.trim()) {
                        setFieldErrors(f => ({ ...f, name: '' }));
                        return;
                      }
                      const msg = validateRegisterName(name);
                      setFieldErrors(f => ({ ...f, name: msg || '' }));
                    }}
                    placeholder="John Doe"
                    autoComplete="name"
                    aria-invalid={Boolean(fieldErrors.name)}
                    className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Email</label>
                <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
                  fieldErrors.email ? 'border-red-500/50' : 'border-surface-border'
                }`}>
                  <Mail size={16} className="text-white mr-3 group-focus-within:text-gold transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      setFieldErrors(f => ({ ...f, email: '' }));
                      setError('');
                    }}
                    onBlur={() => {
                      const msg = validateAuthEmail(email);
                      setFieldErrors(f => ({ ...f, email: msg || '' }));
                    }}
                    placeholder="you@email.com"
                    autoComplete="email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Password</label>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
                fieldErrors.password ? 'border-red-500/50' : 'border-surface-border'
              }`}>
                <Lock size={16} className="text-white mr-3 group-focus-within:text-gold transition-colors" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setFieldErrors(f => ({ ...f, password: '', confirm: '' }));
                    setError('');
                  }}
                  onBlur={() => {
                    if (!password) {
                      setFieldErrors(f => ({ ...f, password: '' }));
                      return;
                    }
                    const msg = validateStrongPassword(password);
                    setFieldErrors(f => ({ ...f, password: msg || '' }));
                  }}
                  placeholder="8+ chars: upper, lower, number, symbol"
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="text-white hover:text-white transition-colors ml-2">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1.5 flex-1">
                      {[1, 2, 3, 4].map(lvl => (
                        <div key={lvl} className="flex-1 h-1.5 rounded-full transition-all"
                          style={{ background: strengthMeta.score >= lvl ? strengthMeta.color : 'rgba(255,255,255,0.07)' }} />
                      ))}
                    </div>
                    {strengthMeta.label && (
                      <span className="text-xs font-bold whitespace-nowrap" style={{ color: strengthMeta.color }}>{strengthMeta.label}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-white leading-snug">
                    Use at least 8 characters with uppercase, lowercase, a number, and a symbol (e.g. ! or #).
                  </p>
                </div>
              )}
              {fieldErrors.password && (
                <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Confirm Password</label>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5
                focus-within:border-gold/50 transition-colors ${
                fieldErrors.confirm || (confirm && confirm !== password) ? 'border-red-500/50' : 'border-surface-border'
              }`}>
                <Lock size={16} className="text-white mr-3" />
                <input
                  type="password"
                  value={confirm}
                  onChange={e => {
                    setConfirm(e.target.value);
                    setFieldErrors(f => ({ ...f, confirm: '' }));
                    setError('');
                  }}
                  onBlur={() => {
                    const msg = validateRegisterConfirm(password, confirm);
                    setFieldErrors(f => ({ ...f, confirm: msg || '' }));
                  }}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.confirm)}
                  className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45"
                />
                {confirm && confirm === password && !fieldErrors.confirm && (
                  <CheckCircle size={16} className="text-green-400 ml-2" />
                )}
              </div>
              {fieldErrors.confirm && (
                <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.confirm}</p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={e => {
                    setAgree(e.target.checked);
                    setFieldErrors(f => ({ ...f, terms: '' }));
                    setError('');
                  }}
                  className="w-4 h-4 rounded border-surface-border accent-gold cursor-pointer"
                />
              </div>
              <span className="text-sm text-white leading-relaxed">
                I agree to the{' '}
                <a href="#" className="text-gold-light hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-gold-light hover:underline">Privacy Policy</a>.
                This is a demo platform for educational purposes.
              </span>
            </label>
            {fieldErrors.terms && (
              <p className="text-xs text-red-400 font-medium -mt-2" role="alert">{fieldErrors.terms}</p>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2.5
                bg-gradient-to-r from-gold to-gold-light text-surface-dark
                font-bold text-base py-4 rounded-xl mt-2
                hover:shadow-lg hover:shadow-gold/20 hover:scale-[1.01]
                active:scale-[0.99] transition-all disabled:opacity-50">
              {loading
                ? <div className="w-5 h-5 border-2 border-surface-dark border-t-transparent rounded-full animate-spin" />
                : <><span>Create Free Account</span> <ArrowRight size={18} /></>}
            </button>
          </form>
          </>

          <p className="text-center text-white text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-light font-bold hover:underline">Sign In</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
