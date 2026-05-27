import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, Smartphone, Building2, Download, ExternalLink, AlertTriangle,
} from 'lucide-react';
import QrEnlargeable from '@/components/ui/QrEnlargeable';
import { useToast } from '@/context/ToastContext';
import { downloadUploadAsset, uploadUrl } from '@/services/inrApi';
import { methodSelectLabel, parseAmount } from './utils';
import CopyField from './CopyField';
import { INR_CARD, INR_CARD_GLOW, INR_TAB_ACTIVE, INR_TAB_IDLE } from './styles';

const TYPE_META = {
  qr: { tab: 'QR Code', icon: QrCode },
  upi: { tab: 'UPI', icon: Smartphone },
  bank: { tab: 'Bank Transfer', icon: Building2 },
};

const TYPE_ORDER = ['qr', 'upi', 'bank'];

function QrPanel({ method }) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const d = method.details || {};
  const src = uploadUrl(method.qr_image_url);
  const label = d.label?.trim() || '';

  const onDownloadQr = async () => {
    if (!method.qr_image_url || downloading) return;
    setDownloading(true);
    try {
      const base = label ? `bitzx-qr-${label}` : 'bitzx-qr';
      await downloadUploadAsset(method.qr_image_url, base);
      toast.success('Downloaded', 'QR image saved to your device');
    } catch (e) {
      toast.error('Download failed', e?.message || 'Could not save QR image');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      key="qr"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-5"
    >
      {src && (
        <div className="flex flex-col items-center">
          <QrEnlargeable
            src={src}
            alt={label || 'Payment QR'}
            size={300}
            modalSize={480}
            bare
            hint="Tap to enlarge"
            modalHint="Scan to pay"
          />
        </div>
      )}
      {label ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#070A12]/60 px-4">
          <CopyField label="Label" value={label} mono={false} />
        </div>
      ) : null}
      {src && (
        <button
          type="button"
          disabled={downloading}
          onClick={onDownloadQr}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.12] bg-white/[0.04] text-sm font-bold text-white hover:border-[#CDA45E]/30 transition-colors disabled:opacity-50"
        >
          <Download size={16} /> {downloading ? 'Downloading…' : 'Download QR'}
        </button>
      )}
    </motion.div>
  );
}

function UpiPanel({ method, amountInr }) {
  const d = method.details || {};
  const upiId = d.upi_id;
  const payee = d.display_name;

  const openUpi = () => {
    if (!upiId) return;
    const amt = parseAmount(amountInr);
    const amParam = Number.isFinite(amt) && amt > 0 ? `&am=${amt}` : '';
    window.location.href = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee || '')}${amParam}`;
  };

  return (
    <motion.div
      key="upi"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-5"
    >
      <div className="rounded-xl border border-white/[0.06] bg-[#070A12]/60 px-4">
        <CopyField label="UPI ID" value={upiId} />
        <CopyField label="Merchant name" value={payee} mono={false} />
      </div>
      <button
        type="button"
        onClick={openUpi}
        className="w-full py-3.5 rounded-xl font-bold text-[#070A12] bg-gradient-to-r from-[#CDA45E] to-[#E5B86C] flex items-center justify-center gap-2 hover:shadow-[0_4px_24px_rgba(205,164,94,0.35)] transition-shadow"
      >
        <ExternalLink size={18} /> Open UPI App
      </button>
    </motion.div>
  );
}

function BankPanel({ method }) {
  const d = method.details || {};
  const rows = [
    ['Account name', d.account_holder_name, false],
    ['Account number', d.account_number, true],
    ['IFSC', d.ifsc_code, true],
    ['Bank name', d.bank_name, false],
    ...(d.branch ? [['Branch', d.branch, false]] : []),
  ];

  return (
    <motion.div
      key="bank"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-4"
    >
      <div className="rounded-xl border border-white/[0.06] bg-[#070A12]/60 px-4">
        {rows.map(([label, value]) => (
          <CopyField key={label} label={label} value={value} copyable={!!value} />
        ))}
      </div>
      <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
        <AlertTriangle size={18} className="shrink-0 text-amber-400 mt-0.5" />
        <p>Transfer only from your own bank account. Third-party transfers may be rejected.</p>
      </div>
    </motion.div>
  );
}

export default function PaymentDetailsPanel({
  methods,
  activeType,
  onTypeChange,
  activeMethod,
  onMethodChange,
  amountInr,
  collapsed,
  onToggleCollapse,
  showMobileCollapse,
}) {
  const availableTypes = useMemo(
    () => TYPE_ORDER.filter((t) => methods.some((m) => m.type === t)),
    [methods],
  );

  const methodsOfType = useMemo(
    () => methods.filter((m) => m.type === activeType),
    [methods, activeType],
  );

  const header = (
    <div className="flex items-center justify-between gap-3 mb-5">
      <h2 className="text-lg sm:text-xl font-bold text-white">Payment details</h2>
      {showMobileCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="lg:hidden text-xs font-bold text-[#CDA45E] uppercase tracking-wider"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      )}
    </div>
  );

  const tabs = (
    <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
      {availableTypes.map((type) => {
        const Meta = TYPE_META[type];
        const Icon = Meta.icon;
        const isActive = activeType === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onTypeChange(type)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 rounded-[14px] border text-sm sm:text-base font-bold transition-all duration-200 ${
              isActive ? INR_TAB_ACTIVE : INR_TAB_IDLE
            }`}
          >
            <Icon size={20} className={isActive ? 'text-[#E5B86C]' : 'text-white/50'} />
            {Meta.tab}
          </button>
        );
      })}
    </div>
  );

  const subPicker = methodsOfType.length > 1 && (
    <div className="flex flex-wrap gap-2 mb-5">
      {methodsOfType.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onMethodChange(m.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
            activeMethod?.id === m.id
              ? 'border-[#CDA45E]/50 bg-[#CDA45E]/15 text-[#E5B86C]'
              : 'border-white/10 text-white/55 hover:border-[#CDA45E]/25'
          }`}
        >
          {methodSelectLabel(m, methods)}
        </button>
      ))}
    </div>
  );

  const body = activeMethod && (
    <AnimatePresence mode="wait">
      {activeMethod.type === 'qr' && (
        <QrPanel method={activeMethod} />
      )}
      {activeMethod.type === 'upi' && <UpiPanel method={activeMethod} amountInr={amountInr} />}
      {activeMethod.type === 'bank' && <BankPanel method={activeMethod} />}
    </AnimatePresence>
  );

  return (
    <div className={`${INR_CARD} ${INR_CARD_GLOW} p-6 sm:p-8 lg:p-9 h-full`}>
      {header}
      {tabs}
      <div className={showMobileCollapse && collapsed ? 'hidden lg:block' : ''}>
        {subPicker}
        {body}
      </div>
      {showMobileCollapse && collapsed && (
        <p className="lg:hidden text-sm text-white/45 mt-2">Tap Show to view payment instructions.</p>
      )}
    </div>
  );
}
