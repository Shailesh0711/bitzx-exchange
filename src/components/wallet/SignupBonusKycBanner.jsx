import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Shield, X } from 'lucide-react';
import { authFetch } from '@/context/AuthContext';
import { exchangeApiOrigin } from '@/lib/apiBase';

const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);
const DISMISS_KEY = 'bitzx_signup_bonus_kyc_dismiss';

export default function SignupBonusKycBanner() {
  const [prompt, setPrompt] = useState(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        setHidden(true);
        return;
      }
      const res = await authFetch(`${API}/api/wallet/signup-bonus-pending`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.show_prompt) {
        setPrompt(null);
        return;
      }
      setPrompt(data);
    } catch {
      setPrompt(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (hidden || !prompt?.show_prompt) return null;

  return (
    <div className="mb-4 rounded-xl border border-gold/35 bg-gold/10 px-4 py-3.5 flex flex-col sm:flex-row sm:items-start gap-3 relative">
      <button
        type="button"
        onClick={() => {
          setHidden(true);
          sessionStorage.setItem(DISMISS_KEY, '1');
        }}
        className="absolute top-2.5 right-2.5 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 flex-1 pr-6">
        <div className="shrink-0 p-2 rounded-lg bg-gold/20">
          <Gift size={18} className="text-gold-light" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">{prompt.title || 'Your BZX signup bonus is waiting'}</p>
          <p className="text-xs text-white/65 mt-1 leading-relaxed">
            {prompt.message
              || `Complete KYC to receive ${prompt.amount_bzx ?? ''} BZX in your trading wallet.`}
          </p>
          <Link
            to="/kyc"
            className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-gold-light hover:underline"
          >
            <Shield size={13} />
            Complete KYC
          </Link>
        </div>
      </div>
    </div>
  );
}
