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
  name: '', email: '', mobile: '', password: '', confirm: '', terms: '', emailOtp: '', smsOtp: '',
});

const TICKER = [
  { pair: 'BTC/USDT', price: '$71,903', change: '+0.48%', up: true },
  { pair: 'ETH/USDT', price: '$3,241',  change: '+1.22%', up: true },
  { pair: 'BZX/USDT', price: '$0.453',  change: '+2.33%', up: true },
  { pair: 'SOL/USDT', price: '$186',    change: '-0.71%', up: false },
];

function OtpSendButton({ label, loading, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex-shrink-0 px-3 sm:px-4 py-3.5 rounded-xl text-xs sm:text-sm font-bold
        border border-gold/40 text-gold-light bg-gold/5
        hover:bg-gold/15 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-gold-light border-t-transparent rounded-full animate-spin" />
      ) : (
        label
      )}
    </button>
  );
}

export default function RegisterPage() {
  const {
    registerRequest,
    registerMobileSendOtp,
    registerVerifyEmail,
    registerVerifyMobile,
    registerComplete,
    registerResend,
  } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [smsOtp, setSmsOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [smsOtpSent, setSmsOtpSent] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);
  const [phoneHint, setPhoneHint] = useState('');
  const [success, setSuccess] = useState('');
  const [emailSendLoading, setEmailSendLoading] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [smsSendLoading, setSmsSendLoading] = useState(false);
  const [smsVerifyLoading, setSmsVerifyLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState(emptyRegisterFieldErrors);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirm: false,
    terms: false,
  });
  const showFieldError = key => Boolean(fieldErrors[key]) && (submitAttempted || touched[key]);

  const strengthMeta = getPasswordStrengthMeta(password);

  const emailTrimmed = email.trim();
  const emailValidForOtp = !validateAuthEmail(emailTrimmed);
  const mobileDigits = mobile.replace(/\D/g, '');
  let mobileNat = mobileDigits;
  if (mobileNat.length === 12 && mobileNat.startsWith('91')) mobileNat = mobileNat.slice(2);
  const mobileValidForOtp = mobileNat.length === 10 && !validateSignupMobile(mobile);

  const validateSignupForm = () => {
    const nm = name.trim();
    const em = emailTrimmed;
    const mob = mobile.trim();
    const errs = emptyRegisterFieldErrors();
    if (!mob) errs.mobile = 'Mobile number is required.';
    else {
      const mobErr = validateSignupMobile(mob);
      if (mobErr) errs.mobile = mobErr;
    }
    const regErr = validateRegisterFields({ name: nm, email: em, password });
    Object.assign(errs, regErr);
    const cErr = validateRegisterConfirm(password, confirm);
    if (cErr) errs.confirm = cErr;
    if (!agree) errs.terms = 'Please accept the Terms of Service.';
    const filtered = Object.fromEntries(Object.entries(errs).filter(([, v]) => v));
    return { nm, em, mob, errs: filtered };
  };

  const resetEmailVerification = () => {
    setEmailOtpSent(false);
    setEmailVerified(false);
    setEmailOtp('');
  };

  const resetSmsVerification = () => {
    setSmsOtpSent(false);
    setSmsVerified(false);
    setSmsOtp('');
    setPhoneHint('');
  };

  const linkContact = () => ({
    mobile: mobileDigits || undefined,
    email: emailTrimmed || undefined,
    countryCode: countryCode || undefined,
  });

  const handleSendEmailOtp = async () => {
    setError('');
    setSuccess('');
    const em = emailTrimmed;
    const emailErr = validateAuthEmail(em);
    if (emailErr) {
      setFieldErrors(f => ({ ...emptyRegisterFieldErrors(), email: emailErr }));
      setTouched(t => ({ ...t, email: true }));
      return;
    }

    setEmailSendLoading(true);
    try {
      if (emailOtpSent && !emailVerified) {
        await registerResend(em, 'email');
        setEmailOtp('');
        setSuccess('A new code has been sent to your email.');
      } else {
        const { mobile: mob, countryCode: cc } = linkContact();
        const data = await registerRequest(em, mob, cc);
        setEmailOtpSent(true);
        if (data.phone_hint) setPhoneHint(data.phone_hint);
        setEmailOtp('');
        setSuccess(data.message || 'Verification code sent to your email.');
      }
    } catch (err) {
      if (isAuthRequestError(err) && err.fieldErrors) {
        setFieldErrors({
          ...emptyRegisterFieldErrors(),
          name: err.fieldErrors.name || '',
          email: err.fieldErrors.email || '',
          mobile: err.fieldErrors.mobile || err.fieldErrors.phone || '',
          password: err.fieldErrors.password || '',
        });
        setError(err.message);
      } else {
        setError(err.message || 'Could not send email code.');
      }
    } finally {
      setEmailSendLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    setError('');
    setSuccess('');
    const em = email.trim();
    if (!emailOtp || emailOtp.trim().length < 6) {
      setFieldErrors(f => ({ ...f, emailOtp: 'Enter the 6-digit email code' }));
      return;
    }
    setFieldErrors(f => ({ ...f, emailOtp: '' }));
    setEmailVerifyLoading(true);
    try {
      const data = await registerVerifyEmail(em, emailOtp.trim());
      setEmailVerified(true);
      setSuccess(data?.message || 'Email verified.');
    } catch (err) {
      setError(err.message || 'Invalid email code.');
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleSendSmsOtp = async () => {
    setError('');
    setSuccess('');
    const mobErr = validateSignupMobile(mobile);
    if (mobErr || !mobileValidForOtp) {
      setFieldErrors(f => ({
        ...emptyRegisterFieldErrors(),
        mobile: mobErr || 'Enter a valid 10-digit mobile number.',
      }));
      setTouched(t => ({ ...t, mobile: true }));
      return;
    }
    setSmsSendLoading(true);
    try {
      const em = emailTrimmed;
      let data;
      if (smsOtpSent && !smsVerified && em) {
        data = await registerResend(em, 'sms');
      } else {
        data = await registerMobileSendOtp(mobileDigits, em || undefined, countryCode);
      }
      if (data.phone_hint) setPhoneHint(data.phone_hint);
      setSmsOtpSent(true);
      setSmsOtp('');
      setSuccess(data.message || 'SMS code sent.');
    } catch (err) {
      setError(err.message || 'Could not send SMS code.');
    } finally {
      setSmsSendLoading(false);
    }
  };

  const handleVerifySmsOtp = async () => {
    setError('');
    setSuccess('');
    if (!smsOtp || smsOtp.trim().length < 6) {
      setFieldErrors(f => ({ ...f, smsOtp: 'Enter the 6-digit SMS code' }));
      return;
    }
    setFieldErrors(f => ({ ...f, smsOtp: '' }));
    setSmsVerifyLoading(true);
    try {
      const data = await registerVerifyMobile(
        emailTrimmed,
        mobileDigits,
        countryCode,
        smsOtp.trim(),
      );
      setSmsVerified(true);
      setSuccess(data?.message || 'Mobile verified.');
    } catch (err) {
      setError(err.message || 'Invalid SMS code.');
    } finally {
      setSmsVerifyLoading(false);
    }
  };

  const handleCreateAccount = async e => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError('');
    setSuccess('');

    if (!emailVerified) {
      setError('Verify your email with the code we sent.');
      return;
    }
    if (!smsVerified) {
      setError('Verify your mobile with the SMS code we sent.');
      return;
    }

    const { nm, em, mob, errs } = validateSignupForm();
    if (Object.keys(errs).length) {
      setFieldErrors({ ...emptyRegisterFieldErrors(), ...errs });
      setError(firstRegisterError(errs) || authFormBannerMessage(errs, 'Please fix the highlighted fields.'));
      return;
    }

    setLoading(true);
    try {
      await registerComplete(nm, em, password, mob, countryCode);
      navigate('/kyc', { replace: true, state: { justRegistered: true } });
    } catch (err) {
      if (isAuthRequestError(err) && err.fieldErrors) {
        setFieldErrors({
          ...emptyRegisterFieldErrors(),
          name: err.fieldErrors.name || '',
          email: err.fieldErrors.email || '',
          mobile: err.fieldErrors.mobile || err.fieldErrors.phone || '',
          password: err.fieldErrors.password || '',
        });
      }
      setError(err.message || 'Could not create account.');
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
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 bg-green-500/10 border border-green-500/25
                rounded-xl px-4 py-3 mb-6 text-sm text-green-400">
              <CheckCircle size={16} className="flex-shrink-0 mt-0.5" /> {success}
            </motion.div>
          )}

          <form noValidate onSubmit={handleCreateAccount} className="space-y-4">
            {/* Name + Email row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Full Name</label>
                <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
                  showFieldError('name') ? 'border-red-500/50' : 'border-surface-border'
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
                      setTouched(t => ({ ...t, name: true }));
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
                {showFieldError('name') && (
                  <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.name}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-white mb-2">Email</label>
                <div className="flex gap-2">
                  <div className={`flex-1 flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
                    showFieldError('email') ? 'border-red-500/50' : 'border-surface-border'
                  }`}>
                    <Mail size={16} className="text-white mr-3 group-focus-within:text-gold transition-colors" />
                    <input
                      type="email"
                      value={email}
                      disabled={emailVerified}
                      onChange={e => {
                        setEmail(e.target.value);
                        setFieldErrors(f => ({ ...f, email: '' }));
                        setError('');
                        setSuccess('');
                        if (emailOtpSent) resetEmailVerification();
                      }}
                      onBlur={() => {
                        setTouched(t => ({ ...t, email: true }));
                        const msg = validateAuthEmail(email);
                        setFieldErrors(f => ({ ...f, email: msg || '' }));
                      }}
                      placeholder="you@email.com"
                      autoComplete="email"
                      aria-invalid={Boolean(fieldErrors.email)}
                      className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45 disabled:opacity-60"
                    />
                  </div>
                  <OtpSendButton
                    label={emailOtpSent && !emailVerified ? 'Resend' : 'Send OTP'}
                    loading={emailSendLoading}
                    disabled={emailVerified || !emailValidForOtp}
                    onClick={handleSendEmailOtp}
                  />
                </div>
                {showFieldError('email') && (
                  <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.email}</p>
                )}
                {emailVerified && (
                  <p className="text-xs text-green-400 mt-1.5 font-medium flex items-center gap-1">
                    <CheckCircle size={12} /> Email verified
                  </p>
                )}
                {emailOtpSent && !emailVerified && (
                  <div className="flex gap-2 mt-2">
                    <div className={`flex-1 flex items-center bg-surface-card border rounded-xl px-4 py-3 focus-within:border-gold/50 ${
                      fieldErrors.emailOtp ? 'border-red-500/50' : 'border-surface-border'
                    }`}>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={emailOtp}
                        onChange={e => {
                          setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setFieldErrors(f => ({ ...f, emailOtp: '' }));
                        }}
                        placeholder="Email OTP (6 digits)"
                        autoComplete="one-time-code"
                        className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45 tracking-widest"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyEmailOtp}
                      disabled={emailVerifyLoading || emailOtp.length < 6}
                      className="flex-shrink-0 px-4 py-3 rounded-xl text-sm font-bold
                        bg-gradient-to-r from-gold to-gold-light text-surface-dark
                        disabled:opacity-40"
                    >
                      {emailVerifyLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-surface-dark border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Verify'
                      )}
                    </button>
                  </div>
                )}
                {fieldErrors.emailOtp && (
                  <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.emailOtp}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Mobile <span className="text-white/45 font-normal">(SMS verification)</span>
              </label>
              <div className="flex gap-2">
                <div className={`flex-1 flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
                  showFieldError('mobile') ? 'border-red-500/50' : 'border-surface-border'
                }`}>
                  {countryCode ? (
                    <span className="text-sm font-bold text-gold-light mr-2 tabular-nums">+{countryCode}</span>
                  ) : null}
                  <Phone size={16} className="text-white mr-2 group-focus-within:text-gold transition-colors" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    disabled={smsVerified}
                    onChange={e => {
                      setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setFieldErrors(f => ({ ...f, mobile: '' }));
                      setError('');
                      setSuccess('');
                      if (smsOtpSent) resetSmsVerification();
                    }}
                    onBlur={() => {
                      setTouched(t => ({ ...t, mobile: true }));
                      if (!mobile.trim()) {
                        setFieldErrors(f => ({ ...f, mobile: 'Mobile number is required.' }));
                        return;
                      }
                      const msg = validateSignupMobile(mobile);
                      setFieldErrors(f => ({ ...f, mobile: msg || '' }));
                    }}
                    placeholder="10-digit mobile number"
                    autoComplete="tel-national"
                    aria-invalid={Boolean(fieldErrors.mobile)}
                    className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45 disabled:opacity-60"
                  />
                </div>
                <OtpSendButton
                  label={smsOtpSent && !smsVerified ? 'Resend' : 'Send OTP'}
                  loading={smsSendLoading}
                  disabled={smsVerified || !mobileValidForOtp}
                  onClick={handleSendSmsOtp}
                />
              </div>
              <p className="text-[11px] text-white/50 mt-1.5">
                {smsVerified
                  ? 'Mobile verified.'
                  : smsOtpSent
                    ? `SMS code${phoneHint ? ` sent to ${phoneHint}` : ''}. Use Resend if you did not receive it.`
                    : 'Enter a valid 10-digit number and tap Send OTP — no need to verify email first.'}
              </p>
              {showFieldError('mobile') && (
                <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.mobile}</p>
              )}
              {smsVerified && (
                <p className="text-xs text-green-400 mt-1.5 font-medium flex items-center gap-1">
                  <CheckCircle size={12} /> Mobile verified
                </p>
              )}
              {smsOtpSent && !smsVerified && (
                <div className="flex gap-2 mt-2">
                  <div className={`flex-1 flex items-center bg-surface-card border rounded-xl px-4 py-3 focus-within:border-gold/50 ${
                    fieldErrors.smsOtp ? 'border-red-500/50' : 'border-surface-border'
                  }`}>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={smsOtp}
                      onChange={e => {
                        setSmsOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setFieldErrors(f => ({ ...f, smsOtp: '' }));
                      }}
                      placeholder="SMS OTP (6 digits)"
                      autoComplete="one-time-code"
                      className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45 tracking-widest"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifySmsOtp}
                    disabled={smsVerifyLoading || smsOtp.length < 6}
                    className="flex-shrink-0 px-4 py-3 rounded-xl text-sm font-bold
                      bg-gradient-to-r from-gold to-gold-light text-surface-dark
                      disabled:opacity-40"
                  >
                    {smsVerifyLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-surface-dark border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>
              )}
              {fieldErrors.smsOtp && (
                <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.smsOtp}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Password</label>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
                showFieldError('password') ? 'border-red-500/50' : 'border-surface-border'
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
                    setTouched(t => ({ ...t, password: true }));
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
              {showFieldError('password') && (
                <p className="text-xs text-red-400 mt-1.5 font-medium" role="alert">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Confirm Password</label>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5
                focus-within:border-gold/50 transition-colors ${
                showFieldError('confirm') ? 'border-red-500/50' : 'border-surface-border'
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
                    setTouched(t => ({ ...t, confirm: true }));
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
              {showFieldError('confirm') && (
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
                  onBlur={() => setTouched(t => ({ ...t, terms: true }))}
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
            {showFieldError('terms') && (
              <p className="text-xs text-red-400 font-medium -mt-2" role="alert">{fieldErrors.terms}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !emailVerified || !smsVerified}
              className="w-full flex items-center justify-center gap-2.5
                bg-gradient-to-r from-gold to-gold-light text-surface-dark
                font-bold text-base py-4 rounded-xl mt-2
                hover:shadow-lg hover:shadow-gold/20 hover:scale-[1.01]
                active:scale-[0.99] transition-all disabled:opacity-50"
            >
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
