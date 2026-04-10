import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Lock, Mail, User, ArrowRight, CheckCircle,
  TrendingUp, Shield, Zap, BarChart2, Star,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';

const PERKS = [
  { icon: TrendingUp, color: '#22c55e', title: 'Professional Charts',     desc: 'TradingView with 100+ indicators' },
  { icon: Zap,        color: '#EBD38D', title: 'Instant Demo Balance',    desc: '$5,000 USDT + multi-asset demo funds' },
  { icon: BarChart2,  color: '#60a5fa', title: '100+ Trading Pairs',      desc: 'Spot trade all major cryptocurrencies' },
  { icon: Shield,     color: '#a78bfa', title: 'KYC-Secured Platform',    desc: 'Identity verification for safe trading' },
  { icon: Star,       color: '#f59e0b', title: 'Low Fees — 0.1%',         desc: 'Maker & taker fee, no hidden charges' },
];

const TICKER = [
  { pair: 'BTC/USDT', price: '$71,903', change: '+0.48%', up: true },
  { pair: 'ETH/USDT', price: '$3,241',  change: '+1.22%', up: true },
  { pair: 'BZX/USDT', price: '$0.453',  change: '+2.33%', up: true },
  { pair: 'SOL/USDT', price: '$186',    change: '-0.71%', up: false },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [agree,    setAgree]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const strength      = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e'][strength];

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return; }
    if (!agree)               { setError('Please accept the Terms of Service'); return; }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/kyc');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
            <span className="block text-[10px] text-[#4A4B50] font-bold uppercase tracking-widest -mt-1">Exchange</span>
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
          <p className="text-[#8A8B90] text-base leading-relaxed">
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
              className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-xs text-[#4A4B50]">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Live ticker preview */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="relative z-10 mt-8 bg-white/[.03] border border-white/[.06] rounded-2xl p-4">
          <p className="text-[10px] font-bold text-[#4A4B50] uppercase tracking-widest mb-3">
            Live Market
          </p>
          <div className="space-y-2">
            {TICKER.map(t => (
              <div key={t.pair} className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{t.pair}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#8A8B90] font-mono">{t.price}</span>
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

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white mb-1">Create your account</h1>
          <p className="text-[#4A4B50] text-base mb-8">Free demo · No deposit required</p>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 bg-red-500/10 border border-red-500/25
                rounded-xl px-4 py-3 mb-6 text-sm text-red-400">
              <span className="flex-shrink-0 mt-0.5">⚠</span> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Email row */}
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Full Name', value: name, set: setName, icon: User, type: 'text', placeholder: 'John Doe' },
                { label: 'Email',     value: email, set: setEmail, icon: Mail, type: 'email', placeholder: 'you@email.com' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-semibold text-[#8A8B90] mb-2">{f.label}</label>
                  <div className="flex items-center bg-surface-card border border-surface-border
                    rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group">
                    <f.icon size={16} className="text-[#4A4B50] mr-3 group-focus-within:text-gold transition-colors" />
                    <input type={f.type} value={f.value}
                      onChange={e => f.set(e.target.value)} required placeholder={f.placeholder}
                      className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#2a2d35]" />
                  </div>
                </div>
              ))}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[#8A8B90] mb-2">Password</label>
              <div className="flex items-center bg-surface-card border border-surface-border
                rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group">
                <Lock size={16} className="text-[#4A4B50] mr-3 group-focus-within:text-gold transition-colors" />
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  placeholder="Minimum 8 characters"
                  className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#2a2d35]" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="text-[#4A4B50] hover:text-white transition-colors ml-2">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && (
                <div className="flex items-center gap-2.5 mt-2">
                  <div className="flex gap-1.5 flex-1">
                    {[1, 2, 3].map(lvl => (
                      <div key={lvl} className="flex-1 h-1.5 rounded-full transition-all"
                        style={{ background: strength >= lvl ? strengthColor : 'rgba(255,255,255,0.07)' }} />
                    ))}
                  </div>
                  <span className="text-xs font-bold" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-semibold text-[#8A8B90] mb-2">Confirm Password</label>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5
                focus-within:border-gold/50 transition-colors ${
                confirm && confirm !== password ? 'border-red-500/50' : 'border-surface-border'
              }`}>
                <Lock size={16} className="text-[#4A4B50] mr-3" />
                <input type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)} required
                  placeholder="Repeat your password"
                  className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#2a2d35]" />
                {confirm && confirm === password && (
                  <CheckCircle size={16} className="text-green-400 ml-2" />
                )}
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5 flex-shrink-0">
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-border accent-gold cursor-pointer" />
              </div>
              <span className="text-sm text-[#4A4B50] leading-relaxed">
                I agree to the{' '}
                <a href="#" className="text-gold-light hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-gold-light hover:underline">Privacy Policy</a>.
                This is a demo platform for educational purposes.
              </span>
            </label>

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

          <p className="text-center text-[#4A4B50] text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-light font-bold hover:underline">Sign In</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
