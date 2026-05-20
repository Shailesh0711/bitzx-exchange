import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Download, Smartphone, Sparkles, ChevronRight } from 'lucide-react';
import { useLandingPromo, promoAssetUrl, dismissPromo } from '@/hooks/useLandingPromo';
import { mobileAppDownloadHref } from '@/hooks/useMobileAppRelease';

const LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';

function PromoBrand({ label = 'BITZX', centered = true }) {
  return (
    <div className={`flex items-center gap-2.5 ${centered ? 'justify-center' : ''}`}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-md scale-150" />
        <img src={LOGO} alt="" className="relative w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-lg" />
      </div>
      <span className="text-white font-extrabold tracking-[0.22em] text-sm sm:text-base">{label}</span>
    </div>
  );
}

function CoinVisual({ imageUrl, brandLabel }) {
  const img = promoAssetUrl(imageUrl);
  if (img) {
    return (
      <div className="relative flex items-end justify-center w-full h-full min-h-[200px] pb-2">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 65% 55% at 55% 75%, rgba(251,191,36,0.22), transparent 68%)' }}
        />
        <motion.img
          src={img}
          alt=""
          className="relative z-[1] max-h-[240px] w-auto object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.65)]"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-end w-full min-h-[200px] pb-1">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 80%, rgba(251,191,36,0.2), transparent 65%)' }}
      />
      <div className="promo-rocket" aria-hidden>
        <div
          className="w-full h-[72%] rounded-t-full rounded-b-sm mx-auto"
          style={{ background: 'linear-gradient(180deg, #fde68a 0%, #d97706 55%, #92400e 100%)', boxShadow: '0 8px 24px rgba(251,191,36,0.35)' }}
        />
        <div className="flex justify-center gap-1 mt-1">
          <span className="w-2 h-3 rounded-sm bg-amber-700/80 rotate-[-18deg]" />
          <span className="w-2 h-3 rounded-sm bg-amber-700/80 rotate-[18deg]" />
        </div>
      </div>
      <div className="relative z-[2] flex flex-col items-center">
        <div className="promo-coin-disc flex items-center justify-center">
          <img src={LOGO} alt="" className="w-10 h-10 object-contain" />
        </div>
        <span className="mt-2 text-[9px] font-bold tracking-[0.35em] text-amber-200/70 uppercase">{brandLabel}</span>
        <div className="promo-coin-pedestal" />
        <div className="promo-coin-ring" />
      </div>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute w-2 h-2 rounded-full bg-amber-400/60"
          style={{ left: `${28 + i * 18}%`, bottom: `${12 + (i % 2) * 4}%`, filter: 'blur(0.5px)' }}
        />
      ))}
    </div>
  );
}

function AppVisual({ imageUrl }) {
  const img = promoAssetUrl(imageUrl);
  if (img) {
    return (
      <div className="relative flex items-center justify-center flex-1 min-h-[180px] px-4">
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 85% 70% at 50% 100%, rgba(59,130,246,0.18), transparent 70%)' }}
        />
        <motion.img
          src={img}
          alt=""
          className="relative z-[1] max-h-[220px] w-auto object-contain"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 min-h-[180px] px-4">
      <div className="promo-app-glow-floor" />
      <div className="relative z-[2] flex gap-3 items-end mb-3">
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="promo-phone overflow-hidden"
            style={{ transform: i === 0 ? 'rotate(-10deg) translateY(6px)' : 'rotate(10deg)' }}
            animate={{ y: i === 0 ? [6, -2, 6] : [0, -8, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
          >
            <div className="h-5 bg-black/50 flex items-center justify-center">
              <span className="w-8 h-1 rounded-full bg-white/20" />
            </div>
            <div className="p-1.5 space-y-1">
              <div className="h-14 rounded-md bg-gradient-to-br from-emerald-500/20 to-emerald-900/30 border border-emerald-500/25" />
              <div className="h-1 rounded bg-white/10" />
              <div className="h-1 rounded bg-white/10 w-4/5" />
              <div className="flex gap-0.5 mt-2">
                <div className="h-6 flex-1 rounded bg-gold/20" />
                <div className="h-6 flex-1 rounded bg-white/5" />
              </div>
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
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 flex flex-col sm:grid sm:grid-cols-[1.05fr_0.95fr] min-h-0">
        <div className="relative z-[2] flex flex-col justify-center px-6 sm:pl-7 sm:pr-4 pt-10 sm:pt-12 pb-4 text-left">
          <div className="mb-4 sm:mb-5">
            <PromoBrand label={data.brand_label || 'BZX'} centered={false} />
          </div>
          <h2 className="promo-title-shimmer text-[1.65rem] sm:text-[1.85rem] font-extrabold leading-[1.05] tracking-tight mb-3 uppercase">
            {data.title}
          </h2>
          <p className="promo-tagline-gold text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.12em] leading-snug mb-2">
            {data.tagline_1}
          </p>
          <p className="promo-tagline-gold text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em] leading-snug mb-4 opacity-95">
            {data.tagline_2}
          </p>
          <p className="text-white font-semibold text-sm sm:text-base mb-1">{data.status_line}</p>
          <p className="text-amber-300/95 font-bold text-xs sm:text-sm mb-5 leading-snug">{data.event_line}</p>
          {data.cta_url && data.cta_label ? (
            ctaInternal ? (
              <Link
                to={data.cta_url}
                onClick={onClose}
                className="group inline-flex w-fit items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600/90 to-amber-500/90 px-5 py-2.5 text-sm font-bold text-[#1a1208] shadow-lg shadow-amber-500/25 hover:from-amber-500 hover:to-amber-400 transition-all"
              >
                {data.cta_label}
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <a
                href={data.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-fit items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600/90 to-amber-500/90 px-5 py-2.5 text-sm font-bold text-[#1a1208] shadow-lg shadow-amber-500/25 hover:from-amber-500 hover:to-amber-400 transition-all"
              >
                {data.cta_label}
                <ChevronRight size={16} />
              </a>
            )
          ) : null}
        </div>
        <div className="relative flex items-end justify-center sm:justify-end sm:pr-2 pb-2 sm:pb-4 min-h-[200px] sm:min-h-0">
          <CoinVisual imageUrl={data.image_url} brandLabel={data.brand_label || 'BZX'} />
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
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 sm:px-8 pt-10 sm:pt-11 pb-3 text-center">
        <div className="mb-4">
          <PromoBrand label="BITZX" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-2.5 leading-snug tracking-tight">
          {data.headline}
        </h2>
        <p className="text-[13px] text-zinc-400 leading-relaxed max-w-[340px] mx-auto mb-3">
          {data.description}
        </p>
        <p className="text-base sm:text-lg font-bold text-white mb-2">{data.subheadline}</p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
          {features.map((f, i) => (
            <span key={f} className="inline-flex items-center gap-2">
              {i > 0 ? <span className="text-amber-500/60 font-normal">|</span> : null}
              <span className="promo-tagline-gold">{f}</span>
            </span>
          ))}
        </div>
      </div>

      <AppVisual imageUrl={data.image_url} />

      <div className="promo-download-bar mt-auto px-5 sm:px-6 py-4 text-center">
        {available ? (
          <a
            href={downloadHref}
            download={`bitzx-${apk.version}.apk`}
            className="group inline-flex flex-col sm:flex-row sm:items-center justify-center gap-1 sm:gap-3 w-full sm:w-auto mx-auto rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] hover:border-emerald-400/30 px-5 py-3.5 transition-all"
          >
            <span className="inline-flex items-center justify-center gap-2 text-white font-semibold">
              <Download size={18} className="text-emerald-400" />
              <span className="underline underline-offset-4 decoration-emerald-400/50 group-hover:decoration-emerald-300">
                {data.cta_label || 'Click here to download'}
              </span>
            </span>
            {apk.version ? (
              <span className="text-xs text-zinc-500 font-medium">Android APK · v{apk.version}</span>
            ) : null}
          </a>
        ) : (
          <p className="inline-flex items-center justify-center gap-2 text-zinc-400 text-sm">
            <Smartphone size={17} className="text-zinc-500" />
            <Sparkles size={14} className="text-amber-400/80" />
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
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Promotional offer"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            aria-label="Close"
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="promo-modal-shell relative z-10 flex flex-col"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              className="promo-modal-watermark"
              style={{ backgroundImage: `url(${LOGO})` }}
            />

            <button
              type="button"
              onClick={close}
              className="absolute top-3.5 right-3.5 z-30 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 hover:bg-zinc-100 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              aria-label="Close popup"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.key}
                  className="h-full"
                  initial={{ opacity: 0, x: 32, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: -28, filter: 'blur(4px)' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
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
              <div className="relative z-20 shrink-0">
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
                <div className="flex justify-center gap-2 py-3">
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
                          : 'w-2 h-2 bg-white/20 hover:bg-white/45'
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
