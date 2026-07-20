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
  MapPin,
  FacebookLogo,
  ShoppingCart,
  Storefront,
  TwitterLogo,
  InstagramLogo,
  GoogleLogo
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

const TESTIMONIALS = [
  {
    name: "Alex M.",
    role: "Digital Marketer",
    content: "I've tried dozens of SMS services for my campaigns. SmsDigitals is the only one that consistently works with WhatsApp and TikTok without getting blocked. Game changer.",
    initial: "A",
    color: "from-blue-500 to-indigo-500"
  },
  {
    name: "Sarah T.",
    role: "Freelance Developer",
    content: "The API is incredibly fast, but even just using the dashboard is a breeze. The live pricing and auto-refunds mean I never waste money on failed numbers.",
    initial: "S",
    color: "from-emerald-400 to-teal-500"
  },
  {
    name: "David O.",
    role: "E-commerce Founder",
    content: "We use SmsDigitals to verify our international stealth accounts. It's reliable, the UK and US numbers are always in stock, and the Paystack integration makes funding easy.",
    initial: "D",
    color: "from-orange-400 to-red-500"
  },
  {
    name: "Elena K.",
    role: "Social Media Manager",
    content: "Finally, a service that doesn't feel sketchy. Clean UI, fast codes, and it just works. I tell all my clients to use this for their burner accounts.",
    initial: "E",
    color: "from-purple-500 to-pink-500"
  }
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

          <div className="max-w-[1200px] mx-auto px-6 pt-32 pb-20 md:pt-40 md:pb-28 lg:pt-48 lg:pb-32 relative flex flex-col lg:block">
            
            <motion.div
              initial={{ opacity: 1, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: customEase }}
              className="flex flex-col items-center text-center max-w-3xl mx-auto z-10 relative"
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

            {/* FLOATING CARDS CONTAINER */}
            <div className="mt-16 lg:mt-0 flex gap-6 overflow-x-auto lg:overflow-visible pb-8 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] justify-start sm:justify-center w-[100vw] -ml-6 px-6 lg:w-auto lg:ml-0 lg:px-0 lg:block relative z-20">
              
              {/* FLOATING 3D MARKETPLACE CARD - LEFT */}
              <motion.div
                initial={{ opacity: 0, x: -50, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: [-5, -2, -5], y: [0, 10, 0] }}
                transition={{ 
                  opacity: { duration: 0.8, delay: 0.2 }, 
                  x: { duration: 0.8, ease: customEase, delay: 0.2 }, 
                  rotate: { repeat: Infinity, duration: 7, ease: "easeInOut" },
                  y: { repeat: Infinity, duration: 6, ease: "easeInOut" }
                }}
                className="relative lg:absolute shrink-0 left-auto lg:left-4 xl:left-10 top-auto lg:top-60 w-[260px] lg:w-72 p-5 rounded-[24px] bg-white/70 dark:bg-[#111]/80 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] z-20"
                style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
              >
                <div className="absolute inset-0 rounded-[24px] bg-gradient-to-tr from-slate-900/5 to-transparent pointer-events-none"></div>
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-lg shadow-black/20 shrink-0">
                    <TwitterLogo weight="fill" size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">X Premium / Blue</p>
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/50 font-medium">Aged • Verified</p>
                  </div>
                </div>
                <div className="flex justify-between items-end mb-5 relative z-10">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-white/40 mb-1">Live Price</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-black text-brand-blue tracking-tighter">₦12,900</p>
                      <p className="text-xs font-semibold text-slate-400 line-through">₦18,000</p>
                    </div>
                  </div>
                </div>
                <Link href="/register" className="relative z-10 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-bold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md">
                  <ShoppingCart weight="bold" size={16} />
                  Buy Account
                </Link>
              </motion.div>

              {/* FLOATING 3D MARKETPLACE CARD - RIGHT */}
              <motion.div
                initial={{ opacity: 0, x: 50, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: [6, 3, 6], y: [0, -15, 0] }}
                transition={{ 
                  opacity: { duration: 0.8 }, 
                  x: { duration: 0.8, ease: customEase }, 
                  rotate: { repeat: Infinity, duration: 6, ease: "easeInOut" },
                  y: { repeat: Infinity, duration: 5, ease: "easeInOut" }
                }}
                className="relative lg:absolute shrink-0 right-auto lg:right-4 xl:right-10 top-auto lg:top-40 w-[260px] lg:w-72 p-5 rounded-[24px] bg-white/70 dark:bg-[#111]/80 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,112,243,0.15)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] z-20"
                style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
              >
                <div className="absolute inset-0 rounded-[24px] bg-gradient-to-tr from-brand-blue/5 to-transparent pointer-events-none"></div>
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
                    <FacebookLogo weight="fill" size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Dating Facebook</p>
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/50 font-medium">High Quality • Aged</p>
                  </div>
                </div>
                <div className="flex justify-between items-end mb-5 relative z-10">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-white/40 mb-1">Live Price</p>
                    <p className="text-xl font-black text-brand-blue tracking-tighter">₦2,500 <span className="text-sm text-slate-400 font-medium">/ $1.60</span></p>
                  </div>
                </div>
                <Link href="/register" className="relative z-10 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-bold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md">
                  <ShoppingCart weight="bold" size={16} />
                  Buy Account
                </Link>
              </motion.div>
            </div>
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

        {/* ===== LONG-TERM RENTALS ===== */}
        {/* ===== LONG-TERM RENTALS ===== */}
        <section className="w-full py-24 md:py-32 bg-slate-50 dark:bg-[#0A0F1C] border-y border-slate-200 dark:border-white/5 relative overflow-hidden">
          {/* Immersive Glows (Hidden on mobile to prevent lag) */}
          <div className="hidden lg:block absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-blue/20 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="hidden lg:block absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none"></div>

          <div className="max-w-[1200px] mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: customEase }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue text-xs font-bold tracking-widest uppercase mb-6 border border-brand-blue/20 dark:border-brand-blue/30 shadow-[0_0_20px_rgba(0,112,243,0.1)] dark:shadow-[0_0_20px_rgba(0,112,243,0.2)]">
                  <Clock weight="fill" size={14} /> Long-Term Rentals
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1]">
                  Keep the same number for <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-blue-400">30+ days.</span>
                </h2>
                <p className="text-lg text-slate-500 dark:text-white/60 leading-relaxed mb-8">
                  Need a number that lasts? Rent real US & UK mobile numbers for a month or more. Enjoy unlimited SMS receiving, perfect for securing persistent accounts like WhatsApp, Telegram, or banking.
                </p>
                
                <ul className="flex flex-col gap-4 mb-10">
                  {[
                    "Unlimited SMS receiving during your rental period",
                    "Real SIM-routed numbers, not virtual VoIP lines",
                    "Auto-renew options to keep your number forever"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle weight="bold" size={12} />
                      </div>
                      <span className="text-slate-700 dark:text-white/80 font-medium">{text}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register" className="h-14 px-8 inline-flex items-center justify-center gap-2 bg-brand-blue text-white text-sm font-bold rounded-full hover:bg-blue-600 hover:scale-105 transition-all shadow-xl shadow-brand-blue/25 dark:shadow-brand-blue/30">
                  Rent a Number Now <ArrowRight weight="bold" size={16} />
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: 0.2, ease: customEase }}
                className="relative"
              >
                <div className="relative bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 via-brand-blue to-purple-500"></div>
                  
                  {/* Subtle glass reflection (Hidden on mobile) */}
                  <div className="hidden lg:block absolute -top-24 -right-24 w-48 h-48 bg-white/10 blur-[50px] rounded-full pointer-events-none"></div>

                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-xl">🇺🇸</span> United States
                      </p>
                      <p className="text-xs text-slate-500 dark:text-white/50 mt-1">Real Mobile Number</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-brand-blue">₦7,500 <span className="text-sm text-slate-400 dark:text-white/40 font-medium">/ mo</span></p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                    <div className="bg-slate-50/50 dark:bg-black/40 border border-slate-200/50 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0">
                        <ShieldCheck weight="fill" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Active Rental</p>
                        <p className="text-xs text-brand-blue font-semibold">28 Days Remaining</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50/50 dark:bg-black/40 border border-slate-200/50 dark:border-white/5 rounded-2xl p-4">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 mb-3 uppercase tracking-wider">Recent Messages</p>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-3 items-start opacity-70 dark:opacity-50">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-white/30 mt-1.5 shrink-0"></div>
                          <p className="text-sm font-medium text-slate-600 dark:text-white/70">Your WhatsApp code is 849-211.</p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shrink-0 animate-pulse shadow-[0_0_8px_rgba(0,112,243,0.8)]"></div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">PayPal: Your security code is 912384.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ===== DIGITAL MARKETPLACE SHOWCASE ===== */}
        <section className="w-full py-24 md:py-32 bg-brand-blue/5 dark:bg-brand-blue/[0.02] border-y border-brand-blue/10 dark:border-brand-blue/[0.05] relative overflow-hidden">
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-brand-blue/10 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="max-w-[1200px] mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: customEase }}
                className="max-w-2xl"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 dark:bg-brand-blue/[0.15] text-brand-blue text-xs font-bold tracking-widest uppercase mb-6">
                  <Storefront weight="fill" size={14} /> New Feature
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                  Premium Digital Marketplace
                </h2>
                <p className="text-lg text-slate-600 dark:text-white/50 leading-relaxed">
                  Beyond just SMS verification. Instantly purchase aged, high-quality social accounts, game keys, and digital assets. Clean UI, secure delivery, and zero hassle.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: 0.1, ease: customEase }}
              >
                <Link href="/register" className="h-12 px-6 inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-bold rounded-full hover:scale-105 transition-transform shadow-lg">
                  Explore Marketplace <ArrowRight weight="bold" size={16} />
                </Link>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "Aged Facebook", price: "₦1,950", oldPrice: "₦3,500", tag: "Social", color: "text-blue-500", bg: "bg-blue-500/10", icon: FacebookLogo },
                { name: "Twitter / X Blue", price: "₦12,900", oldPrice: "₦18,000", tag: "Premium", color: "text-slate-900 dark:text-white", bg: "bg-slate-200 dark:bg-white/10", icon: TwitterLogo },
                { name: "Instagram 10k+", price: "₦7,450", oldPrice: "₦10,000", tag: "Social", color: "text-pink-500", bg: "bg-pink-500/10", icon: InstagramLogo },
                { name: "Google Voice US", price: "₦3,950", oldPrice: "₦5,000", tag: "Communication", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: GoogleLogo }
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: customEase }}
                  className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-6 flex flex-col hover:border-brand-blue/30 transition-colors shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300"
                >
                  <div className="flex justify-between items-start mb-12">
                    <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                      <Icon weight="fill" size={20} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40 border border-slate-200 dark:border-white/10 px-2 py-1 rounded-full">
                      {item.tag}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white mb-1">{item.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-black text-brand-blue tracking-tighter">{item.price}</p>
                      <p className="text-xs font-semibold text-slate-400 line-through">{item.oldPrice}</p>
                    </div>
                  </div>
                </motion.div>
              )})}
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

        {/* ===== TESTIMONIALS ===== */}
        <section className="w-full py-24 md:py-32 overflow-hidden relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-blue/[0.03] dark:bg-brand-blue/[0.02] rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-[1200px] mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: customEase }}
              className="text-center mb-16 md:mb-20"
            >
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                Trusted by professionals
              </h2>
              <p className="text-lg text-slate-500 dark:text-white/40 max-w-lg mx-auto">
                Don&apos;t just take our word for it. Here&apos;s what our users have to say.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {TESTIMONIALS.map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: customEase }}
                  className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-8 hover:border-brand-blue/30 dark:hover:border-brand-blue/20 transition-colors flex flex-col justify-between"
                >
                  <p className="text-[15px] md:text-base text-slate-600 dark:text-white/70 leading-relaxed mb-8 italic">
                    &quot;{testimonial.content}&quot;
                  </p>
                  
                  <div className="flex items-center gap-4 mt-auto">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold text-sm shadow-inner`}>
                      {testimonial.initial}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{testimonial.name}</h4>
                      <p className="text-[13px] text-slate-500 dark:text-white/40">{testimonial.role}</p>
                    </div>
                  </div>
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
