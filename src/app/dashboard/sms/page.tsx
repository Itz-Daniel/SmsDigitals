"use client";

import { motion } from "framer-motion";
import { ArrowRight, ClockCounterClockwise } from "@phosphor-icons/react";
import Link from "next/link";
import { CountryFlag } from "@/components/CountryFlag";

export default function SMSDashboardPage() {
  const servers = [
    {
      id: "server-1",
      name: "Server 1",
      badge: "CANADA",
      coverage: "Canada",
      desc: "Instant virtual carrier lines for Canadian services with fast, automated routing.",
      href: "/dashboard/sms/cana",
      country: "canada",
      color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
    },
    {
      id: "server-2",
      name: "Server 2",
      badge: "USA DEDICATED",
      coverage: "USA Only",
      desc: "Dedicated physical SIM carrier lines for high-security US services like WhatsApp, Telegram, and banks.",
      href: "/dashboard/sms/us",
      country: "usa",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
    },
    {
      id: "server-3",
      name: "Server 3",
      badge: "100+ COUNTRIES",
      coverage: "Worldwide",
      desc: "Global coverage spanning UK, Nigeria, Germany, India, Brazil, and 100+ regions.",
      href: "/dashboard/sms/global",
      country: "global",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
    }
  ];

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-24 md:pb-32 w-full max-w-6xl text-slate-900 dark:text-white font-sans">
      
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <Link 
            href="/dashboard"
            className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-colors flex items-center gap-1 mb-1.5"
          >
            ← Back to Dashboard
          </Link>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            SMS Verification Servers
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/40 mt-1">
            Choose a dedicated server infrastructure that matches your desired country and platform.
          </p>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          All 3 Servers Operational
        </span>
      </div>

      {/* ── Server Cards Grid (Short-Term Servers 1, 2, 3) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {servers.map((srv, idx) => {
          return (
            <motion.div
              key={srv.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
            >
              <Link
                href={srv.href}
                className="group h-full rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 hover:bg-slate-50 dark:hover:bg-surface/60 transition-all p-6 flex flex-col justify-between gap-5 relative overflow-hidden shadow-sm dark:shadow-none hover:-translate-y-1"
              >
                {/* Top: Icon + Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform ${srv.color}`}>
                    <CountryFlag country={srv.country} size={28} />
                  </div>
                  <span className="text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 flex items-center gap-1.5">
                    <CountryFlag country={srv.country} size={13} />
                    <span>{srv.badge}</span>
                  </span>
                </div>

                {/* Middle: Details */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors flex items-center gap-1.5">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-1 leading-relaxed">
                    {srv.desc}
                  </p>
                </div>

                {/* Bottom: Action CTA */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-white/80 group-hover:text-brand-blue transition-colors">
                  <span>Enter Server</span>
                  <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/5 group-hover:bg-brand-blue group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight size={13} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* ── Long-Term Rentals Callout Banner ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-sm"
      >
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ClockCounterClockwise size={24} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                Extended Validity
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Looking for Long-Term Number Rentals?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60 max-w-xl">
              Keep exclusive, dedicated phone numbers active for days, weeks, or months with real-time SMS inbox monitoring and auto-renewal.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/sms/long-term"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 hover:scale-[1.02] shrink-0"
        >
          <span>Go to Long-Term Rentals</span>
          <ArrowRight size={14} weight="bold" />
        </Link>
      </motion.div>

      {/* ── Quick Guide Section ────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/40 px-1">
          Infrastructure Guide
        </span>

        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-4 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <CountryFlag country="canada" size={20} />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Canada Dedicated Numbers</p>
                <p className="text-[11px] text-slate-500 dark:text-white/40">Dedicated Canadian lines with fast fallback and high deliverability.</p>
              </div>
            </div>
            <Link
              href="/dashboard/sms/cana"
              className="text-xs font-bold text-brand-blue hover:underline shrink-0"
            >
              Use Server 1 →
            </Link>
          </div>

          <div className="flex items-center justify-between p-4 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <CountryFlag country="usa" size={20} />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">USA Dedicated Lines</p>
                <p className="text-[11px] text-slate-500 dark:text-white/40">Physical non-VoIP SIM infrastructure for WhatsApp, Telegram & banking.</p>
              </div>
            </div>
            <Link
              href="/dashboard/sms/us"
              className="text-xs font-bold text-brand-blue hover:underline shrink-0"
            >
              Use Server 2 →
            </Link>
          </div>

          <div className="flex items-center justify-between p-4 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <CountryFlag country="global" size={20} />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Global Numbers (100+ Countries)</p>
                <p className="text-[11px] text-slate-500 dark:text-white/40">International virtual numbers with instant OTP delivery worldwide.</p>
              </div>
            </div>
            <Link
              href="/dashboard/sms/global"
              className="text-xs font-bold text-brand-blue hover:underline shrink-0"
            >
              Use Server 3 →
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
