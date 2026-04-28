import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { validateAuthEmail, authFormBannerMessage } from '@/lib/authValidation';
import { exchangeApiOrigin } from '@/lib/apiBase';

const LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';
const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState(false);
  const showFieldError = Boolean(fieldError) && (submitAttempted || touched);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError('');
    const emErr = validateAuthEmail(email);
    if (emErr) {
      setFieldError(emErr);
      setError(authFormBannerMessage({ email: emErr }, emErr));
      return;
    }
    setFieldError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.detail === 'string' ? data.detail : 'Request failed. Try again later.');
        return;
      }
      setDone(true);
    } catch {
      setError('Network error. Check your connection and try again.');
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
        <div className="flex items-center gap-3 mb-8">
          <img src={LOGO} alt="BITZX" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-xl font-extrabold text-white">Reset password</h1>
            <p className="text-xs text-white/50">We will email you a secure link if the account exists.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 mb-4 text-sm text-red-300">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        {done ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 flex gap-3">
            <CheckCircle className="shrink-0 text-emerald-400" size={20} />
            <p>
              If an account exists for that email, password reset instructions were sent. Check your inbox and spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Email</label>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 ${
                showFieldError ? 'border-red-500/50' : 'border-surface-border'
              }`}>
                <Mail size={17} className="text-white/70 mr-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(ev) => { setEmail(ev.target.value); setFieldError(''); setError(''); }}
                  onBlur={() => {
                    setTouched(true);
                    const emErr = validateAuthEmail(email);
                    setFieldError(emErr || '');
                  }}
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45"
                />
              </div>
              {showFieldError ? <p className="text-xs text-red-400 mt-1.5">{fieldError}</p> : null}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-gold to-gold-light text-surface-dark disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-gold-light hover:underline"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
