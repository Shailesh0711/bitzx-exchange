import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, CheckCircle, Clock, AlertCircle,
  ChevronRight, ChevronLeft, FileText, User,
  Globe, CreditCard, Upload, ImageIcon,
} from 'lucide-react';
import { useAuth, authFetch } from '@/context/AuthContext';
import { exchangeApiOrigin } from '@/lib/apiBase';
import SuggestionTextField from '@/components/kyc/SuggestionTextField';
import { suggestCountries, suggestCities } from '@/data/kycLocations';
import {
  validateKycPersonal,
  validateKycDocument,
  validateKycFile,
  firstErrorMessage,
  KYC_POSTAL_CATALOG_MAX,
  ENV_POSTAL_MAX_LEN,
  extractPydanticMaxStringLen,
  parseKycSubmit422FieldErrors,
  formatKycSubmit422Banner,
} from '@/lib/kycValidation';

const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

// ─── Why KYC info panel ───────────────────────────────────────────────────────
const KYC_BENEFITS = [
  { icon: Shield,      color: '#22c55e', title: 'Secure Trading',        desc: 'Fully unlock spot trading for all pairs' },
  { icon: CreditCard,  color: '#60a5fa', title: 'Deposits & Withdrawals', desc: 'Manual deposit and withdrawal access' },
  { icon: CheckCircle, color: '#EBD38D', title: 'Account Protection',    desc: 'Identity verified, funds stay safe' },
  { icon: Globe,       color: '#a78bfa', title: 'Regulatory Compliance', desc: 'Meet global exchange requirements' },
];

// ─── Status banner ────────────────────────────────────────────────────────────
function StatusBanner({ kyc }) {
  if (!kyc || kyc.status === 'unverified') return null;

  const config = {
    pending:  { icon: Clock,       color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',
                title: 'Application Under Review',
                msg: 'Your identity documents are being reviewed. This usually takes 1–2 business days.' },
    approved: { icon: CheckCircle, color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',
                title: 'Identity Verified',
                msg: 'Your identity has been verified. You have full trading and withdrawal access.' },
    rejected: { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',
                title: 'KYC Application Rejected',
                msg: kyc.rejection_reason || 'Your documents were rejected. Please resubmit with valid, clear documents.' },
  };

  const { icon: Icon, color, bg, border, title, msg } = config[kyc.status] || config.pending;

  return (
    <div className="rounded-2xl p-6 flex gap-5" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-extrabold mb-1.5" style={{ color }}>{title}</p>
        <p className="text-base text-white leading-relaxed">{msg}</p>
        <div className="flex flex-wrap gap-4 mt-3">
          {kyc.submitted_at && (
            <p className="text-sm text-white">
              Submitted: <span className="text-white">{new Date(kyc.submitted_at).toLocaleString()}</span>
            </p>
          )}
          {kyc.reviewed_at && (
            <p className="text-sm text-white">
              Reviewed: <span className="text-white">{new Date(kyc.reviewed_at).toLocaleString()}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Personal Info',     icon: User },
  { label: 'Document Details',  icon: FileText },
  { label: 'Review & Submit',   icon: CheckCircle },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center mb-8 overflow-x-auto scrollbar-hide">
      {STEPS.map(({ label, icon: Icon }, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none min-w-[60px]">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold
              transition-all ${i < current  ? 'bg-green-500 text-white'
                             : i === current ? 'text-surface-dark'
                                             : 'text-white'}`}
              style={i === current ? { background: 'linear-gradient(135deg, #9C7941, #EBD38D)' } : {}}>
              {i < current ? <CheckCircle size={16} /> : <Icon size={16} />}
            </div>
            <span className={`mt-1.5 text-[10px] sm:text-xs font-bold text-center ${
              i === current ? 'text-gold-light' : i < current ? 'text-green-400' : 'text-white'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-0.5 mx-2 sm:mx-4 mb-5 rounded-full transition-all"
              style={{ background: i < current ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.07)' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Form Input ───────────────────────────────────────────────────────────────
function FormInput({ label, required, error, ...props }) {
  const err = error?.trim();
  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        {...props}
        className={`w-full rounded-xl px-4 py-3.5 text-white text-base outline-none
          focus:border-gold/50 transition-colors placeholder:text-white/45 ${err ? 'border-red-500/50' : ''}`}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: err ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.09)',
        }}
      />
      {err && <p className="text-xs text-red-400 mt-1.5 font-semibold">{err}</p>}
    </div>
  );
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────
function Step1({ data, onChange, onBlurField, showField, postalMaxLen = KYC_POSTAL_CATALOG_MAX }) {
  const ctrySuggest = useMemo(() => suggestCountries(data.country || ''), [data.country]);
  const citySuggest = useMemo(
    () => suggestCities(data.country || '', data.city || ''),
    [data.country, data.city],
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="sm:col-span-2">
        <FormInput label="Full Legal Name" required error={showField('full_name')} value={data.full_name || ''} placeholder="Exactly as it appears on your ID"
          onChange={e => onChange('full_name', e.target.value)} onBlur={() => onBlurField('full_name')} />
      </div>
      <FormInput label="Date of Birth" required error={showField('date_of_birth')} type="date" value={data.date_of_birth || ''}
        onChange={e => onChange('date_of_birth', e.target.value)} onBlur={() => onBlurField('date_of_birth')} />
      <FormInput label="Nationality" required error={showField('nationality')} value={data.nationality || ''} placeholder="e.g. Indian, British, American"
        onChange={e => onChange('nationality', e.target.value)} onBlur={() => onBlurField('nationality')} />
      <div className="sm:col-span-2">
        <FormInput label="Street Address" required error={showField('address')} value={data.address || ''} placeholder="House / flat, street, area, landmark"
          onChange={e => onChange('address', e.target.value)} onBlur={() => onBlurField('address')} />
      </div>
      <SuggestionTextField
        label="Country"
        required
        error={showField('country')}
        value={data.country || ''}
        placeholder="Start typing your country"
        suggestions={ctrySuggest}
        onChange={(v) => onChange('country', v)}
        onBlur={() => onBlurField('country')}
      />
      <SuggestionTextField
        label="City"
        required
        error={showField('city')}
        value={data.city || ''}
        placeholder="Start typing your city"
        suggestions={citySuggest}
        onChange={(v) => onChange('city', v)}
        onBlur={() => onBlurField('city')}
      />
      <div className="sm:col-span-2">
        <FormInput
          label="Postal / ZIP Code"
          required
          error={showField('postal_code')}
          value={data.postal_code || ''}
          placeholder="e.g. 10001, SW1A 1AA, 560001"
          maxLength={postalMaxLen}
          inputMode="text"
          autoComplete="postal-code"
          onBlur={() => onBlurField('postal_code')}
          onChange={(e) => {
            const v = e.target.value.replace(/[^A-Za-z0-9\s-]/g, '');
            onChange('postal_code', v.slice(0, postalMaxLen));
          }}
        />
        <p className="text-[10px] text-white/45 mt-1.5">
          Letters, numbers, spaces, and hyphens only — max {postalMaxLen} characters.
        </p>
      </div>
    </div>
  );
}

// ─── Step 2: Document Info ────────────────────────────────────────────────────
const DOC_TYPES = [
  { value: 'passport',        label: 'Passport',        emoji: '🛂', desc: 'International travel document' },
  { value: 'national_id',     label: 'National ID',     emoji: '🪪', desc: 'Government-issued identity card' },
  { value: 'driving_license', label: 'Driving License', emoji: '🚗', desc: 'Valid driving license with photo' },
];

function isImagePath(url) {
  if (!url) return false;
  return /\.(jpe?g|png|webp)$/i.test(url);
}

function Step2({
  data,
  onChange,
  docFrontUrl,
  docBackUrl,
  idFrontFile,
  idBackFile,
  onPickFront,
  onPickBack,
  uploading,
  errors = {},
  touched = {},
  revealErrors,
  serverErrors = {},
  onBlurField,
}) {
  const show = (k) => {
    const msg = errors[k];
    if (!msg) return '';
    if (revealErrors || touched[k] || serverErrors[k]) return msg;
    return '';
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          Document Type <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {DOC_TYPES.map(({ value, label, emoji, desc }) => (
            <button key={value} type="button" onClick={() => onChange('document_type', value)}
              className="py-4 px-4 rounded-2xl text-left transition-all"
              style={data.document_type === value
                ? { background: 'rgba(156,121,65,0.12)', border: '1px solid rgba(156,121,65,0.4)' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-2xl mb-2">{emoji}</div>
              <p className={`text-sm font-bold ${data.document_type === value ? 'text-gold-light' : 'text-white'}`}>{label}</p>
              <p className="text-xs text-white mt-1">{desc}</p>
            </button>
          ))}
        </div>
        {show('document_type') ? (
          <p className="text-xs text-red-400 mt-2 font-semibold">{show('document_type')}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormInput label="Document Number" required error={show('document_number')} value={data.document_number || ''}
          placeholder="As printed on the document"
          onChange={e => onChange('document_number', e.target.value)}
          onBlur={() => onBlurField('document_number')}
        />
        <FormInput label="Expiry Date" required error={show('document_expiry')} type="date" value={data.document_expiry || ''}
          onChange={e => onChange('document_expiry', e.target.value)}
          onBlur={() => onBlurField('document_expiry')}
        />
      </div>

      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}>
        <div className="flex items-center gap-2 text-white font-bold">
          <Upload size={18} className="text-blue-400" />
          Document photos
        </div>
        <p className="text-sm text-white/80 leading-relaxed">
          Upload a <strong className="text-white">clear, color photo</strong> of your ID (JPEG, PNG, WebP, or PDF). Max 15MB per file.
          Front is required; back is optional unless your ID has two sides.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-white/70 mb-2">ID — front <span className="text-red-400">*</span></label>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/20 px-4 py-6 cursor-pointer hover:border-gold/40 transition-colors">
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                onChange={(e) => { onPickFront(e.target.files?.[0] || null); e.target.value = ''; }} />
              <ImageIcon size={22} className="text-white/50" />
              <span className="text-xs text-white/70 text-center">{idFrontFile ? idFrontFile.name : 'Choose file'}</span>
            </label>
            {(docFrontUrl && !idFrontFile && isImagePath(docFrontUrl)) && (
              <img src={`${API}${docFrontUrl}`} alt="ID front" className="mt-2 rounded-lg max-h-40 object-contain border border-white/10" />
            )}
            {docFrontUrl && !idFrontFile && !isImagePath(docFrontUrl) && (
              <a href={`${API}${docFrontUrl}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 mt-2 inline-block">View uploaded PDF</a>
            )}
            {show('document_front') ? (
              <p className="text-xs text-red-400 mt-1.5 font-semibold">{show('document_front')}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs font-bold text-white/70 mb-2">ID — back (optional)</label>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/20 px-4 py-6 cursor-pointer hover:border-gold/40 transition-colors">
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                onChange={(e) => { onPickBack(e.target.files?.[0] || null); e.target.value = ''; }} />
              <ImageIcon size={22} className="text-white/50" />
              <span className="text-xs text-white/70 text-center">{idBackFile ? idBackFile.name : 'Choose file'}</span>
            </label>
            {(docBackUrl && !idBackFile && isImagePath(docBackUrl)) && (
              <img src={`${API}${docBackUrl}`} alt="ID back" className="mt-2 rounded-lg max-h-40 object-contain border border-white/10" />
            )}
            {docBackUrl && !idBackFile && !isImagePath(docBackUrl) && (
              <a href={`${API}${docBackUrl}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 mt-2 inline-block">View uploaded PDF</a>
            )}
            {show('document_back') ? (
              <p className="text-xs text-red-400 mt-1.5 font-semibold">{show('document_back')}</p>
            ) : null}
          </div>
        </div>
        {uploading && (
          <p className="text-xs text-amber-300 flex items-center gap-2">
            <span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin inline-block" />
            Uploading…
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Review ───────────────────────────────────────────────────────────
function Step3({ personal, document: doc, docFrontUrl, docBackUrl }) {
  const Row = ({ label, value }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <span className="text-sm text-white">{label}</span>
      <span className="text-sm text-white font-semibold text-right max-w-[60%] truncate">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <User size={13} /> Personal Information
        </p>
        <Row label="Full Name"      value={personal.full_name} />
        <Row label="Date of Birth"  value={personal.date_of_birth} />
        <Row label="Nationality"    value={personal.nationality} />
        <Row label="Address"        value={personal.address} />
        <Row label="City"           value={personal.city} />
        <Row label="Country"        value={personal.country} />
        <Row label="Postal Code"    value={personal.postal_code} />
      </div>

      <div className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={13} /> Document Information
        </p>
        <Row label="Document Type"
          value={DOC_TYPES.find(d => d.value === doc.document_type)?.label || doc.document_type} />
        <Row label="Document Number" value={doc.document_number} />
        <Row label="Expiry Date"     value={doc.document_expiry} />
        <Row label="Front upload" value={docFrontUrl ? 'Attached' : '—'} />
        <Row label="Back upload" value={docBackUrl ? 'Attached' : '—'} />
      </div>

      {(docFrontUrl && isImagePath(docFrontUrl)) && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-bold text-white/60 mb-2">ID preview (front)</p>
          <img src={`${API}${docFrontUrl}`} alt="" className="max-h-48 rounded-lg border border-white/10 object-contain" />
        </div>
      )}

      <div className="rounded-2xl p-5"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <p className="text-sm text-white leading-relaxed">
          <span className="text-amber-400 font-bold">Declaration: </span>
          By submitting, you confirm that all information is accurate and the documents belong to you.
          False submissions may result in permanent account suspension.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KYCPage() {
  const { user } = useAuth();
  const [kyc,        setKyc]        = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [step,       setStep]       = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');

  const [personal, setPersonal] = useState({
    full_name: user?.name || '', date_of_birth: '', nationality: '',
    address: '', city: '', country: '', postal_code: '',
  });
  const [docInfo, setDocInfo] = useState({
    document_type: '', document_number: '', document_expiry: '',
  });
  const [docFrontUrl, setDocFrontUrl] = useState('');
  const [docBackUrl, setDocBackUrl] = useState('');
  const [idFrontFile, setIdFrontFile] = useState(null);
  const [idBackFile, setIdBackFile] = useState(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [revealPersonalErrors, setRevealPersonalErrors] = useState(false);
  const [revealDocumentErrors, setRevealDocumentErrors] = useState(false);
  const [touchedPersonal, setTouchedPersonal] = useState({});
  const [touchedDoc, setTouchedDoc] = useState({});
  const [serverPersonalErrors, setServerPersonalErrors] = useState({});
  const [serverDocumentErrors, setServerDocumentErrors] = useState({});
  /** When API returns a stricter postal max (e.g. 10), remember it for live validation without another failed submit. */
  const [postalMaxLearned, setPostalMaxLearned] = useState(null);

  useEffect(() => {
    authFetch(`${API}/api/kyc/status`)
      .then(r => r.json())
      .then((data) => {
        setKyc(data);
        if (data.personal_info && typeof data.personal_info === 'object') {
          setPersonal((p) => ({ ...p, ...data.personal_info }));
        }
        if (data.document_info && typeof data.document_info === 'object') {
          setDocInfo((d) => ({ ...d, ...data.document_info }));
        }
        if (data.document_front_url) setDocFrontUrl(data.document_front_url);
        if (data.document_back_url) setDocBackUrl(data.document_back_url);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePersonal = (k, v) => {
    setServerPersonalErrors({});
    setPersonal(p => ({ ...p, [k]: v }));
  };
  const updateDoc = (k, v) => {
    setServerDocumentErrors({});
    setDocInfo(d => ({ ...d, [k]: v }));
  };
  const blurPersonalField = (k) => setTouchedPersonal((t) => ({ ...t, [k]: true }));
  const blurDocField = (k) => setTouchedDoc((t) => ({ ...t, [k]: true }));

  const handlePickFront = (f) => {
    setServerDocumentErrors({});
    setIdFrontFile(f);
    setTouchedDoc(t => ({ ...t, document_front: true }));
  };
  const handlePickBack = (f) => {
    setServerDocumentErrors({});
    setIdBackFile(f);
    setTouchedDoc(t => ({ ...t, document_back: true }));
  };

  const hasIdFront = !!(idFrontFile || docFrontUrl);

  const effectivePostalMaxLen = useMemo(() => {
    const fromLearned =
      postalMaxLearned != null && Number.isFinite(postalMaxLearned)
        ? postalMaxLearned
        : null;
    const fromEnv = ENV_POSTAL_MAX_LEN;
    const raw = fromLearned ?? fromEnv ?? KYC_POSTAL_CATALOG_MAX;
    return Math.min(
      KYC_POSTAL_CATALOG_MAX,
      Math.max(2, raw),
    );
  }, [postalMaxLearned]);

  useEffect(() => {
    setPersonal((p) => {
      const z = String(p.postal_code || '').replace(/[^A-Za-z0-9\s-]/g, '');
      if (z.length <= effectivePostalMaxLen) return p;
      return { ...p, postal_code: z.slice(0, effectivePostalMaxLen) };
    });
  }, [effectivePostalMaxLen]);

  const clientPersonalErrors = useMemo(
    () => validateKycPersonal(personal, { postalMaxLen: effectivePostalMaxLen }),
    [personal, effectivePostalMaxLen],
  );
  const personalErrors = useMemo(
    () => ({ ...serverPersonalErrors, ...clientPersonalErrors }),
    [serverPersonalErrors, clientPersonalErrors],
  );
  const clientDocumentErrors = useMemo(() => {
    const base = validateKycDocument(docInfo, { hasFrontUpload: hasIdFront });
    if (idFrontFile) {
      const fe = validateKycFile(idFrontFile);
      if (fe) base.document_front = fe;
    }
    if (idBackFile) {
      const be = validateKycFile(idBackFile);
      if (be) base.document_back = be;
    }
    return base;
  }, [docInfo, hasIdFront, idFrontFile, idBackFile]);
  const documentErrors = useMemo(
    () => ({ ...serverDocumentErrors, ...clientDocumentErrors }),
    [serverDocumentErrors, clientDocumentErrors],
  );

  const step1Valid =
    Object.keys(clientPersonalErrors).length === 0 && Object.keys(serverPersonalErrors).length === 0;
  const step2Valid =
    Object.keys(clientDocumentErrors).length === 0 && Object.keys(serverDocumentErrors).length === 0;

  const showPersonalField = useCallback(
    (k) => {
      const msg = personalErrors[k];
      if (!msg) return '';
      if (serverPersonalErrors[k] || revealPersonalErrors || touchedPersonal[k]) return msg;
      return '';
    },
    [personalErrors, revealPersonalErrors, touchedPersonal, serverPersonalErrors],
  );

  const parseError = (data) => {
    const d = data?.detail;
    if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join('; ');
    return d || 'Request failed';
  };

  const uploadIdFiles = async () => {
    if (!idFrontFile && !idBackFile) return null;
    if (!idFrontFile && !docFrontUrl) {
      throw new Error('Upload the front of your ID first.');
    }
    const fd = new FormData();
    if (idFrontFile) fd.append('document_front', idFrontFile);
    if (idBackFile) fd.append('document_back', idBackFile);
    if (!fd.has('document_front') && !fd.has('document_back')) return null;
    setUploadingDocs(true);
    try {
      const res = await authFetch(`${API}/api/kyc/upload`, { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(parseError(j));
      if (j.document_front_url) setDocFrontUrl(j.document_front_url);
      if (j.document_back_url) setDocBackUrl(j.document_back_url);
      setIdFrontFile(null);
      setIdBackFile(null);
      return j;
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleNext = async () => {
    setError('');
    if (step === 0) {
      setRevealPersonalErrors(true);
      if (!step1Valid) {
        setError(firstErrorMessage(clientPersonalErrors) || 'Please complete all required fields.');
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      setRevealDocumentErrors(true);
      if (!step2Valid) {
        setError(firstErrorMessage(clientDocumentErrors) || 'Please complete document details and uploads.');
        return;
      }
    }
    let uploadJson = null;
    if (step === 1 && (idFrontFile || idBackFile)) {
      try {
        uploadJson = await uploadIdFiles();
      } catch (e) {
        setError(e.message || 'Upload failed');
        return;
      }
    }
    const frontAfterUpload = uploadJson?.document_front_url || docFrontUrl;
    if (step === 1 && !frontAfterUpload && !idFrontFile) {
      setError('Upload the front of your ID before continuing.');
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    setServerPersonalErrors({});
    setServerDocumentErrors({});
    try {
      const pe = validateKycPersonal(personal);
      const de = validateKycDocument(docInfo, { hasFrontUpload: !!(idFrontFile || docFrontUrl) });
      if (idFrontFile) {
        const fe = validateKycFile(idFrontFile);
        if (fe) de.document_front = fe;
      }
      if (idBackFile) {
        const be = validateKycFile(idBackFile);
        if (be) de.document_back = be;
      }
      if (Object.keys(pe).length || Object.keys(de).length) {
        setRevealPersonalErrors(true);
        setRevealDocumentErrors(true);
        throw new Error(firstErrorMessage({ ...pe, ...de }) || 'Please fix validation errors.');
      }
      if (!docFrontUrl) {
        throw new Error('Missing document upload. Go back to the document step and upload your ID.');
      }
      const res  = await authFetch(`${API}/api/kyc/submit`, {
        method: 'POST',
        body: JSON.stringify({
          personal_info: personal,
          document_info: docInfo,
          document_front_url: docFrontUrl,
          document_back_url: docBackUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && Array.isArray(data?.detail)) {
          for (const item of data.detail) {
            const loc = item?.loc;
            if (!Array.isArray(loc)) continue;
            const pi = loc.indexOf('personal_info');
            if (pi >= 0 && loc[pi + 1] === 'postal_code' && item.msg != null) {
              const cap = extractPydanticMaxStringLen(item.msg);
              if (cap != null) setPostalMaxLearned(cap);
              break;
            }
          }
          const { personal: pfe, document: dfe } = parseKycSubmit422FieldErrors(data.detail);
          setServerPersonalErrors(pfe);
          setServerDocumentErrors(dfe);
          setRevealPersonalErrors(true);
          setRevealDocumentErrors(true);
          if (Object.keys(pfe).length) setStep(0);
          else if (Object.keys(dfe).length) setStep(1);
          throw new Error(formatKycSubmit422Banner(data.detail) || parseError(data));
        }
        throw new Error(parseError(data));
      }
      setSubmitted(true);
      setPostalMaxLearned(null);
      setKyc({ status: 'pending', submitted_at: new Date().toISOString() });
    } catch (e) {
      setError(e.message);
    } finally { setSubmitting(false); }
  };

  const showForm = !submitted && (kyc?.status === 'rejected' || !kyc || kyc.status === 'unverified');

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-dark flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark flex flex-col xl:flex-row">

      {/* ══ LEFT — Info panel ═════════════════════════════════════════════════ */}
      <div className="hidden xl:flex flex-col w-[400px] flex-shrink-0
        relative overflow-hidden px-12 py-12"
        style={{ background: 'rgba(10,11,15,0.98)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(156,121,65,0.12) 0%, transparent 55%)' }} />
        <div className="absolute inset-0 opacity-[.02] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#9C7941 1px,transparent 1px),linear-gradient(90deg,#9C7941 1px,transparent 1px)', backgroundSize: '44px 44px' }} />

        {/* Icon */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(156,121,65,0.15)', border: '1px solid rgba(156,121,65,0.35)' }}>
            <Shield size={30} className="text-gold" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }} className="relative z-10 mb-10">
          <h2 className="text-4xl font-extrabold text-white leading-[1.15] mb-4">
            Identity<br />
            <span className="text-gradient">Verification</span>
          </h2>
          <p className="text-white text-base leading-relaxed">
            Complete KYC to unlock your full exchange access. This one-time process takes less than 5 minutes.
          </p>
        </motion.div>

        {/* Benefits */}
        <div className="relative z-10 space-y-4 flex-1">
          {KYC_BENEFITS.map(({ icon: Icon, color, title, desc }, i) => (
            <motion.div key={title}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.07 }}
              className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-xs text-white">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Step progress */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="relative z-10 mt-8 rounded-2xl p-5 space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Verification Process</p>
          {STEPS.map(({ label, icon: Icon }, i) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                i < step ? 'bg-green-500 text-white' : i === step ? 'text-surface-dark' : 'text-white'}`}
                style={i === step ? { background: 'linear-gradient(135deg, #9C7941, #EBD38D)' }
                  : i < step ? {} : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-sm font-semibold ${
                i === step ? 'text-gold-light' : i < step ? 'text-green-400' : 'text-white'}`}>
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ══ RIGHT — Content area ══════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-10">
        <div className="w-full max-w-6xl mx-auto">

          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white mb-2">KYC Verification</h1>
            <p className="text-white text-base">
              Verify your identity to unlock full trading and withdrawal access.
            </p>
          </div>

          {/* Status banner */}
          {kyc && kyc.status !== 'unverified' && (
            <div className="mb-8"><StatusBanner kyc={kyc} /></div>
          )}

          {/* Success screen */}
          {submitted && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-10 text-center space-y-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Clock size={36} className="text-amber-400" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">KYC Submitted Successfully!</h2>
              <p className="text-white text-base leading-relaxed max-w-md mx-auto">
                Your identity documents are under review. We'll notify you via email once your
                identity is verified — usually within 1–2 business days.
              </p>
              <div className="flex items-center justify-center gap-2 text-amber-400 font-semibold text-sm">
                <Clock size={15} /> Application ID: {Date.now().toString(36).toUpperCase()}
              </div>
            </motion.div>
          )}

          {/* KYC Form */}
          {showForm && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-8"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <StepIndicator current={step} />

              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}>
                {step === 0 && (
                  <Step1
                    data={personal}
                    onChange={updatePersonal}
                    onBlurField={blurPersonalField}
                    showField={showPersonalField}
                    postalMaxLen={effectivePostalMaxLen}
                  />
                )}
                {step === 1 && (
                  <Step2
                    data={docInfo}
                    onChange={updateDoc}
                    docFrontUrl={docFrontUrl}
                    docBackUrl={docBackUrl}
                    idFrontFile={idFrontFile}
                    idBackFile={idBackFile}
                    onPickFront={handlePickFront}
                    onPickBack={handlePickBack}
                    uploading={uploadingDocs}
                    errors={documentErrors}
                    touched={touchedDoc}
                    revealErrors={revealDocumentErrors}
                    serverErrors={serverDocumentErrors}
                    onBlurField={blurDocField}
                  />
                )}
                {step === 2 && (
                  <Step3 personal={personal} document={docInfo} docFrontUrl={docFrontUrl} docBackUrl={docBackUrl} />
                )}
              </motion.div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-5 rounded-xl px-4 py-3.5 text-sm text-red-400 flex items-center gap-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={16} /> {error}
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button onClick={() => { setError(''); setStep(s => s - 1); }} disabled={step === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-white
                    hover:text-white transition-colors text-base font-semibold disabled:opacity-0"
                  style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                  <ChevronLeft size={17} /> Back
                </button>

                {step < 2 ? (
                  <button
                    type="button"
                    onClick={() => handleNext()}
                    disabled={uploadingDocs}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl
                      text-surface-dark font-bold text-base transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #9C7941, #EBD38D)' }}>
                    Continue <ChevronRight size={17} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !step1Valid || !step2Valid}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl
                      bg-green-500 hover:bg-green-400 text-white font-bold text-base
                      transition-all disabled:opacity-40"
                  >
                    {submitting
                      ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><CheckCircle size={17} /> {kyc?.status === 'rejected' ? 'Resubmit KYC' : 'Submit KYC'}</>}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Pending — no form */}
          {!submitted && kyc?.status === 'pending' && (
            <div className="rounded-2xl p-8 text-center space-y-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Clock size={28} className="text-amber-400" />
              </div>
              <p className="text-lg font-bold text-white">Your application is under review</p>
              <p className="text-white text-base max-w-md mx-auto">
                We are processing your documents. You will receive an email notification once the
                review is complete (1–2 business days).
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
