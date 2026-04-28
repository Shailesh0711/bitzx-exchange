import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import {
  validateStrongPassword,
  authFormBannerMessage,
  parseFastApi422FieldErrors,
  formatApiDetail,
} from '@/lib/authValidation';
import { exchangeApiOrigin } from '@/lib/apiBase';

const LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';
const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ password: '', password2: '' });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState({ password: false, password2: false });
  const showFieldError = (field) => Boolean(fieldErrors[field]) && (submitAttempted || touched[field]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError('');
    const fe = {};
    const p1 = validateStrongPassword(password);
    if (p1) fe.password = p1;
    if (password !== password2) fe.password2 = 'Passwords do not match.';
    if (Object.keys(fe).length) {
      setFieldErrors({ password: fe.password || '', password2: fe.password2 || '' });
      setError(authFormBannerMessage(fe, fe.password || fe.password2));
      return;
    }
    setFieldErrors({ password: '', password2: '' });
    if (!token) {
      setError('This reset link is missing a token. Open the link from your email again.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parsed = res.status === 422 ? parseFastApi422FieldErrors(data?.detail) : {};
        const pwMsg = parsed.new_password || parsed.password || parsed.token;
        if (pwMsg) {
          setFieldErrors({ password: parsed.new_password || parsed.password || '', password2: '' });
          setError(authFormBannerMessage({ password: pwMsg }, pwMsg));
          return;
        }
        setError(formatApiDetail(data?.detail) || 'Could not reset password.');
        return;
      }
      setDone(true);
      window.setTimeout(() => navigate('/login', { replace: true }), 2200);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(156,121,65,0.12),transparent_55%)] pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-2xl border border-white/[.08] bg-[#0d0f14] p-8 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <img src={LOGO} alt="BITZX" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-xl font-extrabold text-white">Choose a new password</h1>
            <p className="text-xs text-white/50">After saving, sign in with your new password.</p>
          </div>
        </div>

        {!token && !done ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            No reset token in the URL. Use the link from your email, or request a new one from forgot password.
          </div>
        ) : null}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 mb-4 text-sm text-red-300">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        {done ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 flex gap-3">
            <CheckCircle className="shrink-0 text-emerald-400" size={20} />
            <p>Password updated. Redirecting to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">New password</label>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 ${
                showFieldError('password') ? 'border-red-500/50' : 'border-surface-border'
              }`}>
                <Lock size={17} className="text-white/70 mr-3" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(ev) => { setPassword(ev.target.value); setFieldErrors((f) => ({ ...f, password: '' })); setError(''); }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, password: true }));
                    const msg = validateStrongPassword(password);
                    setFieldErrors((f) => ({ ...f, password: msg || '' }));
                  }}
                  autoComplete="new-password"
                  className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45"
                  placeholder="Strong password"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="text-white/70 ml-2">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {showFieldError('password') ? <p className="text-xs text-red-400 mt-1">{fieldErrors.password}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Confirm password</label>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 ${
                showFieldError('password2') ? 'border-red-500/50' : 'border-surface-border'
              }`}>
                <Lock size={17} className="text-white/70 mr-3" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password2}
                  onChange={(ev) => { setPassword2(ev.target.value); setFieldErrors((f) => ({ ...f, password2: '' })); setError(''); }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, password2: true }));
                    setFieldErrors((f) => ({
                      ...f,
                      password2: password !== password2 ? 'Passwords do not match.' : '',
                    }));
                  }}
                  autoComplete="new-password"
                  className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45"
                  placeholder="Repeat password"
                />
              </div>
              {showFieldError('password2') ? <p className="text-xs text-red-400 mt-1">{fieldErrors.password2}</p> : null}
            </div>
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-gold to-gold-light text-surface-dark disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-gold-light hover:underline">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
