"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClockCounterClockwise, ArrowsLeftRight, Hash, CreditCard, WifiHigh, Gift, Lifebuoy, CaretRight, Spinner, CheckCircle, Eye, EyeSlash, Storefront, Code } from "@phosphor-icons/react";
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
  const [wallet, setWallet] = useState<{ balance_ngn: number; balance_usd: number; lifetime_deposits_usd: number; id: string } | null>(null);
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

      const [profileRes, walletRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("wallets").select("balance_ngn, balance_usd, lifetime_deposits_usd, id").eq("user_id", user.id).single(),
        supabase.from("api_settings").select("exchange_rate").single()
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
      <div className="flex flex-col gap-8 md:gap-12 pb-12 w-full max-w-5xl text-slate-900 dark:text-white transition-colors duration-500 animate-pulse font-sans">
        <section className="w-full flex flex-col gap-6">
          <div>
            <div className="h-8 bg-slate-200 dark:bg-white/10 rounded-lg w-64 mb-3"></div>
            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-lg w-48"></div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-surface/30 p-6 md:p-10 flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="w-24 h-4 bg-slate-200 dark:bg-white/10 rounded-full"></div>
              <div className="w-32 h-8 bg-slate-200 dark:bg-white/10 rounded-full"></div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-64 h-16 bg-slate-200 dark:bg-white/10 rounded-2xl"></div>
              <div className="w-48 h-4 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 md:gap-12 pb-24 md:pb-32 w-full max-w-5xl text-slate-900 dark:text-white transition-colors duration-500 font-sans overflow-x-hidden">
      
      {/* Hero Section with Wallet Component */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col gap-6"
      >
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Welcome back, {getFirstName(profile?.full_name || null)} <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
          </h2>
          <p className="text-slate-500 dark:text-white/40 text-xs sm:text-sm mt-1">Here is your account overview and balance.</p>
        </div>

        {/* Hero Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 p-6 md:p-10 flex flex-col justify-between gap-6 relative overflow-hidden shadow-xl dark:shadow-none">
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header / Currency Switcher */}
            <div className="flex items-center justify-between relative z-10 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-mono font-bold">
                  Wallet Balance
                </span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white transition-colors p-1"
                  title={showBalance ? "Hide Balance" : "Show Balance"}
                >
                  {showBalance ? <Eye size={18} /> : <EyeSlash size={18} />}
                </button>
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/10">
                <button
                  onClick={() => setCurrency('NGN')}
                  className={`px-3 sm:px-4 py-1 text-xs font-bold rounded-full relative z-10 transition-colors ${currency === 'NGN' ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/40'}`}
                >
                  NGN
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 sm:px-4 py-1 text-xs font-bold rounded-full relative z-10 transition-colors ${currency === 'USD' ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/40'}`}
                >
                  USD
                </button>
              </div>
            </div>

            {/* Balance Display (Mobile Responsive Scaling) */}
            <div className="relative z-10 flex flex-col">
              <AnimatePresence mode="wait">
                {currency === 'NGN' ? (
                  <motion.h1
                    key="balance-ngn"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-none flex items-center text-slate-900 dark:text-white truncate"
                  >
                    <span className="text-slate-400 dark:text-white/40 font-mono mr-2">₦</span>
                    <span className="truncate">{showBalance ? wallet?.balance_ngn.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}</span>
                  </motion.h1>
                ) : (
                  <motion.h1
                    key="balance-usd"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-none flex items-center text-slate-900 dark:text-white truncate"
                  >
                    <span className="text-slate-400 dark:text-white/40 font-mono mr-2">$</span>
                    <span className="truncate">{showBalance ? wallet?.balance_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}</span>
                  </motion.h1>
                )}
              </AnimatePresence>
              <span className="text-xs sm:text-sm text-slate-500 dark:text-white/40 mt-3 font-mono">
                Available Balance · Wallet ID #{wallet?.id.substring(0, 6).toUpperCase()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-2 items-stretch sm:items-center relative z-10">
              <AnimatePresence mode="popLayout">
                {currency === 'NGN' ? (
                  <motion.div
                    key="ngn-actions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full sm:w-auto"
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
                    className="w-full sm:w-auto"
                  >
                    <button
                      onClick={() => setIsConvertModalOpen(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-blue text-white text-sm font-bold tracking-wide hover:bg-blue-600 transition-all shadow-lg shadow-brand-blue/20"
                    >
                      <ArrowsLeftRight weight="bold" className="text-lg" />
                      Convert to USD
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <Link href="/dashboard/transactions" className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white text-sm font-bold tracking-wide hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                <ClockCounterClockwise weight="bold" className="text-lg" />
                History
              </Link>
            </div>

            {successMsg && <p className="text-emerald-500 text-xs font-bold relative z-10 flex items-center gap-1"><CheckCircle weight="fill" /> {successMsg}</p>}
          </div>

          {/* VIP Status Card */}
          <div className="lg:col-span-1 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/90 text-slate-900 dark:text-white p-6 relative overflow-hidden flex flex-col justify-between shadow-xl dark:shadow-none transition-colors">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 dark:bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold tracking-tight text-xs uppercase text-slate-500 dark:text-slate-400">VIP Loyalty Status</h3>
                {wallet && wallet.lifetime_deposits_usd >= 500 ? (
                  <span className="bg-amber-500/10 text-amber-600 dark:bg-yellow-500/20 dark:text-yellow-400 px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-amber-500/20">GOLD (12% OFF)</span>
                ) : wallet && wallet.lifetime_deposits_usd >= 150 ? (
                  <span className="bg-slate-200 text-slate-700 dark:bg-slate-300/20 dark:text-slate-300 px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-slate-300/30">SILVER (7% OFF)</span>
                ) : wallet && wallet.lifetime_deposits_usd >= 50 ? (
                  <span className="bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-orange-500/20">BRONZE (3% OFF)</span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60 px-2.5 py-1 rounded-full text-[10px] font-bold">STANDARD</span>
                )}
              </div>
              
              <div className="mt-4">
                <p className="text-2xl font-bold font-mono tracking-tighter text-slate-900 dark:text-white">
                  {currency === 'NGN' ? '₦' : '$'}
                  {wallet?.lifetime_deposits_usd ? (currency === 'NGN' ? wallet.lifetime_deposits_usd * exchangeRate : wallet.lifetime_deposits_usd).toLocaleString(currency === 'NGN' ? 'en-NG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Lifetime Deposits</p>
              </div>
            </div>

            <div className="mt-6">
              {wallet && wallet.lifetime_deposits_usd >= 500 ? (
                <div className="text-xs font-semibold text-amber-600 dark:text-yellow-400">You've reached the highest VIP tier! Enjoy 12% off everything.</div>
              ) : (
                <>
                  <div className="flex justify-between text-xs mb-2 text-slate-500 dark:text-slate-400 font-medium">
                    <span>VIP Tier Progress</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currency === 'NGN' ? '₦' : '$'}{((wallet?.lifetime_deposits_usd || 0) * (currency === 'NGN' ? exchangeRate : 1)).toLocaleString()} / {currency === 'NGN' ? '₦' : '$'}{((wallet && wallet.lifetime_deposits_usd >= 150 ? 500 : wallet && wallet.lifetime_deposits_usd >= 50 ? 150 : 50) * (currency === 'NGN' ? exchangeRate : 1)).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-blue rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, ((wallet?.lifetime_deposits_usd || 0) / (wallet && wallet.lifetime_deposits_usd >= 150 ? 500 : wallet && wallet.lifetime_deposits_usd >= 50 ? 150 : 50)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Bento Grid Quick Links */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col gap-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Quick Services & Marketplace</h3>
        </div>

        {/* Mobile Responsive Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">

          {/* Action 1: Virtual Numbers (Focal Card) */}
          <Link href="/dashboard/sms" className="col-span-1 sm:col-span-2 lg:col-span-2 row-span-1 sm:row-span-2 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/40 hover:bg-slate-50 dark:hover:bg-surface/60 transition-all p-6 flex flex-col justify-between group cursor-pointer relative overflow-hidden shadow-lg dark:shadow-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-3xl group-hover:bg-brand-blue/10 transition-colors"></div>
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue mb-6 sm:mb-8">
              <Hash className="text-2xl" weight="duotone" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors">Virtual Phone Numbers</h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-white/40 mt-1">Get non-VoIP lines for instant WhatsApp, Telegram & 1,300+ app verifications.</p>
            </div>
          </Link>

          {/* Action 2: Digital Marketplace (Featured Storefront Card) */}
          <Link href="/dashboard/marketplace" className="col-span-1 sm:col-span-2 lg:col-span-2 row-span-1 rounded-3xl border border-brand-blue/30 dark:border-brand-blue/40 bg-gradient-to-br from-brand-blue/10 via-purple-500/5 to-transparent hover:from-brand-blue/20 hover:to-purple-500/10 transition-all p-5 flex items-center gap-4 group cursor-pointer shadow-md">
            <div className="w-11 h-11 rounded-2xl bg-brand-blue text-white flex items-center justify-center shadow-md shadow-brand-blue/20 group-hover:scale-105 transition-transform shrink-0">
              <Storefront className="text-2xl" weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between gap-1">
                <span className="truncate">Digital Marketplace</span>
                <span className="text-[9px] bg-brand-blue text-white px-2 py-0.5 rounded-full uppercase font-extrabold tracking-wider shrink-0">HOT</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-white/50 truncate">Buy Aged Social & Ad Accounts</p>
            </div>
          </Link>

          {/* Action 3: Long-Term Rentals */}
          <Link href="/dashboard/sms/long-term" className="col-span-1 sm:col-span-2 lg:col-span-2 row-span-1 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-slate-100/70 dark:bg-base hover:bg-slate-200/70 dark:hover:bg-white/5 transition-all p-5 flex items-center gap-4 group cursor-pointer shadow-sm dark:shadow-none">
            <div className="w-11 h-11 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors shrink-0">
              <ClockCounterClockwise className="text-2xl" weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">Long-Term Rentals</h4>
              <p className="text-xs text-slate-500 dark:text-white/40 truncate">30-365 Day Dedicated Lines</p>
            </div>
          </Link>

          {/* Action 4: Reseller Developer API */}
          <Link href="/dashboard/api" className="col-span-1 sm:col-span-2 lg:col-span-2 row-span-1 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-slate-100/70 dark:bg-base hover:bg-slate-200/70 dark:hover:bg-white/5 transition-all p-5 flex items-center gap-4 group cursor-pointer shadow-sm dark:shadow-none">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
              <Code className="text-2xl" weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="truncate">Developer API</span>
                <span className="text-[9px] bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider shrink-0">cURL</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-white/40 truncate">Automated Reseller REST API</p>
            </div>
          </Link>

          {/* Action 5: Affiliate Program */}
          <Link href="/dashboard/affiliates" className="col-span-1 sm:col-span-2 lg:col-span-2 row-span-1 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-slate-100/70 dark:bg-base hover:bg-slate-200/70 dark:hover:bg-white/5 transition-all p-5 flex items-center gap-4 group cursor-pointer shadow-sm dark:shadow-none">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
              <Gift className="text-2xl" weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="truncate">Affiliate Program</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider shrink-0">EARN</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-white/40 truncate">Earn rewards for referrals</p>
            </div>
          </Link>

          {/* Action 6: Support / Help */}
          <Link href="/dashboard/support" className="col-span-1 sm:col-span-2 lg:col-span-2 row-span-1 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-gradient-to-r from-slate-100 to-white dark:from-surface dark:to-base hover:from-slate-200 hover:to-slate-100 dark:hover:from-surface-hover dark:hover:to-surface transition-all p-5 flex items-center justify-between group cursor-pointer shadow-sm dark:shadow-none">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <Lifebuoy className="text-2xl" weight="duotone" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Need Help?</h4>
                <p className="text-xs text-slate-500 dark:text-white/40">24/7 dedicated support</p>
              </div>
            </div>
            <CaretRight className="text-slate-400 dark:text-white/20 group-hover:text-slate-600 dark:group-hover:text-white/60 transition-colors shrink-0" />
          </Link>

        </div>
      </motion.section>

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
