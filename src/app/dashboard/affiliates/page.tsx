"use client";

import { useEffect, useState } from "react";
import { 
  UsersThree, 
  Copy, 
  ShareNetwork, 
  ChartLineUp, 
  CurrencyDollar, 
  Check, 
  Wallet, 
  Sparkle, 
  ClockCounterClockwise,
  CheckCircle,
  PaperPlaneTilt
} from "@phosphor-icons/react";
import { useCurrency } from "@/components/CurrencyContext";

interface RecentReferral {
  id: string;
  name: string;
  createdAt: string;
}

interface RecentCommission {
  id: string;
  amountNgn: number;
  createdAt: string;
  description: string;
}

export default function AffiliatesPage() {
  const { currency, exchangeRate } = useCurrency();
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [percentage, setPercentage] = useState(5.0);
  const [totalEarningsNgn, setTotalEarningsNgn] = useState(0);
  const [activeReferralsCount, setActiveReferralsCount] = useState(0);
  const [recentReferrals, setRecentReferrals] = useState<RecentReferral[]>([]);
  const [recentCommissions, setRecentCommissions] = useState<RecentCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/affiliates/stats");
        const data = await res.json();

        if (data.success) {
          setReferralCode(data.referralCode);
          setReferralLink(data.referralLink);
          setPercentage(data.percentage || 5.0);
          setTotalEarningsNgn(data.totalEarningsNgn || 0);
          setActiveReferralsCount(data.activeReferralsCount || 0);
          setRecentReferrals(data.recentReferrals || []);
          setRecentCommissions(data.recentCommissions || []);
        }
      } catch (err) {
        console.error("Failed to load affiliate stats:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatEarnings = (amountNgn: number) => {
    if (currency === "USD") {
      const usdVal = amountNgn / (exchangeRate || 1500);
      return `$${usdVal.toFixed(2)} USD`;
    }
    return `₦${amountNgn.toLocaleString()} NGN`;
  };

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-16 animate-fade-in font-sans">
      
      {/* ── Banner ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 dark:bg-[#111111] p-8 sm:p-10 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800 dark:border-white/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/20 text-brand-blue border border-brand-blue/30 text-xs font-bold font-mono uppercase">
            <Sparkle size={14} weight="fill" /> Lifetime Referral Program
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <UsersThree size={38} className="text-brand-blue" weight="duotone" />
            Affiliate Partner Program
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
            Invite colleagues, friends, or clients and earn <strong className="text-emerald-400 font-bold">{percentage}% instant cashback</strong> on every wallet deposit they make — forever. Commissions are automatically credited to your master wallet balance.
          </p>
        </div>
      </div>

      {/* ── Metrics Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Earnings Card */}
        <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <CurrencyDollar size={26} weight="bold" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              Total Affiliate Earnings
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {formatEarnings(totalEarningsNgn)}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle size={14} weight="fill" />
            <span>Instantly usable for virtual numbers</span>
          </div>
        </div>

        {/* Active Referrals Card */}
        <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mb-4">
              <ChartLineUp size={26} weight="bold" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              Referred Customers
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {activeReferralsCount}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Permanently bound to your account</span>
          </div>
        </div>

        {/* Commission Rate Card */}
        <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <Wallet size={26} weight="bold" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              Commission Rate
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {percentage}%
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Applies across Paystack, Card & Crypto</span>
          </div>
        </div>

      </div>

      {/* ── Referral Link Generator & Sharer ────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <ShareNetwork size={22} className="text-brand-blue" /> Your Unique Referral Link
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            Share this link via messaging apps, blogs, or social media. When someone registers through your link, our system permanently links them to you and pays you {percentage}% on all their future wallet deposits.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center bg-slate-50 dark:bg-black/50 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3.5 overflow-hidden focus-within:border-brand-blue transition-all">
            <input 
              type="text" 
              readOnly 
              value={referralLink}
              className="bg-transparent border-none outline-none text-slate-900 dark:text-white font-mono text-xs sm:text-sm font-bold w-full truncate select-all"
            />
          </div>
          
          <button 
            onClick={handleCopy}
            className={`px-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 shrink-0 ${
              copied 
                ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" 
                : "bg-brand-blue hover:bg-blue-600 shadow-brand-blue/20"
            }`}
          >
            {copied ? <Check size={18} weight="bold" /> : <Copy size={18} weight="bold" />}
            <span>{copied ? "Link Copied!" : "Copy Link"}</span>
          </button>
        </div>

        {/* Quick Social Share Buttons */}
        <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
          <span className="text-slate-400 font-semibold mr-1">Share via:</span>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Get instant virtual numbers for WhatsApp, Telegram & Google verification on SmsDigitals: ${referralLink}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold transition-all border border-emerald-500/20 flex items-center gap-1.5"
          >
            <PaperPlaneTilt size={14} weight="bold" /> WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(`Get instant virtual numbers on SmsDigitals:`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold transition-all border border-blue-500/20 flex items-center gap-1.5"
          >
            <PaperPlaneTilt size={14} weight="bold" /> Telegram
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Receive SMS verifications instantly from 44+ countries with @SmsDigitals: ${referralLink}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white font-bold transition-all border border-slate-200/80 dark:border-white/10 flex items-center gap-1.5"
          >
            <ShareNetwork size={14} weight="bold" /> X (Twitter)
          </a>
        </div>
      </div>

      {/* ── Recent Commission History Table ─────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClockCounterClockwise size={20} className="text-brand-blue" />
            Recent Referral Commissions
          </h2>
          <span className="text-xs font-mono font-bold text-slate-400">
            {recentCommissions.length} recorded
          </span>
        </div>

        {recentCommissions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
              <CurrencyDollar size={28} />
            </div>
            <div className="max-w-sm space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">No commissions yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share your referral link above. When friends deposit funds, your commissions will appear right here and credit your wallet.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right">Commission Earned</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {recentCommissions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-3.5 text-slate-900 dark:text-white font-medium">
                      {c.description}
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      +{formatEarnings(c.amountNgn)}
                    </td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        <CheckCircle size={12} weight="fill" /> Credited
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
