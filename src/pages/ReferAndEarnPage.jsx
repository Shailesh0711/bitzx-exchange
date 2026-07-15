import { useState, useEffect, useCallback } from 'react';

import { motion } from 'framer-motion';

import {

  Gift, Copy, Check, Share2, Users, Coins, Loader2,

} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

import { fetchMyReferralInfo } from '@/services/referralApi';

import ReferralNetworkTree from '@/components/referral/ReferralNetworkTree';
import { buildReferralSignupLink } from '@/lib/referral';



function LevelRow({ level }) {

  const label = level.flat_overflow

    ? `Level ${level.flat_from_level || level.level}+`

    : `Level ${level.level}`;

  return (

    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-3 sm:px-4 py-3 text-sm border-b border-surface-border/60 last:border-0">

      <span className="font-bold text-white">{label}</span>

      <span className="text-white/70">{Number(level.amount_bzx || 0).toFixed(4)} BZX</span>

      <span className="text-white/70 hidden sm:block">{level.referral_count ?? 0} users</span>

      <span className="text-gold-light font-semibold hidden sm:block">{Number(level.earned_bzx || 0).toFixed(4)} BZX</span>

      <span className="text-amber-400 font-semibold hidden sm:block">{Number(level.pending_bzx || 0).toFixed(4)} BZX</span>

    </div>

  );

}



export default function ReferAndEarnPage() {

  const { user } = useAuth();

  const [info, setInfo] = useState(null);

  const [tree, setTree] = useState([]);

  const [loading, setLoading] = useState(true);

  const [err, setErr] = useState('');

  const [copied, setCopied] = useState(false);

  const [shared, setShared] = useState(false);



  const load = useCallback(async () => {

    setLoading(true);

    setErr('');

    try {

      const res = await fetchMyReferralInfo();

      setInfo(res);

      setTree(res.referrals || []);

    } catch (e) {

      setErr(e.message || 'Could not load referral data');

      setInfo(null);

      setTree([]);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    load();

  }, [load]);



  const shareLink = info ? buildReferralSignupLink(info.share_links?.website, info.referral_code) : '';

  const levels = info?.summary?.levels || [];



  const copyLink = () => {

    if (!shareLink) return;

    navigator.clipboard?.writeText(shareLink).then(() => {

      setCopied(true);

      setTimeout(() => setCopied(false), 1800);

    });

  };



  const shareLinkNow = async () => {

    if (!shareLink) return;

    const shareData = {

      title: 'Join BITZX',

      text: 'Sign up on BITZX with my referral link and start trading!',

      url: shareLink,

    };

    if (navigator.share) {

      try {

        await navigator.share(shareData);

        return;

      } catch {

        // user cancelled or share failed — fall back to copy

      }

    }

    copyLink();

    setShared(true);

    setTimeout(() => setShared(false), 1800);

  };



  if (loading) {

    return (

      <div className="min-h-screen bg-surface-dark flex items-center justify-center">

        <Loader2 className="animate-spin text-gold-light" size={32} />

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-surface-dark px-3 sm:px-4 lg:px-5 py-6 sm:py-8">

      <div className="w-full max-w-[min(100%,96rem)] mx-auto space-y-5 sm:space-y-6">

        <div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">

            <Gift className="text-gold-light" size={28} /> Refer &amp; Earn

          </h1>

          <p className="text-white/65 text-sm mt-1 max-w-3xl">

            Invite friends and earn BZX for every level of your referral network — when your referral completes KYC, you get rewarded.

          </p>

        </div>



        {err ? (

          <div className="rounded-xl border border-red-500/25 bg-red-500/10 text-red-300 text-sm px-4 py-3 space-y-3">

            <p>{err}</p>

            <button

              type="button"

              onClick={load}

              className="px-3 py-1.5 rounded-lg border border-red-400/30 text-red-200 text-xs font-bold hover:bg-red-500/10"

            >

              Retry

            </button>

          </div>

        ) : null}



        {info && !info.referral_enabled ? (

          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300 text-sm px-4 py-3">

            The Refer &amp; Earn program is not currently active. Check back soon!

          </div>

        ) : null}



        {info ? (

          <motion.div

            initial={{ opacity: 0, y: 8 }}

            animate={{ opacity: 1, y: 0 }}

            className="rounded-2xl p-4 sm:p-5 lg:p-6"

            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}

          >

            <p className="text-xs font-bold text-white/45 uppercase tracking-wide mb-2">Your referral code</p>

            <div className="flex flex-wrap items-center gap-3">

              <span className="text-2xl font-mono font-extrabold text-gold-light tracking-wider">{info.referral_code}</span>

            </div>



            <p className="text-xs font-bold text-white/45 uppercase tracking-wide mt-5 mb-2">Your referral link</p>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">

              <input

                readOnly

                value={shareLink}

                className="flex-1 min-w-0 rounded-xl bg-surface-card border border-surface-border px-3 py-2.5 text-sm text-white/85 font-mono"

              />

              <div className="flex gap-2 shrink-0">

                <button

                  type="button"

                  onClick={copyLink}

                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-surface-border text-white/85 hover:bg-white/[.05] text-sm font-bold transition-colors"

                >

                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}

                  {copied ? 'Copied' : 'Copy'}

                </button>

                <button

                  type="button"

                  onClick={shareLinkNow}

                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold/20 border border-gold/35 text-gold-light hover:bg-gold/25 text-sm font-bold transition-colors"

                >

                  <Share2 size={16} />

                  {shared ? 'Copied for sharing' : 'Share'}

                </button>

              </div>

            </div>

          </motion.div>

        ) : null}



        {info ? (

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

            <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

              <div className="flex items-center gap-2 text-white/60 mb-1"><Users size={16} /><span className="text-xs font-bold uppercase tracking-wide">Direct referrals</span></div>

              <p className="text-2xl font-extrabold text-white">{info.summary?.direct_referral_count ?? 0}</p>

            </div>

            <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

              <div className="flex items-center gap-2 text-white/60 mb-1"><Users size={16} /><span className="text-xs font-bold uppercase tracking-wide">Total network</span></div>

              <p className="text-2xl font-extrabold text-white">{info.summary?.total_referral_count ?? 0}</p>

            </div>

            <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

              <div className="flex items-center gap-2 text-white/60 mb-1"><Coins size={16} /><span className="text-xs font-bold uppercase tracking-wide">Total earned</span></div>

              <p className="text-2xl font-extrabold text-gold-light">{Number(info.summary?.total_earned_bzx || 0).toFixed(4)} BZX</p>

            </div>

            <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

              <div className="flex items-center gap-2 text-white/60 mb-1"><Coins size={16} /><span className="text-xs font-bold uppercase tracking-wide">Pending (awaiting KYC)</span></div>

              <p className="text-2xl font-extrabold text-amber-400">{Number(info.summary?.total_pending_bzx || 0).toFixed(4)} BZX</p>

            </div>

          </div>

        ) : null}



        {Number(info?.summary?.total_pending_bzx || 0) > 0 ? (

          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300 text-sm px-4 py-3">

            You have {Number(info.summary.total_pending_bzx).toFixed(4)} BZX already sent on-chain and waiting in your referral rewards —

            it will land in your spendable wallet as soon as the referred user(s) complete KYC verification.

          </div>

        ) : null}



        <div className="space-y-3">

          <h2 className="text-sm font-extrabold text-white/85 uppercase tracking-wide">Your referral network</h2>

          {user ? (

            <ReferralNetworkTree

              rootUser={user}

              referrals={tree}

              summary={info?.summary}

            />

          ) : null}

        </div>



        {levels.length > 0 ? (

          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

            <div className="px-3 sm:px-4 py-3 border-b border-surface-border/70">

              <h2 className="text-sm font-extrabold text-white/85 uppercase tracking-wide">Reward levels</h2>

            </div>

            <div className="hidden sm:grid sm:grid-cols-5 gap-2 px-4 py-2 text-xs font-bold text-white/40 uppercase tracking-wide border-b border-surface-border/60">

              <span>Level</span>

              <span>Reward</span>

              <span>Referrals</span>

              <span>Earned</span>

              <span>Pending</span>

            </div>

            {levels.map((lvl) => <LevelRow key={lvl.level} level={lvl} />)}

          </div>

        ) : null}

      </div>

    </div>

  );

}


