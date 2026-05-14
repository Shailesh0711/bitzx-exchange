/**
 * Premium P2P Modal — glass-dark panel with blue-tinted depth.
 * Body scroll is locked while open.
 */
import { useEffect } from 'react';
import { X } from 'lucide-react';

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' };

export default function P2PModal({ title, onClose, children, size = 'md' }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto"
      style={{ background: 'rgba(2,4,8,0.86)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          className={`relative w-full ${SIZES[size] ?? SIZES.md} flex flex-col rounded-2xl`}
          style={{
            background: 'linear-gradient(160deg,#12141a 0%,#0d0f14 60%,#0a0b0d 100%)',
            border: '1px solid rgba(156,121,65,0.18)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(156,121,65,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top blue shimmer strip */}
          <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
            style={{ background: 'linear-gradient(90deg,transparent,rgba(156,121,65,0.5) 50%,transparent)' }} />

          {/* Header */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 rounded-t-2xl"
            style={{ background: 'rgba(13,22,36,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(156,121,65,0.1)' }}
          >
            <h3 className="font-bold text-white text-[15px] tracking-tight">{title}</h3>
            <button type="button" onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <X size={14} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto max-h-[70vh] overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

P2PModal.Footer = function ModalFooter({ children }) {
  return (
    <div
      className="sticky bottom-0 z-10 flex justify-end gap-2.5 px-6 py-4 rounded-b-2xl"
      style={{ background: 'rgba(8,14,26,0.98)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(156,121,65,0.1)' }}
    >
      {children}
    </div>
  );
};

P2PModal.Body = function ModalBody({ children }) {
  return <div className="px-6 py-5 space-y-4">{children}</div>;
};

/* Reusable input/select/textarea styling strings for use inside modals */
export const modalInput =
  'w-full rounded-xl px-3.5 py-2.5 text-white text-sm placeholder:text-white/25 ' +
  'focus:outline-none transition-all duration-200 ' +
  'bg-[#0a0b0d] border border-[#1e2028] focus:border-[#9C7941]/60 focus:ring-2 focus:ring-[#9C7941]/10';

export const modalSelect =
  'w-full rounded-xl px-3.5 py-2.5 text-white text-sm ' +
  'focus:outline-none transition-all duration-200 ' +
  'bg-[#0a0b0d] border border-[#1e2028] focus:border-[#9C7941]/60 focus:ring-2 focus:ring-[#9C7941]/10';

export const modalLabel =
  'block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5';
