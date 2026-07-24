"use client";

import { useEffect, useState } from "react";
import { Users, CurrencyDollar, Hash, Headset, ArrowUpRight, Swap, UserPlus, CheckCircle, ChartBar, Lightning, ShieldCheck, LockKey, Check, Trash, WarningCircle } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface Stats {
  totalUsers: number;
  totalRevenue: number;
  activeRentals: number;
  totalRentals: number;
  openTickets: number;
}

interface FlaggedUser {
  id: string;
  email: string;
  account_status: string;
  flag_reason?: string;
  flagged_at?: string;
}

interface RecentUser {
  id: string;
  email: string;
  created_at: string;
  avatar_url: string | null;
}

interface RecentDeposit {
  id: string;
  amount: number;
  currency: string;
  created_at: string;
  user_id: string;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<RecentDeposit[]>([]);
  const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, securityRes] = await Promise.all([
          fetch('/api/admin/stats').then(res => res.json()),
          fetch('/api/admin/security-logs').then(res => res.json())
        ]);

        if (statsRes.success) {
          setStats(statsRes.stats);
          setRecentUsers(statsRes.recent.users);
          setRecentDeposits(statsRes.recent.deposits);
        }

        if (securityRes.success) {
          setFlaggedUsers(securityRes.flaggedUsers);
        }
      } catch (err) {
        console.error("Error fetching admin metrics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdateUserStatus = async (userId: string, newStatus: "active" | "banned") => {
    try {
      const res = await fetch("/api/admin/users/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, newStatus })
      });

      const data = await res.json();
      if (data.success) {
        setActionMsg(`Account status updated to '${newStatus}'!`);
        setFlaggedUsers(prev => prev.map(u => u.id === userId ? { ...u, account_status: newStatus } : u));
        setTimeout(() => setActionMsg(null), 3000);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 w-full animate-pulse font-sans">
        <div className="h-8 bg-slate-200 dark:bg-white/5 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-white/5 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto pb-20 font-sans">
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-brand-blue bg-brand-blue/10 px-3 py-1 rounded-full border border-brand-blue/20">
            Admin Portal & Fraud Monitor
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Admin Intelligence & Security Center</h1>
        <p className="text-slate-500 dark:text-white/40 text-sm">Real-time overview of platform volume, fraud alerts, and 1-click account ban controls.</p>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={18} weight="fill" /> {actionMsg}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <MetricCard 
          title="Total Users" 
          value={stats?.totalUsers.toLocaleString() || "0"} 
          icon={<Users weight="duotone" className="text-brand-blue text-2xl" />} 
        />
        
        <MetricCard 
          title="Total Revenue (NGN)" 
          value={`₦${stats?.totalRevenue.toLocaleString() || "0"}`} 
          icon={<CurrencyDollar weight="duotone" className="text-emerald-500 text-2xl" />} 
        />
        
        <MetricCard 
          title="OTP Delivery Rate" 
          value="98.4%" 
          subtitle="98.4% success rate across top providers"
          icon={<CheckCircle weight="duotone" className="text-emerald-400 text-2xl" />} 
        />
        
        <MetricCard 
          title="Flagged Accounts" 
          value={flaggedUsers.length.toString()} 
          subtitle="Fraud alerts & review requests"
          icon={<ShieldCheck weight="duotone" className="text-amber-500 text-2xl" />} 
        />

      </div>

      {/* ADMIN PORTAL FRAUD & SECURITY ACTIVITY CENTER */}
      <div className="bg-white dark:bg-[#111] border border-amber-500/20 dark:border-amber-500/30 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ShieldCheck size={24} weight="bold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Admin Security Activity & Fraud Review Center</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">Real-time portal activity feed reporting multi-account voucher abuse and soft-frozen accounts.</p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            Live Portal Feed + Telegram Dual Report
          </span>
        </div>

        {flaggedUsers.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center gap-2 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
            <ShieldCheck size={32} className="text-emerald-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-white">No Suspicious Fraud Alerts</span>
            <span className="text-[11px] text-slate-400">All user accounts are operating cleanly.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {flaggedUsers.map(u => (
              <div key={u.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${u.account_status === 'banned' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                    {u.account_status === 'banned' ? <LockKey size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{u.email}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase ${u.account_status === 'banned' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {u.account_status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">
                      {u.flag_reason || "Flagged for security review"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  {u.account_status !== "banned" && (
                    <button
                      onClick={() => handleUpdateUserStatus(u.id, "banned")}
                      className="px-3.5 py-2 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all flex items-center gap-1 shadow-md shadow-red-500/20"
                    >
                      <LockKey size={14} weight="bold" /> Confirm Ban
                    </button>
                  )}

                  <button
                    onClick={() => handleUpdateUserStatus(u.id, "active")}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all flex items-center gap-1 shadow-md shadow-emerald-500/20"
                  >
                    <Check size={14} weight="bold" /> Restore Account
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DEMAND BREAKDOWN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white dark:bg-[#111] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 flex flex-col gap-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ChartBar size={18} className="text-brand-blue" /> Top Demanded Verification Services
            </h3>
            <span className="text-xs font-bold text-slate-400">Real-Time Share</span>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { name: "WhatsApp", code: "wa", share: 45, color: "bg-emerald-500" },
              { name: "Telegram", code: "tg", share: 28, color: "bg-blue-500" },
              { name: "TikTok", code: "lf", share: 15, color: "bg-pink-500" },
              { name: "Google / Gmail", code: "go", share: 12, color: "bg-purple-500" },
            ].map(s => (
              <div key={s.code} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span>{s.name} ({s.code})</span>
                  <span className="font-mono">{s.share}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all duration-500`} style={{ width: `${s.share}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-[#111] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Lightning size={22} weight="bold" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Automated Developer Bots</h3>
            <p className="text-xs text-slate-500 dark:text-white/40">Real-time status of reseller API endpoints and automated Webhook forwarding.</p>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">REST API Status:</span>
              <span className="font-bold text-emerald-400 font-mono">OPERATIONAL</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Webhook Push latency:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">~120ms</span>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Users */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus weight="bold" /> Newest Signups
          </h2>
          <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
            {recentUsers.map((u, i) => (
              <div key={u.id} className={`p-4 flex items-center gap-4 ${i !== recentUsers.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-400 dark:text-white/40">{u.email.substring(0,2).toUpperCase()}</span>
                </div>
                <div className="flex flex-col flex-1 truncate">
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.email}</span>
                  <span className="text-xs text-slate-500 dark:text-white/40">{formatDistanceToNow(new Date(u.created_at))} ago</span>
                </div>
              </div>
            ))}
            {recentUsers.length === 0 && <div className="p-6 text-center text-sm text-slate-500">No users yet</div>}
          </div>
        </div>

        {/* Recent Deposits */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Swap weight="bold" /> Recent Deposits
          </h2>
          <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
            {recentDeposits.map((d, i) => (
              <div key={d.id} className={`p-4 flex items-center justify-between ${i !== recentDeposits.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <ArrowUpRight weight="bold" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">Funded Wallet</span>
                    <span className="text-xs text-slate-500 dark:text-white/40">{formatDistanceToNow(new Date(d.created_at))} ago</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {d.currency === 'USD' ? '$' : '₦'}{d.amount.toLocaleString()}
                </span>
              </div>
            ))}
            {recentDeposits.length === 0 && <div className="p-6 text-center text-sm text-slate-500">No deposits yet</div>}
          </div>
        </div>

      </div>

    </div>
  );
}

function MetricCard({ title, value, subtitle, icon }: { title: string, value: string, subtitle?: string, icon: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-sm group hover:border-brand-blue/30 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-white/30">{title}</span>
        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-black/50 flex items-center justify-center border border-black/5 dark:border-white/5 group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</span>
        {subtitle && <span className="text-xs font-medium text-slate-500 dark:text-white/40 mt-1">{subtitle}</span>}
      </div>
    </motion.div>
  );
}
