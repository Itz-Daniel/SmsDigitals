"use client";

import { motion } from "motion/react";
import { Hash, MapPin, AppWindow, ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";

export default function SMSDashboardPage() {
  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 transition-colors duration-500">
      <div className="max-w-6xl mx-auto flex flex-col relative">
        
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/10 blur-[150px] rounded-full pointer-events-none"></div>

        {/* STEP 1: SERVER SELECTION HUB */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex flex-col gap-6 w-full max-w-4xl mx-auto mt-8 z-10"
        >
          <div className="flex flex-col gap-2 mb-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">SMS Verification</h1>
            <p className="text-slate-500 dark:text-white/40">Choose a server that matches your country</p>
          </div>

          {/* SERVER 1 */}
          <Link 
            href="/dashboard/sms/cana"
            className="group text-left p-4 md:p-6 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 hover:bg-brand-blue/10 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start md:items-center gap-4 md:gap-6">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20 shrink-0 group-hover:scale-105 transition-transform">
                <Hash weight="bold" size={24} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">Server 1</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded-full border border-brand-blue/20 dark:border-brand-blue/30 whitespace-nowrap">
                    🇺🇸 USA / 🇨🇦 Canada
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-600 dark:text-white/50">US and Canadian numbers with area code selection for major platform verifications.</p>
              </div>
            </div>
            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 md:ml-4 w-full md:w-auto pt-3 md:pt-0 border-t border-brand-blue/10 md:border-t-0">
              <div className="flex flex-col md:items-end">
                <span className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest hidden md:block">Coverage</span>
                <span className="text-sm font-bold text-left md:text-center text-slate-900 dark:text-white">USA & Canada</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue mt-0 md:mt-1 shrink-0">
                <ArrowRight weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* SERVER 2 */}
          <Link 
            href="/dashboard/sms/us"
            className="group text-left p-4 md:p-6 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 hover:bg-brand-blue/10 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start md:items-center gap-4 md:gap-6">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20 shrink-0 group-hover:scale-105 transition-transform">
                <MapPin weight="bold" size={24} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">Server 2</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded-full border border-brand-blue/20 dark:border-brand-blue/30 whitespace-nowrap">
                    🇺🇸 USA Only
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-600 dark:text-white/50">Dedicated USA server with state filtering and expanded number pools.</p>
              </div>
            </div>
            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 md:ml-4 w-full md:w-auto pt-3 md:pt-0 border-t border-brand-blue/10 md:border-t-0">
              <div className="flex flex-col md:items-end">
                <span className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest hidden md:block">Coverage</span>
                <span className="text-sm font-bold text-left md:text-center mt-0 md:mt-2 text-slate-900 dark:text-white">USA Only</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue mt-0 md:mt-1 shrink-0">
                <ArrowRight weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* SERVER 3 */}
          <Link 
            href="/dashboard/sms/global"
            className="group text-left p-4 md:p-6 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 hover:bg-brand-blue/10 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start md:items-center gap-4 md:gap-6">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20 shrink-0 group-hover:scale-105 transition-transform">
                <AppWindow weight="bold" size={24} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">Server 3</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded-full border border-brand-blue/20 dark:border-brand-blue/30 whitespace-nowrap">
                    🌍 All Countries
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-600 dark:text-white/50">Worldwide coverage from 100+ countries for international SMS verification.</p>
              </div>
            </div>
            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 md:ml-4 w-full md:w-auto pt-3 md:pt-0 border-t border-brand-blue/10 md:border-t-0">
              <div className="flex flex-col md:items-end">
                <span className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest hidden md:block">Coverage</span>
                <span className="text-sm font-bold text-left md:text-center mt-0 md:mt-2 text-slate-900 dark:text-white">100+ Countries</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue mt-0 md:mt-1 shrink-0">
                <ArrowRight weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* QUICK GUIDE */}
          <div className="mt-8 p-6 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 flex flex-col gap-4 shadow-sm dark:shadow-none">
            <h4 className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Quick Guide</h4>
            <div className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center text-xs font-bold">1</span>
                <span className="text-sm font-medium text-slate-700 dark:text-white">USA & Canada numbers</span>
              </div>
              <span className="text-xs text-brand-blue border border-brand-blue/20 dark:border-brand-blue/30 bg-brand-blue/5 dark:bg-brand-blue/10 px-2 py-1 rounded">Server 1</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center text-xs font-bold">2</span>
                <span className="text-sm font-medium text-slate-700 dark:text-white">USA numbers only</span>
              </div>
              <span className="text-xs text-brand-blue border border-brand-blue/20 dark:border-brand-blue/30 bg-brand-blue/5 dark:bg-brand-blue/10 px-2 py-1 rounded">Server 2</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center text-xs font-bold">3</span>
                <span className="text-sm font-medium text-slate-700 dark:text-white">Global numbers (44+ countries)</span>
              </div>
              <span className="text-xs text-brand-blue border border-brand-blue/20 dark:border-brand-blue/30 bg-brand-blue/5 dark:bg-brand-blue/10 px-2 py-1 rounded">Server 3</span>
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
