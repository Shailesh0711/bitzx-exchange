import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Download, Smartphone, Sparkles, ChevronRight } from 'lucide-react';
import { useLandingPromo, promoAssetUrl, dismissPromo } from '@/hooks/useLandingPromo';
import { mobileAppDownloadHref } from '@/hooks/useMobileAppRelease';

const LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';

function PromoBrand({ label = 'BITZX', centered = true }) {
  return (
    <div className={`flex items-center gap-2 ${centered ? 'justify-center' : ''}`}>
      <div className="relative shrink-0">
        <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-md scale-150" />
        <img src={LOGO} alt="" className="relative w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-lg" />
      </div>
      <span className="text-white font-extrabold tracking-[0.18em] text-xs sm:text-base">{label}</span>
    </div>
  );
}

function CoinVisual({ imageUrl, brandLabel, compact }) {
  const img = promoAssetUrl(imageUrl);
  const visualMin = compact ? 'min-h-[120px] max-h-[150px]' : 'min-h-[140px] max-h-[180px] sm:min-h-[200px] sm:max-h-[240px]';

  if (img) {
    return (
      <div className={`relative flex items-end justify-center w-full ${visualMin} pb-1`}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 65% 55% at 55% 75%, rgba(251,191,36,0.22), transparent 68%)' }}
        />
        <motion.img
          src={img}
          alt=""
          className="relative z-[1] max-h-full w-auto max-w-full object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.6)]"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-end w-full ${visualMin} pb-0 overflow-hidden`}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 80%, rgba(251,191,36,0.2), transparent 65%)' }}
      />
      <div className="promo-rocket hidden sm:block" aria-hidden>
        <div
          className="w-full h-[72%] rounded-t-full rounded-b-sm mx-auto"
          style={{ background: 'linear-gradient(180deg, #fde68a 0%, #d97706 55%, #92400e 100%)', boxShadow: '0 8px 24px rgba(251,191,36,0.35)' }}
        />
        <div className="flex justify-center gap-1 mt-1">
          <span className="w-2 h-3 rounded-sm bg-amber-700/80 rotate-[-18deg]" />
          <span className="w-2 h-3 rounded-sm bg-amber-700/80 rotate-[18deg]" />
        </div>
      </div>
      <div className="relative z-[2] flex flex-col items-center scale-90 sm:scale-100">
        <div className="promo-coin-disc flex items-center justify-center">
          <img src={LOGO} alt="" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
        </div>
        <span className="mt-1.5 text-[8px] sm:text-[9px] font-bold tracking-[0.3em] text-amber-200/70 uppercase">{brandLabel}</span>
        <div className="promo-coin-pedestal" />
        <div className="promo-coin-ring" />
      </div>
    </div>
  );
}

function AppVisual({ imageUrl, compact }) {
  const img = promoAssetUrl(imageUrl);
  const visualMin = compact ? 'min-h-[110px] max-h-[140px]' : 'min-h-[120px] max-h-[160px] sm:min-h-[180px] sm:max-h-[220px]';

  if (img) {
    return (
      <div className={`relative flex items-center justify-center w-full ${visualMin} px-3 shrink-0`}>
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 85% 70% at 50% 100%, rgba(59,130,246,0.18), transparent 70%)' }}
        />
        <motion.img
          src={img}
          alt=""
          className="relative z-[1] max-h-full w-auto max-w-full object-contain"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center w-full ${visualMin} px-3 shrink-0`}>
      <div className="promo-app-glow-floor" />
      <div className="relative z-[2] flex gap-2 sm:gap-3 items-end mb-2 scale-90 sm:scale-100">
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="promo-phone overflow-hidden shrink-0"
            style={{ transform: i === 0 ? 'rotate(-10deg) translateY(4px)' : 'rotate(10deg)' }}
            animate={{ y: i === 0 ? [4, -2, 4] : [0, -6, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
          >
            <div className="h-4 sm:h-5 bg-black/50 flex items-center justify-center">
              <span className="w-6 sm:w-8 h-1 rounded-full bg-white/20" />
            </div>
            <div className="p-1 sm:p-1.5 space-y-0.5 sm:space-y-1">
              <div className="h-10 sm:h-14 rounded-md bg-gradient-to-br from-emerald-500/20 to-emerald-900/30 border border-emerald-500/25" />
              <div className="h-1 rounded bg-white/10" />
              <div className="h-1 rounded bg-white/10 w-4/5" />
            </div>
          </motion.div>
        ))}
      </div>
      <div className="promo-app-pedestal relative z-[2]" />
    </div>
  );
}

function CoinSlide({ data, onClose }) {
  const ctaInternal = data.cta_url?.startsWith('/');

  return (
    <div className="flex flex-col">
      <div className="flex flex-col sm:grid sm:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-[2] flex flex-col px-4 sm:pl-7 sm:pr-4 pt-12 sm:pt-12 pb-2 sm:pb-4 text-left">
          <div className="mb-3 sm:mb-5">
            <PromoBrand label={data.brand_label || 'BZX'} centered={false} />
          </div>
          <h2 className="promo-title-shimmer text-xl sm:text-[1.85rem] font-extrabold leading-[1.08] tracking-tight mb-2 sm:mb-3 uppercase break-words">
            {data.title}
          </h2>
          <p className="promo-tagline-gold text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.1em] leading-snug mb-1.5 sm:mb-2">
            {data.tagline_1}
          </p>
          <p className="promo-tagline-gold text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.06em] leading-snug mb-3 sm:mb-4 opacity-95">
            {data.tagline_2}
          </p>
          <p className="text-white font-semibold text-sm mb-0.5">{data.status_line}</p>
          <p className="text-amber-300/95 font-bold text-xs sm:text-sm mb-4 leading-snug">{data.event_line}</p>
          {data.cta_url && data.cta_label ? (
            ctaInternal ? (
              <Link
                to={data.cta_url}
                onClick={onClose}
                className="group inline-flex w-full sm:w-fit items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600/90 to-amber-500/90 px-4 py-2.5 text-sm font-bold text-[#1a1208] shadow-lg shadow-amber-500/25 hover:from-amber-500 hover:to-amber-400 transition-all"
              >
                {data.cta_label}
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <a
                href={data.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-full sm:w-fit items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600/90 to-amber-500/90 px-4 py-2.5 text-sm font-bold text-[#1a1208] shadow-lg shadow-amber-500/25 transition-all"
              >
                {data.cta_label}
                <ChevronRight size={16} />
              </a>
            )
          ) : null}
        </div>
        <div className="relative flex items-end justify-center sm:justify-end sm:pr-2 px-2 pb-3 sm:pb-4 shrink-0">
          <CoinVisual imageUrl={data.image_url} brandLabel={data.brand_label || 'BZX'} compact />
        </div>
      </div>
    </div>
  );
}

function AppSlide({ data, apk }) {
  const downloadHref = mobileAppDownloadHref(apk);
  const available = apk?.available === true && downloadHref;
  const features = (data.features || 'Fast | Secure | Real-Time').split('|').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="flex flex-col">
      <div className="px-4 sm:px-8 pt-12 sm:pt-11 pb-2 sm:pb-3 text-center">
        <div className="mb-3 sm:mb-4">
          <PromoBrand label="BITZX" />
        </div>
        <h2 className="text-base sm:text-xl font-bold text-white mb-2 leading-snug tracking-tight px-1">
          {data.headline}
        </h2>
        <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed max-w-[340px] mx-auto mb-2 sm:mb-3">
          {data.description}
        </p>
        <p className="text-sm sm:text-lg font-bold text-white mb-1.5 sm:mb-2">{data.subheadline}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm font-bold">
          {features.map((f, i) => (
            <span key={f} className="inline-flex items-center gap-2">
              {i > 0 ? <span className="text-amber-500/60 font-normal">|</span> : null}
              <span className="promo-tagline-gold">{f}</span>
            </span>
          ))}
        </div>
      </div>

      <AppVisual imageUrl={data.image_url} compact />

      <div className="promo-download-bar px-4 sm:px-6 py-3 sm:py-4 text-center shrink-0">
        {available ? (
          <a
            href={downloadHref}
            download={`bitzx-${apk.version}.apk`}
            className="group flex flex-col sm:inline-flex sm:flex-row sm:items-center justify-center gap-1 sm:gap-3 w-full sm:w-auto mx-auto rounded-xl border border-white/10 bg-white/[0.06] active:bg-white/[0.1] px-4 py-3 sm:py-3.5 transition-all"
          >
            <span className="inline-flex items-center justify-center gap-2 text-white font-semibold text-sm sm:text-base">
              <Download size={17} className="text-emerald-400 shrink-0" />
              <span className="underline underline-offset-4 decoration-emerald-400/50">
                {data.cta_label || 'Click here to download'}
              </span>
            </span>
            {apk.version ? (
              <span className="text-[11px] sm:text-xs text-zinc-500 font-medium">Android APK · v{apk.version}</span>
            ) : null}
          </a>
        ) : (
          <p className="inline-flex items-center justify-center gap-2 text-zinc-400 text-sm">
            <Smartphone size={16} className="text-zinc-500 shrink-0" />
            <Sparkles size={13} className="text-amber-400/80 shrink-0" />
            Android app coming soon
          </p>
        )}
      </div>
    </div>
  );
}

export default function LandingPromoModal() {
  const { promo, loaded, slides, shouldShow } = useLandingPromo();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const intervalSec = promo?.auto_scroll_seconds ?? 4;

  useEffect(() => {
    if (loaded && shouldShow) setOpen(true);
  }, [loaded, shouldShow]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || slides.length <= 1 || paused) return undefined;
    setProgressKey((k) => k + 1);
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
      setProgressKey((k) => k + 1);
    }, intervalSec * 1000);
    return () => window.clearInterval(id);
  }, [open, slides.length, intervalSec, paused, index]);

  const close = useCallback(() => {
    dismissPromo(promo?.dismiss_hours);
    setOpen(false);
  }, [promo?.dismiss_hours]);

  if (!loaded || !shouldShow) return null;

  const slide = slides[index];

  return (
    <AnimatePresence>
      {open && slide ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-6"
          style={{
            paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Promotional offer"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md touch-none"
            aria-label="Close"
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="promo-modal-shell relative z-10 w-full max-w-[420px] sm:max-w-[520px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
          >
            <div
              className="promo-modal-watermark"
              style={{ backgroundImage: `url(${LOGO})` }}
            />

            <button
              type="button"
              onClick={close}
              className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-black flex items-center justify-center active:scale-95 hover:bg-zinc-100 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              aria-label="Close popup"
            >
              <X size={17} strokeWidth={2.5} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            <div className="promo-modal-scroll relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {slide.type === 'coin' ? (
                    <CoinSlide data={slide.data} onClose={close} />
                  ) : (
                    <AppSlide data={slide.data} apk={slide.apk} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {slides.length > 1 ? (
              <div className="promo-modal-footer relative z-20">
                <div className="promo-progress-track">
                  <div
                    key={`${index}-${progressKey}-${paused}`}
                    className="promo-progress-fill"
                    style={{
                      animationDuration: paused ? '0s' : `${intervalSec}s`,
                      animationPlayState: paused ? 'paused' : 'running',
                    }}
                  />
                </div>
                <div className="flex justify-center gap-2 py-2.5 sm:py-3">
                  {slides.map((s, i) => (
                    <button
                      key={s.key}
                      type="button"
                      aria-label={s.type === 'coin' ? 'BZX coin slide' : 'Mobile app slide'}
                      aria-current={i === index ? 'true' : undefined}
                      onClick={() => {
                        setIndex(i);
                        setProgressKey((k) => k + 1);
                      }}
                      className={`rounded-full transition-all duration-300 ${
                        i === index
                          ? 'w-7 h-2 bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                          : 'w-2 h-2 bg-white/20 active:bg-white/45'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
