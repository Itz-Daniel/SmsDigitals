"use client";

import { motion } from "motion/react";
import {
  Lightning,
  CreditCard,
  CellSignalFull,
  ChatCircleDots,
  Wallet,
  ArrowsLeftRight,
} from "@phosphor-icons/react";

const features = [
  {
    icon: CreditCard,
    title: "Virtual Cards",
    desc: "Instant Mastercards for global online payments.",
  },
  {
    icon: CellSignalFull,
    title: "Airtime & Data",
    desc: "All Nigerian networks at the best rates, 24/7.",
  },
  {
    icon: ChatCircleDots,
    title: "SMS Verification",
    desc: "Receive OTPs from any country, instantly.",
  },
  {
    icon: ArrowsLeftRight,
    title: "Currency Convert",
    desc: "Swap between NGN and USD in one click.",
  },
];

const stats = [
  { value: "200+", label: "Countries" },
  { value: "10K+", label: "Users" },
  { value: "24/7", label: "Support" },
];

interface AuthSidebarProps {
  headline: string;
  headlineAccent: string;
  subtitle: string;
  tagline: string;
}

export function AuthSidebar({
  headline,
  headlineAccent,
  subtitle,
  tagline,
}: AuthSidebarProps) {
  return (
    <section className="hidden lg:flex w-full lg:w-[52%] flex-col relative overflow-hidden bg-gradient-to-br from-[#020B18] via-[#06142A] to-[#030D1C] min-h-screen">
      {/* Ambient glow layers */}
      <div className="absolute top-[-30%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-brand-blue/8 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
      
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 flex flex-col justify-between h-full px-12 xl:px-16 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 1, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center shadow-[0_0_20px_rgba(0,112,243,0.3)]">
            <Lightning size={16} weight="fill" className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            SmsDigitals
          </span>
        </motion.div>

        {/* Hero copy */}
        <motion.div
          initial={{ opacity: 1, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="flex flex-col gap-5 mt-16"
        >
          <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-brand-blue">
            {tagline}
          </span>
          <h1 className="text-[clamp(2.5rem,3.8vw,4rem)] font-bold tracking-tight leading-[1.05] text-white">
            {headline}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              {headlineAccent}
            </span>
          </h1>
          <p className="max-w-[380px] text-[15px] text-white/45 leading-relaxed font-light">
            {subtitle}
          </p>
        </motion.div>

        {/* Floating wallet card */}
        <motion.div
          initial={{ opacity: 1, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-10 w-full max-w-[400px]"
        >
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 relative overflow-hidden">
            {/* Card inner glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-[60px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                  <span className="text-[10px] font-medium tracking-widest uppercase text-white/40">
                    Live
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Wallet size={14} className="text-white/30" />
                </div>
              </div>
              <div className="text-[10px] font-medium tracking-widest uppercase text-white/40 mb-1.5">
                Wallet Balance
              </div>
              <div className="text-3xl font-bold tracking-tight text-white flex items-baseline gap-1.5">
                <span className="text-white/40 text-lg font-mono">₦</span>
                44,500.00
              </div>
              <div className="text-[11px] text-white/30 mt-1 font-mono">
                Available · Just now
              </div>
              <div className="flex gap-2 mt-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-white/5 border border-white/10 text-white/60">
                  NGN
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-white/[0.02] border border-white/5 text-white/30">
                  USD
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature list */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 flex flex-col gap-2.5"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 1, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.55 + i * 0.08 }}
              className="group flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-default"
            >
              <div className="w-9 h-9 rounded-lg bg-brand-blue/10 border border-brand-blue/15 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-blue/15 transition-colors">
                <f.icon
                  size={18}
                  weight="duotone"
                  className="text-brand-blue"
                />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors">
                  {f.title}
                </div>
                <div className="text-[11px] text-white/35 leading-relaxed">
                  {f.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats footer */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-auto pt-8 flex gap-10"
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-brand-blue">
                {s.value}
              </span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-white/30 mt-0.5">
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
