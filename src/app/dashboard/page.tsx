"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClockCounterClockwise, ArrowsLeftRight, Hash, CreditCard, WifiHigh, Gift, Lifebuoy, CaretRight, Spinner, CheckCircle, Eye, EyeSlash } from "@phosphor-icons/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/components/CurrencyContext";

const QuickFund = dynamic(() => import("@/components/dashboard/QuickFund"), {
  ssr: false,
});
import ConvertModal from "@/components/dashboard/ConvertModal";

export default function DashboardPage() {
  const { currency, setCurrency } = useCurrency();
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [wallet, setWallet] = useState<{ balance_ngn: number; balance_usd: number; id: string } | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(1500);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const supabase = createClient();
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Profile, Wallet, and Settings concurrently
      const [profileRes, walletRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("wallets").select("balance_ngn, balance_usd, id").eq("user_id", user.id).single(),
        supabase.from("settings").select("exchange_rate").eq("id", 1).single()
      ]);

      if (profileRes.data) {
        setProfile({ full_name: profileRes.data.full_name, email: user.email! });
      }

      if (walletRes.data) {
        setWallet({
          ...walletRes.data,
          balance_usd: walletRes.data.balance_usd || 0
        });
      }

      if (settingsRes.data && settingsRes.data.exchange_rate) {
        setExchangeRate(settingsRes.data.exchange_rate);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleSuccessfulPayment = async (reference: string, amountStr: string) => {
    const res = await fetch("/api/fund/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });

    const data = await res.json();

    if (data.success) {
      setWallet(prev => prev ? { ...prev, balance_ngn: data.new_balance } : prev);
      setSuccessMsg(`Funded ₦${parseInt(amountStr).toLocaleString()}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      throw new Error(data.error || "Failed to verify payment on backend.");
    }
  };

  const getFirstName = (fullName: string | null) => {
    if (!fullName) return "User";
    return fullName.split(' ')[0];
  };

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Spinner className="animate-spin text-3xl text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 pb-12 w-full max-w-5xl text-slate-900 dark:text-white transition-colors duration-500">
      {/* Wallet Balance Hero (Attention) */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col gap-6 relative"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-medium tracking-tight">
              Good day, {profile ? getFirstName(profile.full_name) : "User"} <span className="inline-block origin-bottom-right animate-wave">👋</span>
            </h2>
            <p className="text-slate-500 dark:text-white/40 mt-1">Here's your account overview</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-surface/30 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-none p-8 md:p-10 flex flex-col gap-8 group">
          {/* Ambient Glow */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-blue/10 rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100"></div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-slate-400 dark:text-white/40 uppercase">
              <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              Wallet Balance
              <button 
                onClick={() => setShowBalance(!showBalance)} 
                className="ml-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
                title={showBalance ? "Hide balance" : "Show balance"}
              >
                {showBalance ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
              </button>
            </div>
            <div className="flex bg-slate-100 dark:bg-base rounded-full p-1 border border-black/5 dark:border-white/5 relative">
              {/* Highlight background pill */}
              <motion.div
                layoutId="currency-pill"
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-surface rounded-full shadow-sm border border-black/5 dark:border-white/10"
                initial={false}
                animate={{
                  left: currency === 'NGN' ? '4px' : 'calc(50% + 2px)',
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              <button
                onClick={() => setCurrency('NGN')}
                className={`px-4 py-1 text-xs font-semibold rounded-full relative z-10 transition-colors ${currency === 'NGN' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
              >
                NGN
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-4 py-1 text-xs font-semibold rounded-full relative z-10 transition-colors ${currency === 'USD' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
              >
                USD
              </button>
            </div>
          </div>

          <div className="relative z-10 flex flex-col">
            <AnimatePresence mode="wait">
              {currency === 'NGN' ? (
                <motion.h1
                  key="balance-ngn"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full text-5xl md:text-[clamp(3.5rem,5vw,5.5rem)] font-bold tracking-tighter leading-none flex items-center gap-4 text-slate-900 dark:text-white"
                >
                  <span className="text-slate-400 dark:text-white/40 font-mono mr-2">₦</span>
                  {showBalance ? wallet?.balance_ngn.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '****'}
                </motion.h1>
              ) : (
                <motion.h1
                  key="balance-usd"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full text-5xl md:text-[clamp(3.5rem,5vw,5.5rem)] font-bold tracking-tighter leading-none flex items-center gap-4 text-slate-900 dark:text-white"
                >
                  <span className="text-slate-400 dark:text-white/40 font-mono mr-2">$</span>
                  {showBalance ? wallet?.balance_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '****'}
                </motion.h1>
              )}
            </AnimatePresence>
            <span className="text-sm text-slate-500 dark:text-white/40 mt-3 font-mono">
              Available Balance · Wallet ID #{wallet?.id.substring(0, 6).toUpperCase()}
            </span>
          </div>

          {/* Action Module */}
          <div className="flex flex-col md:flex-row gap-4 mt-2 items-start md:items-center relative z-10 min-h-[52px]">
            <AnimatePresence mode="popLayout">
              {currency === 'NGN' ? (
                <motion.div
                  key="ngn-actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full md:w-auto"
                >
                  {profile && (
                    <QuickFund
                      email={profile.email}
                      publicKey={publicKey}
                      onSuccessPayment={handleSuccessfulPayment}
                    />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="usd-actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full md:w-auto"
                >
                  <button
                    onClick={() => setIsConvertModalOpen(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-[13px] rounded-xl bg-brand-blue text-white text-sm font-bold tracking-wide hover:bg-brand-blue-hover transition-transform active:scale-95 duration-200 shadow-[0_0_15px_rgba(0,112,243,0.3)]"
                  >
                    <ArrowsLeftRight weight="bold" className="text-lg" />
                    Convert to USD
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <Link href="/dashboard/transactions" className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-700 dark:text-white text-sm font-semibold tracking-wide hover:bg-slate-200 dark:hover:bg-white/10 transition-transform active:scale-95 duration-200">
              <ClockCounterClockwise weight="bold" className="text-lg" />
              History
            </Link>
          </div>

          {successMsg && <p className="text-[#10B981] text-sm font-medium relative z-10 flex items-center gap-1 mt-[-10px]"><CheckCircle weight="fill" /> {successMsg}</p>}

        </div>
      </motion.section>

      {/* Bento Grid Quick Links (Interest) */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col gap-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Quick Actions</h3>
        </div>

        {/* Gapless Bento Grid */}
        <div className="grid grid-cols-4 md:grid-cols-6 grid-flow-dense gap-4">

          {/* Action 1: Virtual Numbers (Large focal card) */}
          <Link href="/dashboard/sms" className="col-span-2 md:col-span-2 row-span-2 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-surface/40 hover:bg-slate-50 dark:hover:bg-surface/60 transition-colors p-6 flex flex-col justify-between group cursor-pointer relative overflow-hidden shadow-sm dark:shadow-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-3xl group-hover:bg-brand-blue/10 transition-colors"></div>
            <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue mb-8">
              <Hash className="text-2xl" weight="duotone" />
            </div>
            <div>
              <h4 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors">Virtual Numbers</h4>
              <p className="text-sm text-slate-500 dark:text-white/40 mt-1">Get non-VoIP numbers for global verifications.</p>
            </div>
          </Link>

          {/* Action 2: Affiliate Program */}
          <Link href="/dashboard/affiliates" className="col-span-2 md:col-span-2 row-span-1 rounded-2xl border border-black/5 dark:border-white/5 bg-slate-100 dark:bg-base hover:bg-slate-200 dark:hover:bg-white/5 transition-colors p-5 flex items-center gap-4 group cursor-pointer shadow-sm dark:shadow-none">
            <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
              <Gift className="text-xl" weight="duotone" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Affiliates <span className="text-[9px] bg-[#10B981]/10 text-[#10B981] px-1.5 py-0.5 rounded ml-2 uppercase font-bold tracking-wider">New</span></h4>
              <p className="text-xs text-slate-500 dark:text-white/40">Earn rewards for invites</p>
            </div>
          </Link>

          {/* Action 3: Long-Term Rentals */}
          <Link href="/dashboard/sms/long-term" className="col-span-2 md:col-span-2 row-span-1 rounded-2xl border border-black/5 dark:border-white/5 bg-slate-100 dark:bg-base hover:bg-slate-200 dark:hover:bg-white/5 transition-colors p-5 flex items-center gap-4 group cursor-pointer shadow-sm dark:shadow-none">
            <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
              <ClockCounterClockwise className="text-xl" weight="duotone" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Rentals <span className="text-[9px] bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 rounded ml-2 uppercase font-bold tracking-wider">New</span></h4>
              <p className="text-xs text-slate-500 dark:text-white/40">Long-term numbers</p>
            </div>
          </Link>

          {/* Action 4: Data / WiFi */}
          <div className="col-span-2 md:col-span-1 row-span-1 rounded-2xl border border-black/5 dark:border-white/5 bg-slate-100 dark:bg-base hover:bg-slate-200 dark:hover:bg-white/5 transition-colors p-5 flex flex-col justify-center items-center gap-2 group cursor-pointer text-center opacity-50 shadow-sm dark:shadow-none">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-surface flex items-center justify-center text-slate-500 dark:text-white/60 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              <WifiHigh className="text-xl" />
            </div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Buy Data</h4>
          </div>

          {/* Action 5: Gift Cards */}
          <div className="col-span-2 md:col-span-1 row-span-1 rounded-2xl border border-black/5 dark:border-white/5 bg-slate-100 dark:bg-base hover:bg-slate-200 dark:hover:bg-white/5 transition-colors p-5 flex flex-col justify-center items-center gap-2 group cursor-pointer text-center opacity-50 shadow-sm dark:shadow-none">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-surface flex items-center justify-center text-slate-500 dark:text-white/60 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              <Gift className="text-xl" />
            </div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Gift Cards</h4>
          </div>

          {/* Action 6: Support / Help (Wide Banner) */}
          <div className="col-span-4 md:col-span-2 row-span-1 rounded-2xl border border-black/5 dark:border-white/5 bg-gradient-to-r from-slate-100 to-white dark:from-surface dark:to-base hover:from-slate-200 hover:to-slate-100 dark:hover:from-surface-hover dark:hover:to-surface transition-all p-5 flex items-center justify-between group cursor-pointer shadow-sm dark:shadow-none">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                <Lifebuoy className="text-xl" weight="duotone" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Need Help?</h4>
                <p className="text-xs text-slate-500 dark:text-white/40">24/7 dedicated support</p>
              </div>
            </div>
            <CaretRight className="text-slate-400 dark:text-white/20 group-hover:text-slate-600 dark:group-hover:text-white/60 transition-colors" />
          </div>

        </div>
      </motion.section>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes wave {
          0%, 100% { transform: rotate(0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate(0.0deg) }
        }
        .animate-wave {
          animation: wave 2.5s infinite;
        }
      `}} />

      <ConvertModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        ngnBalance={wallet?.balance_ngn || 0}
        usdBalance={wallet?.balance_usd || 0}
        exchangeRate={exchangeRate}
        onConvertSuccess={(newNgn, newUsd) => {
          setWallet(prev => prev ? { ...prev, balance_ngn: newNgn, balance_usd: newUsd } : prev);
          setSuccessMsg("Successfully converted to USD!");
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsConvertModalOpen(false);
        }}
      />
    </div>
  );
}
