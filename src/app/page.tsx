"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { 
  ArrowRight,
  Sun,
  Moon,
  GlobeHemisphereWest,
  ShieldCheck,
  Lightning,
  Clock,
  CaretDown,
  ChatCircleDots,
  DeviceMobile,
  UserCirclePlus,
  Crosshair,
  CheckCircle,
  MapPin
} from "@phosphor-icons/react";

const customEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

const FEATURED_COUNTRIES = [
  { name: "United States", flag: "🇺🇸", numbers: "1,200+" },
  { name: "United Kingdom", flag: "🇬🇧", numbers: "850+" },
  { name: "Nigeria", flag: "🇳🇬", numbers: "600+" },
  { name: "Canada", flag: "🇨🇦", numbers: "500+" },
  { name: "Germany", flag: "🇩🇪", numbers: "400+" },
  { name: "India", flag: "🇮🇳", numbers: "900+" },
  { name: "France", flag: "🇫🇷", numbers: "350+" },
  { name: "Brazil", flag: "🇧🇷", numbers: "450+" },
];

const FAQ_ITEMS = [
  {
    q: "How does SmsDigitals work?",
    a: "SmsDigitals provides temporary virtual phone numbers from over 44 countries. You select a country and service (like WhatsApp, Telegram, or Google), we provision a real number, and the SMS verification code is delivered directly to your dashboard in seconds."
  },
  {
    q: "Are these real phone numbers?",
    a: "Yes. Our numbers are routed through real SIM infrastructure, not VoIP. This means they pass verification checks on platforms that block virtual or internet-based numbers, giving you the highest success rate available."
  },
  {
    q: "What services can I verify with?",
    a: "We support over 1,300 services including WhatsApp, Telegram, Instagram, TikTok, Discord, Google, Apple, Binance, PayPal, and many more. You can search for any service directly in the dashboard."
  },
  {
    q: "How fast will I receive my code?",
    a: "Most codes arrive within 10–60 seconds. Our system polls multiple wholesale providers in real-time and routes your request to the fastest available network. If a code isn't received within the timeout window, your purchase is automatically refunded."
  },
  {
    q: "What currencies do you accept?",
    a: "You can fund your wallet in Nigerian Naira (NGN) via Paystack and use your balance in either NGN or USD. We also support currency conversion directly within the dashboard at live market rates."
  },
  {
    q: "Is my data private?",
    a: "Absolutely. We do not store SMS codes after they are displayed to you. Your account is protected by Supabase authentication, and all wallet transactions are processed through secure, atomic database operations."
  }
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="w-full min-h-[100dvh] bg-white dark:bg-[#030303] text-slate-900 dark:text-white font-sans selection:bg-brand-blue/30 selection:text-brand-blue overflow-x-hidden transition-colors duration-500">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-[#030303]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/5 transition-all">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center text-white shadow-sm">
              <ChatCircleDots weight="fill" size={14} />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">SmsDigitals</span>
          </div>
          <div className="flex items-center gap-5">
            {mounted && (
              <button 
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                aria-label="Toggle Theme"
              >
                {resolvedTheme === 'dark' ? <Sun weight="bold" size={15} /> : <Moon weight="bold" size={15} />}
              </button>
            )}
            <Link href="/login" className="text-sm font-semibold text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/register" className="h-9 px-5 inline-flex items-center justify-center bg-brand-blue text-white text-sm font-bold rounded-full hover:bg-blue-600 transition-all shadow-sm hover:shadow-md hover:shadow-brand-blue/20 hover:-translate-y-px">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex flex-col relative z-10">
        
        {/* ===== HERO ===== */}
        <section className="relative w-full overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 inset-x-0 h-[700px] overflow-hidden pointer-events-none flex justify-center -z-10">
            <div className="absolute -top-[300px] w-[900px] h-[900px] bg-gradient-to-b from-brand-blue/[0.07] dark:from-brand-blue/[0.04] to-transparent rounded-full blur-[100px]" />
          </div>

          <div className="max-w-[1200px] mx-auto px-6 pt-32 pb-20 md:pt-40 md:pb-28 lg:pt-48 lg:pb-32">
            <motion.div
              initial={{ opacity: 1, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: customEase }}
              className="flex flex-col items-center text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blue/10 dark:bg-brand-blue/[0.08] border border-brand-blue/20 text-brand-blue text-xs font-bold tracking-widest uppercase mb-8">
                <GlobeHemisphereWest weight="fill" size={14} /> 44+ Countries Available
              </div>
              
              <h1 className="text-[2.75rem] md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight leading-[1.08] text-slate-900 dark:text-white mb-6">
                Receive SMS Verification
                <br />
                <span className="text-brand-blue">Instantly.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-500 dark:text-white/50 leading-relaxed max-w-xl mb-10 font-medium">
                Get temporary phone numbers from real SIM networks worldwide. Verify any account in seconds — privately and reliably.
              </p>

              <Link href="/register" className="h-14 px-10 inline-flex items-center justify-center gap-2.5 bg-brand-blue text-white text-base font-bold rounded-full transition-all hover:bg-blue-600 shadow-xl shadow-brand-blue/25 dark:shadow-brand-blue/15 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-brand-blue/30">
                Get Started — It&apos;s Free <ArrowRight weight="bold" size={18} />
              </Link>

              <p className="text-xs text-slate-400 dark:text-white/30 mt-5 font-medium">
                No credit card required · Fund with NGN or USD
              </p>
            </motion.div>
          </div>
        </section>

        {/* ===== SUPPORTED PLATFORMS STRIP ===== */}
        <section className="w-full border-y border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-[#0A0A0A] py-10">
          <div className="max-w-[1200px] mx-auto px-6">
            <p className="text-center text-[11px] font-bold tracking-[0.2em] text-slate-400 dark:text-white/25 uppercase mb-8">
              Works with 1,300+ services including
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-16 lg:gap-x-20">
              {["WhatsApp", "Telegram", "Instagram", "TikTok", "Discord", "Google", "Binance"].map((name) => (
                <span key={name} className="text-base md:text-lg tracking-tight font-bold text-slate-300 dark:text-white/15">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="w-full py-24 md:py-32">
          <div className="max-w-[1200px] mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: customEase }}
              className="text-center mb-16 md:mb-20"
            >
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                How it works
              </h2>
              <p className="text-lg text-slate-500 dark:text-white/40 max-w-lg mx-auto">
                Three steps. Under a minute. No personal info required.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  step: "01",
                  icon: <UserCirclePlus weight="duotone" size={28} />,
                  title: "Create an account",
                  desc: "Sign up with just an email. Fund your wallet instantly with NGN via Paystack or convert to USD."
                },
                {
                  step: "02",
                  icon: <Crosshair weight="duotone" size={28} />,
                  title: "Choose your number",
                  desc: "Pick a country and the service you need to verify. We show you live pricing before you buy."
                },
                {
                  step: "03",
                  icon: <ChatCircleDots weight="duotone" size={28} />,
                  title: "Receive your code",
                  desc: "Your SMS code appears in real-time on your dashboard. Copy it, verify your account, done."
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: customEase }}
                  className="relative bg-white dark:bg-[#111] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-8 md:p-10 group hover:border-brand-blue/30 dark:hover:border-brand-blue/20 transition-colors"
                >
                  <span className="absolute top-6 right-8 text-6xl font-black text-slate-100 dark:text-white/[0.03] leading-none select-none">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-brand-blue/10 dark:bg-brand-blue/[0.08] text-brand-blue flex items-center justify-center mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 dark:text-white/40 leading-relaxed text-[15px]">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== COUNTRY CARDS ===== */}
        <section className="w-full py-24 md:py-32 bg-slate-50/80 dark:bg-[#0A0A0A] border-y border-slate-200/80 dark:border-white/5">
          <div className="max-w-[1200px] mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: customEase }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                Numbers from 44+ countries
              </h2>
              <p className="text-lg text-slate-500 dark:text-white/40 max-w-lg mx-auto">
                Real SIM-routed numbers with the highest verification success rates globally.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {FEATURED_COUNTRIES.map((country, i) => (
                <motion.div
                  key={country.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: customEase }}
                  className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 md:p-6 flex flex-col gap-3 hover:border-brand-blue/30 dark:hover:border-brand-blue/20 transition-colors group cursor-default"
                >
                  <span className="text-3xl md:text-4xl">{country.flag}</span>
                  <div>
                    <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white tracking-tight">{country.name}</h3>
                    <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">{country.numbers} numbers</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/register" className="inline-flex items-center gap-2 text-brand-blue text-sm font-bold hover:underline underline-offset-4">
                View all 44+ countries <ArrowRight weight="bold" size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="w-full py-24 md:py-32">
          <div className="max-w-[1200px] mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: customEase }}
              className="text-center mb-16 md:mb-20"
            >
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                Why choose SmsDigitals
              </h2>
              <p className="text-lg text-slate-500 dark:text-white/40 max-w-lg mx-auto">
                Built for speed, privacy, and reliability at scale.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Lightning weight="fill" size={22} />,
                  title: "Instant Delivery",
                  desc: "Most codes arrive in under 60 seconds. Our multi-provider engine finds the fastest route."
                },
                {
                  icon: <ShieldCheck weight="fill" size={22} />,
                  title: "Real SIM Numbers",
                  desc: "No VoIP. Real carrier-grade SIMs that pass even the strictest platform verification checks."
                },
                {
                  icon: <GlobeHemisphereWest weight="fill" size={22} />,
                  title: "44+ Countries",
                  desc: "From the US and UK to Nigeria, India, and Brazil — numbers available where you need them."
                },
                {
                  icon: <Clock weight="fill" size={22} />,
                  title: "Auto-Refund",
                  desc: "If a code isn't received within the timeout window, your balance is automatically refunded."
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: customEase }}
                  className="flex flex-col gap-4 p-6 md:p-8 rounded-2xl border border-slate-200/60 dark:border-white/[0.04] bg-white dark:bg-transparent"
                >
                  <div className="w-11 h-11 rounded-xl bg-brand-blue/10 dark:bg-brand-blue/[0.08] text-brand-blue flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{feature.title}</h3>
                  <p className="text-[15px] text-slate-500 dark:text-white/40 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="w-full py-24 md:py-32 bg-slate-50/80 dark:bg-[#0A0A0A] border-y border-slate-200/80 dark:border-white/5">
          <div className="max-w-[800px] mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: customEase }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                Frequently asked questions
              </h2>
            </motion.div>

            <div className="flex flex-col gap-3">
              {FAQ_ITEMS.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ duration: 0.3, delay: i * 0.04, ease: customEase }}
                  className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 md:p-6 text-left group"
                  >
                    <span className="font-bold text-[15px] md:text-base text-slate-900 dark:text-white pr-4">{item.q}</span>
                    <CaretDown
                      weight="bold"
                      size={16}
                      className={`text-slate-400 dark:text-white/30 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className="grid transition-all duration-300 ease-in-out"
                    style={{
                      gridTemplateRows: openFaq === i ? "1fr" : "0fr",
                    }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 md:px-6 pb-5 md:pb-6 text-[15px] text-slate-500 dark:text-white/40 leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="w-full py-28 md:py-36">
          <div className="max-w-[1200px] mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: customEase }}
              className="relative bg-slate-900 dark:bg-[#111] rounded-3xl p-12 md:p-20 flex flex-col items-center text-center overflow-hidden border border-slate-800 dark:border-white/[0.06]"
            >
              {/* Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-brand-blue/20 rounded-full blur-[120px] pointer-events-none" />

              <h2 className="relative text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
                Ready to verify?
              </h2>
              <p className="relative text-lg text-slate-400 max-w-md mb-10">
                Join thousands of users who trust SmsDigitals for fast, private, and reliable SMS verification.
              </p>
              <Link href="/register" className="relative h-14 px-10 inline-flex items-center justify-center gap-2.5 bg-brand-blue text-white text-base font-bold rounded-full transition-all hover:bg-blue-600 shadow-xl shadow-brand-blue/30 hover:-translate-y-0.5 hover:shadow-2xl">
                Create your free account <ArrowRight weight="bold" size={18} />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="w-full border-t border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#030303] py-12">
          <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-black">
                <ChatCircleDots weight="fill" size={11} />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-white">SmsDigitals</span>
            </div>

            <div className="flex items-center gap-6 text-sm font-medium text-slate-400 dark:text-white/40">
              <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</Link>
              <Link href="/refund" className="hover:text-slate-900 dark:hover:text-white transition-colors">Refund Policy</Link>
            </div>

            <p className="text-sm font-medium text-slate-400 dark:text-white/30">
              © {new Date().getFullYear()} SmsDigitals. All rights reserved.
            </p>
          </div>
        </footer>

      </main>
    </div>
  );
}
