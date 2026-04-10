import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Lock, Shield, CheckCircle, AlertCircle,
  ChevronRight, Edit2, Eye, EyeOff, Mail, Phone,
} from 'lucide-react';
import { useAuth, authFetch } from '@/context/AuthContext';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const KYC_CONFIG = {
  approved:   { label: 'Verified',      bg: 'rgba(34,197,94,0.12)',  text: '#22c55e',  border: 'rgba(34,197,94,0.25)',  icon: CheckCircle },
  pending:    { label: 'Under Review',  bg: 'rgba(245,158,11,0.12)', text: '#f59e0b',  border: 'rgba(245,158,11,0.25)', icon: Shield      },
  rejected:   { label: 'Rejected',      bg: 'rgba(239,68,68,0.12)',  text: '#ef4444',  border: 'rgba(239,68,68,0.25)',  icon: AlertCircle },
  unverified: { label: 'Not Verified',  bg: 'rgba(255,255,255,0.04)',text: '#4A4B50',  border: 'rgba(255,255,255,0.08)', icon: Shield     },
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

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#8A8B90] mb-2 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function ProfileTab({ user, setUser }) {
  const [name,   setName]   = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  const showToast = (msg, ok) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4500); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res  = await authFetch(`${API}/api/auth/profile`, {
        method: 'PUT', body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Update failed');
      setUser(data);
      showToast('Profile updated successfully!', true);
    } catch (e) {
      showToast(e.message, false);
    } finally { setSaving(false); }
  };

  const kycConf  = KYC_CONFIG[user?.kyc_status || 'unverified'];
  const KycIcon  = kycConf.icon;
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div className="space-y-8">
      {/* Avatar card */}
      <div className="flex items-center gap-6 p-6 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center
          text-3xl font-extrabold text-gold-light select-none flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(156,121,65,0.3), rgba(235,211,141,0.1))', border: '2px solid rgba(156,121,65,0.35)' }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-extrabold text-white truncate">{user?.name}</p>
          <p className="text-base text-[#4A4B50] mt-1 flex items-center gap-2">
            <Mail size={14} /> {user?.email}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold"
            style={{ background: kycConf.bg, color: kycConf.text, border: `1px solid ${kycConf.border}` }}>
            <KycIcon size={14} /> {kycConf.label}
          </div>
        </div>
      </div>

      {/* Edit name */}
      <FieldGroup label="Display Name">
        <div className="flex gap-3">
          <div className="flex-1 flex items-center bg-surface-card border border-surface-border
            rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group">
            <User size={17} className="text-[#4A4B50] mr-3 group-focus-within:text-gold transition-colors" />
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Your display name"
              className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#2a2d35]" />
          </div>
          <button onClick={handleSave}
            disabled={saving || !name.trim() || name.trim() === user?.name}
            className="px-7 py-3.5 bg-gold/90 hover:bg-gold text-surface-dark
              font-bold rounded-xl text-sm transition-all disabled:opacity-40
              flex items-center gap-2 flex-shrink-0">
            {saving
              ? <span className="w-4 h-4 border-2 border-surface-dark border-t-transparent rounded-full animate-spin" />
              : <><Edit2 size={15} /> Save Changes</>}
          </button>
        </div>
      </FieldGroup>

      {/* Email (read-only) */}
      <FieldGroup label="Email Address">
        <div className="flex items-center bg-surface-card border border-surface-border
          rounded-xl px-4 py-3.5 gap-3">
          <Mail size={17} className="text-[#4A4B50] flex-shrink-0" />
          <span className="flex-1 text-base text-[#8A8B90]">{user?.email}</span>
          <span className="text-xs text-[#2a2d35] bg-white/[.04] px-2.5 py-1 rounded-lg">
            Read-only
          </span>
        </div>
      </FieldGroup>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* KYC CTA */}
      {user?.kyc_status !== 'approved' && (
        <div className="rounded-2xl p-6"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Shield size={20} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-amber-300 mb-1">Identity Verification Required</p>
              <p className="text-sm text-[#8A8B90] mb-4">
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

function SecurityTab() {
  const [form,   setForm]   = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState({ cur: false, nw: false, cnf: false });
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  const showToast = (msg, ok) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 5000); };
  const onChange  = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const togglePw  = k => setShowPw(p => ({ ...p, [k]: !p[k] }));

  const handleChange = async () => {
    if (form.new_password !== form.confirm)   { showToast('New passwords do not match', false); return; }
    if (form.new_password.length < 8)         { showToast('Password must be at least 8 characters', false); return; }
    setSaving(true);
    try {
      const res  = await authFetch(`${API}/api/auth/password`, {
        method: 'PUT',
        body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to change password');
      showToast('Password changed successfully!', true);
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (e) {
      showToast(e.message, false);
    } finally { setSaving(false); }
  };

  const pwFields = [
    { key: 'current_password', label: 'Current Password',    placeholder: 'Enter your current password', showKey: 'cur' },
    { key: 'new_password',     label: 'New Password',        placeholder: 'Minimum 8 characters',        showKey: 'nw'  },
    { key: 'confirm',          label: 'Confirm New Password', placeholder: 'Re-enter new password',      showKey: 'cnf' },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        {pwFields.map(({ key, label, placeholder, showKey }) => (
          <FieldGroup key={key} label={label}>
            <div className="flex items-center bg-surface-card border border-surface-border
              rounded-xl px-4 py-3.5 focus-within:border-gold/50 transition-colors group">
              <Lock size={17} className="text-[#4A4B50] mr-3 group-focus-within:text-gold transition-colors" />
              <input
                type={showPw[showKey] ? 'text' : 'password'}
                value={form[key]} onChange={onChange(key)} placeholder={placeholder}
                className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#2a2d35]" />
              <button type="button" onClick={() => togglePw(showKey)}
                className="text-[#4A4B50] hover:text-white transition-colors ml-2">
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

      {/* Security tips */}
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
          <p key={tip} className="text-sm text-[#4A4B50] flex items-start gap-3">
            <span className="text-gold mt-0.5 flex-shrink-0">✓</span> {tip}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab,  setActiveTab]  = useState('profile');
  const [localUser,  setLocalUser]  = useState(user);

  const kycConf  = KYC_CONFIG[localUser?.kyc_status || 'unverified'];
  const KycIcon  = kycConf.icon;
  const initials = localUser?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  const TABS = [
    { id: 'profile',  label: 'Profile Info', icon: User },
    { id: 'security', label: 'Security',      icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* Hero banner */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(156,121,65,0.06) 0%, transparent 60%)' }}>
        <div className="absolute inset-0 opacity-[.025]"
          style={{ backgroundImage: 'linear-gradient(#9C7941 1px,transparent 1px),linear-gradient(90deg,#9C7941 1px,transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
          <div className="flex flex-wrap items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center
              text-xl sm:text-2xl font-extrabold text-gold-light select-none flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(156,121,65,0.3), rgba(235,211,141,0.1))', border: '2px solid rgba(156,121,65,0.35)' }}>
              {initials}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-white">{localUser?.name}</h1>
              <p className="text-[#4A4B50] mt-1 text-base">{localUser?.email}</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{ background: kycConf.bg, color: kycConf.text, border: `1px solid ${kycConf.border}` }}>
                <KycIcon size={13} /> {kycConf.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* Sidebar */}
          <div className="w-full lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-24">
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="p-2 space-y-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base
                      font-semibold transition-all text-left ${
                      activeTab === id
                        ? 'text-gold-light'
                        : 'text-[#4A4B50] hover:text-white'
                    }`}
                    style={activeTab === id
                      ? { background: 'rgba(156,121,65,0.12)', border: '1px solid rgba(156,121,65,0.25)' }
                      : {}}>
                    <Icon size={17} /> {label}
                  </button>
                ))}
                <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <Link to="/kyc"
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base
                    font-semibold text-[#4A4B50] hover:text-white transition-colors">
                  <Shield size={17} /> KYC Verification
                </Link>
              </div>
            </div>

            {/* Account info card */}
            <div className="mt-4 rounded-2xl p-5 space-y-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold text-[#4A4B50] uppercase tracking-wider">Account Details</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#4A4B50]">Account Type</span>
                  <span className="text-sm font-semibold text-white">Standard</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#4A4B50]">Trading Fee</span>
                  <span className="text-sm font-semibold text-green-400">0.1%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#4A4B50]">KYC Level</span>
                  <span className="text-sm font-semibold" style={{ color: kycConf.text }}>
                    {kycConf.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="flex-1 rounded-2xl p-8 min-w-0"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-xl font-extrabold text-white mb-6">
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
            {activeTab === 'profile'  && <ProfileTab  user={localUser} setUser={u => setLocalUser(u)} />}
            {activeTab === 'security' && <SecurityTab />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
