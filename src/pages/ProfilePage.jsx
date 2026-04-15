import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Lock, Shield, CheckCircle, AlertCircle,
  ChevronRight, Edit2, Eye, EyeOff, Mail, Phone,
  Camera, Trash2, Globe, FileText,
} from 'lucide-react';
import { useAuth, authFetch } from '@/context/AuthContext';
import {
  validateProfileForm,
  firstProfileError,
  validatePasswordChangeFields,
  firstPasswordChangeFieldError,
} from '@/lib/profileValidation';
import {
  formatApiDetail,
  parseFastApi422FieldErrors,
  authFormBannerMessage,
  validateStrongPassword,
} from '@/lib/authValidation';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function resolveAvatarUrl(user) {
  if (!user?.avatar_url) return null;
  const u = user.avatar_url;
  if (u.startsWith('http')) return u;
  const base = API.replace(/\/$/, '');
  return `${base}${u.startsWith('/') ? u : `/${u}`}`;
}

const KYC_CONFIG = {
  approved:   { label: 'Verified',      bg: 'rgba(34,197,94,0.12)',  text: '#22c55e',  border: 'rgba(34,197,94,0.25)',  icon: CheckCircle },
  pending:    { label: 'Under Review',  bg: 'rgba(245,158,11,0.12)', text: '#f59e0b',  border: 'rgba(245,158,11,0.25)', icon: Shield      },
  rejected:   { label: 'Rejected',      bg: 'rgba(239,68,68,0.12)',  text: '#ef4444',  border: 'rgba(239,68,68,0.25)',  icon: AlertCircle },
  unverified: { label: 'Not Verified',  bg: 'rgba(255,255,255,0.04)',text: '#ffffff',  border: 'rgba(255,255,255,0.08)', icon: Shield     },
};

function Toast({ msg, ok }) {
  if (!msg) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
        ok ? 'bg-green-500/10 border border-green-500/25 text-green-400'
           : 'bg-red-500/10 border border-red-500/25 text-red-400'}`}>
      {ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </motion.div>
  );
}

function FieldGroup({ label, children, hint, required, error }) {
  const err = error?.trim();
  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-2 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {err && <p className="text-xs text-red-400 mt-1.5 font-semibold">{err}</p>}
      {hint && !err && <p className="text-xs text-white/60 mt-1.5">{hint}</p>}
    </div>
  );
}

function ProfileTab({ user, updateUser }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    country: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      country: user.country || '',
      bio: user.bio || '',
    });
  }, [user]);

  useEffect(() => {
    setFieldErrors({});
  }, [form.name, form.phone, form.country, form.bio]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const showToast = (msg, ok) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4500); };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
  const avatarSrc = preview || resolveAvatarUrl(user);

  const handleSave = async () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const country = form.country.trim();
    const errs = validateProfileForm({
      name: form.name,
      phone: form.phone,
      country: form.country,
      bio: form.bio,
    });
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      showToast(firstProfileError(errs) || 'Please fix the highlighted fields.', false);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          phone,
          country,
          bio: form.bio.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Update failed');
      updateUser(data);
      showToast('Profile updated successfully!', true);
    } catch (e) {
      showToast(e.message, false);
    } finally { setSaving(false); }
  };

  const dirty =
    form.name.trim() !== (user?.name || '') ||
    form.phone.trim() !== (user?.phone || '') ||
    form.country.trim() !== (user?.country || '') ||
    form.bio.trim() !== (user?.bio || '');

  const onPickFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please choose a JPEG, PNG, or WebP image', false);
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast('Image must be 100MB or smaller', false);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await authFetch(`${API}/api/auth/profile/avatar`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      updateUser(data);
      setPreview(null);
      showToast('Profile photo updated', true);
    } catch (err) {
      setPreview(null);
      showToast(err.message, false);
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!user?.avatar_url) return;
    setUploading(true);
    try {
      const res = await authFetch(`${API}/api/auth/profile/avatar`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not remove photo');
      updateUser(data);
      setPreview(null);
      showToast('Profile photo removed', true);
    } catch (e) {
      showToast(e.message, false);
    } finally { setUploading(false); }
  };

  const kycConf = KYC_CONFIG[user?.kyc_status || 'unverified'];
  const KycIcon = kycConf.icon;

  return (
    <div className="space-y-8 w-full">
      {/* Photo + account meta (left on large screens) — no duplicate name/email; those are in the page title + form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div
          className="lg:col-span-4 flex flex-col gap-4 p-5 sm:p-6 rounded-2xl h-fit lg:sticky lg:top-24"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-xs font-bold text-white uppercase tracking-wider">Profile photo</p>
          <div className="flex justify-center lg:justify-start">
            <div
              className="relative w-32 h-32 rounded-2xl overflow-hidden flex items-center justify-center
                text-3xl font-extrabold text-gold-light select-none ring-2 ring-gold/35"
              style={{ background: 'linear-gradient(135deg, rgba(156,121,65,0.3), rgba(235,211,141,0.1))' }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                bg-gold/15 text-gold-light border border-gold/30 hover:bg-gold/25 transition-colors disabled:opacity-50"
            >
              <Camera size={16} /> {user?.avatar_url ? 'Change photo' : 'Upload photo'}
            </button>
            {user?.avatar_url && (
              <button
                type="button"
                disabled={uploading}
                onClick={removeAvatar}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                  text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} /> Remove
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
          <p className="text-[11px] text-white/50 text-center lg:text-left">
            JPG, PNG or WebP · max 100MB
          </p>
          <div className="h-px bg-white/[.06]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Account ID</p>
            <p className="text-xs font-mono text-white/90 break-all">{user?.uid}</p>
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold w-fit"
            style={{ background: kycConf.bg, color: kycConf.text, border: `1px solid ${kycConf.border}` }}
          >
            <KycIcon size={12} /> {kycConf.label}
          </div>
          <p className="text-xs text-white/55">Standard account · 0.1% trading fee</p>
        </div>

        <div className="lg:col-span-8 space-y-6 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FieldGroup label="Display Name" required error={fieldErrors.name} hint="Your name as shown on the exchange">
          <div className={`flex items-center bg-surface-card border
            rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
              fieldErrors.name ? 'border-red-500/50' : 'border-surface-border'
            }`}>
            <User size={17} className="text-white mr-3 group-focus-within:text-gold transition-colors flex-shrink-0" />
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your display name"
              required
              className="flex-1 min-w-0 bg-transparent text-base text-white outline-none placeholder:text-white/45"
            />
          </div>
        </FieldGroup>

        <FieldGroup label="Phone" required error={fieldErrors.phone} hint="Include country code (e.g. +1 …)">
          <div className={`flex items-center bg-surface-card border
            rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
              fieldErrors.phone ? 'border-red-500/50' : 'border-surface-border'
            }`}>
            <Phone size={17} className="text-white mr-3 group-focus-within:text-gold transition-colors flex-shrink-0" />
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+1 555 000 0000"
              required
              inputMode="tel"
              autoComplete="tel"
              className="flex-1 min-w-0 bg-transparent text-base text-white outline-none placeholder:text-white/45"
            />
          </div>
        </FieldGroup>

        <FieldGroup label="Country / Region" required error={fieldErrors.country}>
          <div className={`flex items-center bg-surface-card border
            rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
              fieldErrors.country ? 'border-red-500/50' : 'border-surface-border'
            }`}>
            <Globe size={17} className="text-white mr-3 group-focus-within:text-gold transition-colors flex-shrink-0" />
            <input
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              placeholder="United States"
              required
              autoComplete="country-name"
              className="flex-1 min-w-0 bg-transparent text-base text-white outline-none placeholder:text-white/45"
            />
          </div>
        </FieldGroup>

        <FieldGroup label="Email Address">
          <div className="flex items-center bg-surface-card border border-surface-border
            rounded-xl px-4 py-3.5 gap-3">
            <Mail size={17} className="text-white flex-shrink-0" />
            <span className="flex-1 min-w-0 text-base text-white truncate">{user?.email}</span>
            <span className="text-xs text-white bg-white/[.04] px-2.5 py-1 rounded-lg flex-shrink-0">
              Read-only
            </span>
          </div>
        </FieldGroup>
          </div>

          <FieldGroup label="Bio" error={fieldErrors.bio} hint="Optional — a short line about you (max 500 characters)">
            <div className={`flex items-start bg-surface-card border
              rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
                fieldErrors.bio ? 'border-red-500/50' : 'border-surface-border'
              }`}>
              <FileText size={17} className="text-white mr-3 mt-0.5 group-focus-within:text-gold transition-colors flex-shrink-0" />
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell others a bit about your trading style…"
                rows={4}
                maxLength={500}
                className="flex-1 min-w-0 bg-transparent text-base text-white outline-none placeholder:text-white/45 resize-y min-h-[100px]"
              />
            </div>
          </FieldGroup>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gold/90 hover:bg-gold text-surface-dark
                font-bold rounded-xl text-sm transition-all disabled:opacity-40"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-surface-dark border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Edit2 size={15} /> Save profile</>
              )}
            </button>
            {!dirty && (
              <span className="text-sm text-white/50">No unsaved changes</span>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {user?.kyc_status !== 'approved' && (
        <div className="rounded-2xl p-6"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Shield size={20} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-amber-300 mb-1">Identity Verification</p>
              <p className="text-sm text-white mb-4">
                Complete KYC to unlock spot trading, deposits, and withdrawals on BITZX Exchange.
              </p>
              <Link to="/kyc"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                  transition-all text-amber-300 hover:text-amber-200"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                Start Verification <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const emptyPwFieldErrors = () => ({
  current_password: '', new_password: '', confirm: '',
});

function SecurityTab() {
  const [form,   setForm]   = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState({ cur: false, nw: false, cnf: false });
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);
  const [fieldErrors, setFieldErrors] = useState(emptyPwFieldErrors);

  const showToast = (msg, ok) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 5000); };
  const onPwdChange = k => e => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setFieldErrors(f => ({ ...f, [k]: '' }));
  };
  const togglePw  = k => setShowPw(p => ({ ...p, [k]: !p[k] }));

  const handleChange = async () => {
    const fe = validatePasswordChangeFields(form);
    if (Object.keys(fe).length) {
      setFieldErrors({
        current_password: fe.current_password || '',
        new_password: fe.new_password || '',
        confirm: fe.confirm || '',
      });
      showToast(firstPasswordChangeFieldError(fe) || 'Please fix the highlighted fields.', false);
      return;
    }
    setSaving(true);
    try {
      const res  = await authFetch(`${API}/api/auth/password`, {
        method: 'PUT',
        body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch { /* non-JSON */ }
      if (!res.ok) {
        const apiFe = res.status === 422 ? parseFastApi422FieldErrors(data.detail) : {};
        if (Object.keys(apiFe).length) {
          setFieldErrors({
            current_password: apiFe.current_password || '',
            new_password: apiFe.new_password || '',
            confirm: apiFe.confirm || '',
          });
          showToast(authFormBannerMessage(apiFe, formatApiDetail(data.detail)), false);
        } else {
          setFieldErrors(emptyPwFieldErrors());
          showToast(formatApiDetail(data.detail) || 'Failed to change password', false);
        }
        return;
      }
      showToast('Password changed successfully!', true);
      setForm({ current_password: '', new_password: '', confirm: '' });
      setFieldErrors(emptyPwFieldErrors());
    } catch (e) {
      setFieldErrors(emptyPwFieldErrors());
      showToast(e.message || 'Something went wrong', false);
    } finally { setSaving(false); }
  };

  const pwFields = [
    {
      key: 'current_password', label: 'Current Password', placeholder: 'Enter your current password', showKey: 'cur',
      onBlur: () => {
        const cur = (form.current_password || '').trim();
        setFieldErrors(f => ({ ...f, current_password: cur ? '' : 'Enter your current password.' }));
      },
    },
    {
      key: 'new_password', label: 'New Password', placeholder: '8+ chars, upper, lower, #, symbol', showKey: 'nw',
      onBlur: () => {
        const nw = form.new_password || '';
        const cur = (form.current_password || '').trim();
        let msg = validateStrongPassword(nw) || '';
        if (!msg && nw && cur && nw === cur) {
          msg = 'New password must be different from your current password.';
        }
        setFieldErrors(f => ({ ...f, new_password: msg }));
      },
    },
    {
      key: 'confirm', label: 'Confirm New Password', placeholder: 'Re-enter new password', showKey: 'cnf',
      onBlur: () => {
        const nw = form.new_password || '';
        const cf = form.confirm || '';
        let msg = '';
        if (nw && !String(cf).trim()) msg = 'Confirm your new password.';
        else if (String(cf).trim() && nw !== cf) msg = 'New passwords do not match.';
        setFieldErrors(f => ({ ...f, confirm: msg }));
      },
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        {pwFields.map(({ key, label, placeholder, showKey, onBlur }) => (
          <FieldGroup key={key} label={label} error={fieldErrors[key]}>
            <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group ${
              fieldErrors[key] ? 'border-red-500/50' : 'border-surface-border'
            }`}>
              <Lock size={17} className="text-white mr-3 group-focus-within:text-gold transition-colors" />
              <input
                type={showPw[showKey] ? 'text' : 'password'}
                value={form[key]}
                onChange={onPwdChange(key)}
                onBlur={onBlur}
                placeholder={placeholder}
                autoComplete={key === 'current_password' ? 'current-password' : 'new-password'}
                aria-invalid={Boolean(fieldErrors[key])}
                className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/45"
              />
              <button type="button" onClick={() => togglePw(showKey)}
                className="text-white hover:text-white transition-colors ml-2">
                {showPw[showKey] ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </FieldGroup>
        ))}
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <button onClick={handleChange}
        disabled={saving || !form.current_password || !form.new_password || !form.confirm}
        className="flex items-center gap-2.5 px-8 py-4 bg-gold/90 hover:bg-gold
          text-surface-dark font-bold rounded-xl text-base transition-all disabled:opacity-40">
        {saving
          ? <span className="w-5 h-5 border-2 border-surface-dark border-t-transparent rounded-full animate-spin" />
          : <><Lock size={16} /> Update Password</>}
      </button>

      <div className="rounded-2xl p-6 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-base font-bold text-white flex items-center gap-2.5">
          <Shield size={16} className="text-gold" /> Security Recommendations
        </p>
        {[
          'Use a unique password that you don\'t use on other websites',
          'Include uppercase, lowercase letters, numbers and symbols',
          'Never share your password with anyone, including BITZX support',
          'Enable 2FA (coming soon) for an extra layer of security',
        ].map(tip => (
          <p key={tip} className="text-sm text-white flex items-start gap-3">
            <span className="text-gold mt-0.5 flex-shrink-0">✓</span> {tip}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const TABS = [
    { id: 'profile',  label: 'Profile Info', icon: User },
    { id: 'security', label: 'Security',      icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-surface-dark w-full overflow-x-hidden">
      <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 pb-16">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Profile &amp; security</h1>
          <p className="text-white/65 text-sm mt-1 truncate">{user?.email}</p>
        </div>

        {/* Tabs — same pattern as Wallet: full width, no duplicate nav cards */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-surface-border pb-0 mb-6 w-full min-w-0">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px flex-1 min-w-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeTab === id ? 'border-gold text-gold-light' : 'border-transparent text-white/85 hover:text-white'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          <Link
            to="/kyc"
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold border border-surface-border
              text-white hover:border-gold/40 hover:bg-white/[.04] transition-colors shrink-0 mb-3 sm:mb-0"
          >
            <Shield size={14} /> KYC
          </Link>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full min-w-0 rounded-2xl p-5 sm:p-8"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {activeTab === 'profile' && <ProfileTab user={user} updateUser={updateUser} />}
          {activeTab === 'security' && <SecurityTab />}
        </motion.div>
      </div>
    </div>
  );
}
