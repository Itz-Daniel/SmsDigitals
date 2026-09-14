"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClockCounterClockwise, 
  ArrowsLeftRight, 
  CreditCard, 
  Gift, 
  Lifebuoy, 
  CaretLeft,
  CaretRight, 
  CheckCircle, 
  Eye, 
  EyeSlash, 
  Code, 
  Globe, 
  Receipt, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus 
} from "@phosphor-icons/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/components/CurrencyContext";

const QuickFund = dynamic(() => import("@/components/dashboard/QuickFund"), {
  ssr: false,
});
import ConvertModal from "@/components/dashboard/ConvertModal";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  description?: string;
  created_at: string;
}

export default function DashboardPage() {
  const { currency, setCurrency, showBalance, toggleShowBalance } = useCurrency();
  const [profile, setProfile] = useState<{ full_name: string; email: string; created_at?: string } | null>(null);
  const [wallet, setWallet] = useState<{ balance_ngn: number; balance_usd: number; lifetime_deposits_usd: number; id: string } | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(1500);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // Services Rail Scroll Controls
  const servicesRailRef = useRef<HTMLDivElement>(null);
  const [hasScrolledServices, setHasScrolledServices] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkRailScroll = () => {
    if (servicesRailRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = servicesRailRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      if (scrollLeft > 15) {
        setHasScrolledServices(true);
      }
    }
  };

  const scrollServicesRail = (direction: "left" | "right") => {
    if (servicesRailRef.current) {
      setHasScrolledServices(true);
      const amount = direction === "left" ? -240 : 240;
      servicesRailRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, walletRes, settingsRes, txRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("wallets").select("balance_ngn, balance_usd, lifetime_deposits_usd, id").eq("user_id", user.id).single(),
        supabase.from("api_settings").select("exchange_rate").single(),
        supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4)
      ]);

      if (profileRes.data) {
        setProfile({ full_name: profileRes.data.full_name, email: user.email!, created_at: user.created_at });
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

      if (txRes.data) {
        setRecentTransactions(txRes.data as Transaction[]);
      }

      setLoading(false);

      // Check for Paystack redirect callback
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get("reference") || urlParams.get("trxref");
        const payment = urlParams.get("payment");

        if (ref && (payment === "success" || urlParams.has("trxref"))) {
          fetch("/api/fund/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: ref }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.success) {
                setSuccessMsg("Wallet funded successfully!");
                if (data.new_balance !== undefined) {
                  setWallet((prev) => prev ? { ...prev, balance_ngn: data.new_balance } : prev);
                }
                window.history.replaceState({}, "", window.location.pathname);
                setTimeout(() => setSuccessMsg(null), 5000);
              }
            })
            .catch((err) => console.error("Verify callback error:", err));
        }
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Initial check and resize monitoring for services rail
    checkRailScroll();
    window.addEventListener("resize", checkRailScroll);
    return () => window.removeEventListener("resize", checkRailScroll);
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
    return fullName.split(" ")[0];
  };

  const formatDate = () => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date());
    } catch {
      return "Today";
    }
  };

  const formatTxDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }).format(d);
    } catch {
      return "Recently";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 md:gap-8 pb-16 w-full max-w-6xl text-slate-900 dark:text-white font-sans animate-pulse">
        <div className="flex justify-between items-end pb-4 border-b border-slate-200/60 dark:border-white/5">
          <div className="flex flex-col gap-2">
            <div className="h-7 bg-slate-200 dark:bg-white/10 rounded-lg w-56"></div>
            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-md w-40"></div>
          </div>
          <div className="h-9 bg-slate-200 dark:bg-white/10 rounded-full w-28 hidden sm:block"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="h-56 bg-slate-100 dark:bg-white/5 rounded-3xl border border-slate-200/60 dark:border-white/5"></div>
            <div className="h-32 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5"></div>
            <div className="h-64 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5"></div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-5">
            <div className="h-44 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5"></div>
            <div className="h-36 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5"></div>
            <div className="h-28 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5"></div>
          </div>
        </div>
      </div>
    );
  }

  const services = [
    {
      id: "us",
      label: "USA Numbers",
      href: "/dashboard/sms/us",
      badge: "POPULAR",
      flag: "🇺🇸",
      isFlag: true,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
    },
    {
      id: "cana",
      label: "Canada",
      href: "/dashboard/sms/cana",
      flag: "🇨🇦",
      isFlag: true,
      color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
    },
    {
      id: "global",
      label: "All Countries",
      href: "/dashboard/sms/global",
      icon: Globe,
      isFlag: false,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    },
    {
      id: "long-term",
      label: "Long-Term",
      href: "/dashboard/sms/long-term",
      icon: ClockCounterClockwise,
      isFlag: false,
      color: "bg-brand-blue/10 text-brand-blue border-brand-blue/20"
    },
    {
      id: "fund",
      label: "Fund Wallet",
      href: "/dashboard/fund",
      icon: CreditCard,
      isFlag: false,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    },
    {
      id: "history",
      label: "History",
      href: "/dashboard/transactions",
      icon: Receipt,
      isFlag: false,
      color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
    },
    {
      id: "api",
      label: "Developer API",
      href: "/dashboard/api",
      icon: Code,
      isFlag: false,
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
    },
    {
      id: "referrals",
      label: "Referrals",
      href: "/dashboard/affiliates",
      icon: Gift,
      isFlag: false,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    },
    {
      id: "support",
      label: "Support",
      href: "/dashboard/support",
      icon: Lifebuoy,
      isFlag: false,
      color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
    }
  ];

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-24 md:pb-32 w-full max-w-6xl text-slate-900 dark:text-white font-sans overflow-x-hidden">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Welcome back, {getFirstName(profile?.full_name || null)} <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/40 mt-1 font-medium">{formatDate()}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            #{wallet?.id ? wallet.id.substring(0, 6).toUpperCase() : "4162"}
          </span>

          <Link
            href="/dashboard/fund"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-blue hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-sm shadow-brand-blue/25 transition-all"
          >
            <Plus size={14} weight="bold" />
            <span>Add money</span>
          </Link>
        </div>
      </div>

      {/* ── New User Welcome & Device Bookmark Banner ───────── */}
      <WelcomeBanner userCreatedAt={profile?.created_at} />

      {/* ── Dashboard Grid (Desktop 2-Col / Mobile Linear Stack) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Wallet, Country/Services Slider, Recent Activity */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* 1. Main Wallet Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/40 p-6 md:p-8 flex flex-col justify-between gap-6 relative overflow-hidden shadow-sm dark:shadow-none"
          >
            {/* Top row: Label + Currency Switcher */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-white/40">
                  Wallet balance
                </span>
                <button
                  onClick={toggleShowBalance}
                  className="text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white transition-colors p-1"
                  title={showBalance ? "Hide Balance" : "Show Balance"}
                >
                  {showBalance ? <Eye size={17} /> : <EyeSlash size={17} />}
                </button>
              </div>

              {/* Currency Switcher Pills */}
              <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/10">
                <button
                  onClick={() => setCurrency('NGN')}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${currency === 'NGN' ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/40'}`}
                >
                  NGN
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${currency === 'USD' ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/40'}`}
                >
                  USD
                </button>
              </div>
            </div>

            {/* Middle: Big Balance Figure */}
            <div className="flex flex-col gap-1.5">
              <AnimatePresence mode="wait">
                {currency === 'NGN' ? (
                  <motion.div
                    key="bal-ngn"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums flex items-baseline gap-1"
                  >
                    <span className="text-slate-400 dark:text-white/40 font-normal">₦</span>
                    <span>{showBalance ? wallet?.balance_ngn.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="bal-usd"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums flex items-baseline gap-1"
                  >
                    <span className="text-slate-400 dark:text-white/40 font-normal">$</span>
                    <span>{showBalance ? wallet?.balance_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="text-xs text-slate-500 dark:text-white/40 font-medium">
                <span>Available to spend</span>
                <span className="mx-1.5 opacity-50">·</span>
                <span>Shown at $1 = ₦{exchangeRate.toLocaleString()}</span>
              </div>
            </div>

            {/* Bottom: Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <AnimatePresence mode="wait">
                {currency === 'NGN' ? (
                  <div key="act-ngn" className="w-full sm:w-auto">
                    {profile && (
                      <QuickFund
                        email={profile.email}
                        publicKey={publicKey}
                        onSuccessPayment={handleSuccessfulPayment}
                      />
                    )}
                  </div>
                ) : (
                  <div key="act-usd" className="w-full sm:w-auto">
                    <button
                      onClick={() => setIsConvertModalOpen(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-blue text-white text-xs sm:text-sm font-bold tracking-wide hover:bg-blue-600 active:scale-95 transition-all shadow-sm shadow-brand-blue/20"
                    >
                      <ArrowsLeftRight weight="bold" size={16} />
                      Convert to USD
                    </button>
                  </div>
                )}
              </AnimatePresence>

              <Link
                href="/dashboard/transactions"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white text-xs sm:text-sm font-bold tracking-wide active:scale-95 transition-all"
              >
                <ClockCounterClockwise weight="bold" size={16} />
                History
              </Link>
            </div>

            {successMsg && (
              <p className="text-emerald-500 text-xs font-bold flex items-center gap-1 mt-1">
                <CheckCircle weight="fill" size={14} /> {successMsg}
              </p>
            )}
          </motion.div>

          {/* 2. Centered Country & Services Slider (Mobile Peek Rail + Desktop Grid) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                  Services & Numbers
                </span>
                {!hasScrolledServices && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-blue bg-blue-500/10 border border-brand-blue/25 px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                    <span>Swipe / Scroll</span>
                    <CaretRight size={10} weight="bold" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-400 dark:text-white/30 hidden sm:inline mr-2">
                  Instant virtual lines
                </span>
                {/* Scroll left button */}
                <button
                  type="button"
                  onClick={() => scrollServicesRail("left")}
                  disabled={!canScrollLeft}
                  aria-label="Scroll services left"
                  title="Scroll left"
                  className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all ${
                    canScrollLeft
                      ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white active:scale-90 shadow-xs cursor-pointer'
                      : 'border-slate-100 dark:border-white/5 bg-transparent text-slate-300 dark:text-white/20 cursor-not-allowed opacity-40'
                  }`}
                >
                  <CaretLeft size={13} weight="bold" />
                </button>
                {/* Scroll right button */}
                <button
                  type="button"
                  onClick={() => scrollServicesRail("right")}
                  disabled={!canScrollRight}
                  aria-label="Scroll services right"
                  title="Scroll right"
                  className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all ${
                    canScrollRight
                      ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white active:scale-90 shadow-xs cursor-pointer'
                      : 'border-slate-100 dark:border-white/5 bg-transparent text-slate-300 dark:text-white/20 cursor-not-allowed opacity-40'
                  }`}
                >
                  <CaretRight size={13} weight="bold" />
                </button>
              </div>
            </div>

            {/* Slider Container with Peek Effect on Mobile */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 p-3 sm:p-5 relative overflow-hidden">
              
              {/* Left Edge Gradient Fade */}
              {canScrollLeft && (
                <div className="absolute top-0 left-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-white dark:from-[#0F172A] to-transparent pointer-events-none z-10 transition-opacity duration-300"></div>
              )}

              {/* Right Edge Gradient Fade */}
              {canScrollRight && (
                <div className="absolute top-0 right-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-white dark:from-[#0F172A] to-transparent pointer-events-none z-10 transition-opacity duration-300"></div>
              )}

              {/* Horizontal Scroll Rail */}
              <div 
                ref={servicesRailRef}
                onScroll={checkRailScroll}
                className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1 pt-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1 select-none touch-pan-x"
              >
                {services.map((svc) => {
                  const Icon = svc.icon;
                  return (
                    <Link
                      key={svc.id}
                      href={svc.href}
                      className="group/svc shrink-0 flex-1 min-w-[76px] sm:min-w-[84px] max-w-[94px] snap-start flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all relative select-none [-webkit-tap-highlight-color:transparent]"
                    >
                      {/* Icon / Flag Box */}
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl relative transition-transform duration-200 group-hover/svc:-translate-y-0.5 shadow-sm dark:shadow-none ${svc.color}`}>
                        {svc.isFlag ? (
                          <span className="text-2xl leading-none select-none">{svc.flag}</span>
                        ) : (
                          Icon && <Icon size={22} weight="duotone" />
                        )}

                        {svc.badge && (
                          <span className="absolute -top-1.5 -right-1 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-sm pointer-events-none">
                            {svc.badge}
                          </span>
                        )}
                      </div>

                      {/* Label */}
                      <span className="text-[11px] font-semibold text-center leading-tight text-slate-700 dark:text-white/70 group-hover/svc:text-brand-blue dark:group-hover/svc:text-white transition-colors truncate w-full select-none">
                        {svc.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Recent Activity List (Rules, Not Heavy Cards) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                Recent activity
              </span>
              <Link 
                href="/dashboard/transactions" 
                className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-0.5"
              >
                See all <CaretRight size={12} weight="bold" />
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 overflow-hidden">
              {recentTransactions && recentTransactions.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {recentTransactions.map((tx) => {
                    const isCredit = tx.type?.toLowerCase().includes("fund") || 
                                     tx.type?.toLowerCase().includes("deposit") ||
                                     tx.type?.toLowerCase().includes("credit") ||
                                     tx.type?.toLowerCase().includes("voucher");

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60'}`}>
                            {isCredit ? <ArrowDownLeft size={16} weight="bold" /> : <ArrowUpRight size={16} weight="bold" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {isCredit ? "Wallet Funding" : (tx.description || tx.type || "Number Purchase")}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-white/40 truncate font-mono">
                              {tx.reference ? tx.reference.slice(-10).toUpperCase() : "Direct transaction"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-3">
                          <p className={`text-xs sm:text-sm font-bold font-mono tabular-nums ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                            {isCredit ? "+" : "−"}{tx.currency === "NGN" ? "₦" : "$"}{Number(tx.amount || 0).toLocaleString(tx.currency === "NGN" ? "en-NG" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-white/30">
                            {formatTxDate(tx.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-white/40">
                  <Receipt size={32} weight="light" className="opacity-40" />
                  <p className="text-xs font-semibold">No recent activity yet</p>
                  <Link
                    href="/dashboard/sms/us"
                    className="text-xs text-brand-blue font-bold hover:underline mt-1"
                  >
                    Rent your first virtual number →
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column / Rail: VIP Tier, Referrals, Support */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          {/* 1. Account Level / VIP Loyalty Status */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 p-6 flex flex-col justify-between gap-5 relative overflow-hidden shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                Account level
              </span>
              {wallet && wallet.lifetime_deposits_usd >= 500 ? (
                <span className="bg-amber-500/10 text-amber-600 dark:bg-yellow-500/20 dark:text-yellow-400 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border border-amber-500/20">
                  GOLD (12% OFF)
                </span>
              ) : wallet && wallet.lifetime_deposits_usd >= 150 ? (
                <span className="bg-slate-200 text-slate-700 dark:bg-slate-300/20 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border border-slate-300/30">
                  SILVER (7% OFF)
                </span>
              ) : wallet && wallet.lifetime_deposits_usd >= 50 ? (
                <span className="bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border border-orange-500/20">
                  BRONZE (3% OFF)
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  STANDARD
                </span>
              )}
            </div>

            <div>
              <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
                {currency === 'NGN' ? '₦' : '$'}
                {wallet?.lifetime_deposits_usd ? (currency === 'NGN' ? wallet.lifetime_deposits_usd * exchangeRate : wallet.lifetime_deposits_usd).toLocaleString(currency === 'NGN' ? 'en-NG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Total Lifetime Deposits</p>
            </div>

            <div>
              {wallet && wallet.lifetime_deposits_usd >= 500 ? (
                <p className="text-xs font-semibold text-amber-600 dark:text-yellow-400">
                  Highest tier unlocked! 12% discount active on all numbers.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-white/40 font-medium">
                    <span>Next Tier Target</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-white/80">
                      {currency === 'NGN' ? '₦' : '$'}{((wallet && wallet.lifetime_deposits_usd >= 150 ? 500 : wallet && wallet.lifetime_deposits_usd >= 50 ? 150 : 50) * (currency === 'NGN' ? exchangeRate : 1)).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-blue rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, ((wallet?.lifetime_deposits_usd || 0) / (wallet && wallet.lifetime_deposits_usd >= 150 ? 500 : wallet && wallet.lifetime_deposits_usd >= 50 ? 150 : 50)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Earn From Referrals Card */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 p-6 flex flex-col justify-between gap-4 shadow-sm dark:shadow-none relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Gift size={20} weight="duotone" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Earn from referrals</h4>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-1 leading-relaxed">
                Invite friends or clients and earn instant cashback commissions every time they fund and transact.
              </p>
            </div>

            <Link
              href="/dashboard/affiliates"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white text-xs font-bold tracking-wide transition-all"
            >
              <span>Share your link</span>
              <CaretRight size={12} weight="bold" />
            </Link>
          </div>

          {/* 3. Need Help Support Box */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 p-5 flex items-center justify-between gap-3 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                <Lifebuoy size={20} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">Need help?</h4>
                <p className="text-[11px] text-slate-500 dark:text-white/40 truncate">We reply around the clock</p>
              </div>
            </div>

            <Link
              href="/dashboard/support"
              className="shrink-0 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white text-xs font-bold transition-all"
            >
              Contact
            </Link>
          </div>

        </div>

      </div>

      {/* Currency Convert Modal */}
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
