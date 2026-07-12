"use client";

import { useEffect, useState } from "react";
import { UsersThree, Copy, ShareNetwork, ChartLineUp, CurrencyDollar } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export default function AffiliatesPage() {
  const [profile, setProfile] = useState<any>(null);
  const [referredUsersCount, setReferredUsersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [percentage, setPercentage] = useState(5.0);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);

      // Get count of referred users
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', user.id);
        
      setReferredUsersCount(count || 0);

      // Get percentage from settings
      const { data: s } = await supabase.from('settings').select('affiliate_percentage').single();
      if (s?.affiliate_percentage) {
        setPercentage(s.affiliate_percentage);
      }

      setIsLoading(false);
    }
    loadData();
  }, [supabase]);

  const referralLink = profile?.referral_code 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${profile.referral_code}` 
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 dark:bg-[#111] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <UsersThree size={36} className="text-brand-blue" weight="duotone" />
            Affiliate Program
          </h1>
          <p className="text-slate-400 max-w-xl">
            Invite your friends and earn <span className="text-brand-blue font-bold">{percentage}%</span> of their deposits, forever. Your earnings are instantly credited to your wallet.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Earnings Card */}
        <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <CurrencyDollar size={24} className="text-emerald-500" weight="fill" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Earnings</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
              {profile?.preferred_currency === 'USD' ? '$' : '₦'}
              {Number(profile?.affiliate_earnings || 0).toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Referrals Card */}
        <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-4">
            <ChartLineUp size={24} className="text-brand-blue" weight="fill" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Active Referrals</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
              {referredUsersCount}
            </h3>
            <span className="text-sm font-medium text-slate-400">Users</span>
          </div>
        </div>
      </div>

      {/* Link Generator */}
      <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Your Referral Link</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-2xl">
          Share this link on your social media, blog, or with friends. When they sign up using this link, they will be permanently linked to your account.
        </p>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 overflow-hidden">
            <ShareNetwork size={20} className="text-slate-400 mr-3 flex-shrink-0" />
            <input 
              type="text" 
              readOnly 
              value={referralLink}
              className="bg-transparent border-none outline-none text-slate-900 dark:text-white font-medium w-full truncate"
            />
          </div>
          <button 
            onClick={handleCopy}
            className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-[0_4px_12px_rgba(0,112,243,0.3)] flex items-center justify-center gap-2 active:scale-95 ${copied ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.3)]' : 'bg-brand-blue hover:bg-brand-blue-hover'}`}
          >
            <Copy size={20} weight="bold" />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
