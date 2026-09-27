"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCurrency } from "@/components/CurrencyContext";
import { 
  GlobeHemisphereWest, 
  CheckCircle, 
  Spinner, 
  ShieldCheck, 
  Wallet, 
  CreditCard, 
  ArrowCounterClockwise, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Sparkle,
  DeviceMobile,
  HardDrives
} from "@phosphor-icons/react";

export function CurrencyOnboardingModal() {
  const { onboardingCompleted, isLoading, completeOnboarding } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [step, setStep] = useState(0); // 0: Currency, 1: Overview, 2: Wallet Funding, 3: Servers, 4: Auto-Refund Guarantee
  const [selected, setSelected] = useState<"USD" | "NGN">("NGN");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial state with context: open when onboarding is not yet completed
  useEffect(() => {
    if (!isLoading && onboardingCompleted === false) {
      setIsOpen(true);
      setIsReviewMode(false);
      setStep(0);
    }
  }, [isLoading, onboardingCompleted]);

  // Listen for custom event to reopen the guide anytime from Settings or Header
  useEffect(() => {
    const handleOpenGuide = () => {
      setIsReviewMode(true);
      setStep(1); // Jump directly into tutorial when reviewing
      setIsOpen(true);
    };

    window.addEventListener("open-platform-guide", handleOpenGuide);
    return () => window.removeEventListener("open-platform-guide", handleOpenGuide);
  }, []);

  if (isLoading || !isOpen) {
    return null;
  }

  // Handle affiliate referral cookie if present
  const processReferralCookie = async () => {
    try {
      const match = document.cookie.match(/(^| )ref_code=([^;]+)/);
      if (match) {
        const refCode = match[2];
        await fetch("/api/affiliates/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralCode: refCode })
        });
        document.cookie = "ref_code=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    } catch (e) {
      console.error("Failed to process referral", e);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    await processReferralCookie();
    await completeOnboarding(selected || "NGN");
    if (typeof window !== "undefined") {
      localStorage.setItem("sms_onboarding_guide_seen", "true");
    }
    setIsSubmitting(false);
    setIsOpen(false);
  };

  const handleSkip = async () => {
    if (isReviewMode) {
      setIsOpen(false);
      return;
    }
    setIsSubmitting(true);
    await processReferralCookie();
    await completeOnboarding(selected || "NGN");
    if (typeof window !== "undefined") {
      localStorage.setItem("sms_onboarding_guide_seen", "true");
    }
    setIsSubmitting(false);
    setIsOpen(false);
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(s => s + 1);
    } else {
      if (isReviewMode) {
        setIsOpen(false);
      } else {
        handleFinish();
      }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white dark:bg-[#111111] rounded-3xl w-full max-w-lg shadow-2xl relative border border-black/5 dark:border-white/10 overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[88dvh] text-left"
        >
          {/* Subtle Ambient Light Decoration */}
          <div className="absolute top-[-20%] right-[-20%] w-60 h-60 bg-brand-blue/20 blur-[100px] rounded-full pointer-events-none" />

          {/* ── Fixed Header ────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 sm:py-4 border-b border-black/5 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-sm z-20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                {step === 0 ? "Account Setup" : `Guide • Step ${step} of 4`}
              </span>
            </div>

            {isReviewMode ? (
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                title="Close Guide"
              >
                <X size={18} weight="bold" />
              </button>
            ) : (
              <button
                onClick={handleSkip}
                disabled={isSubmitting}
                className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Skip Guide
              </button>
            )}
          </div>

          {/* ── Scrollable Body Content ────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-10">
            
            {/* ── Slide 0: Currency Selection ──────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-brand-blue/10 text-brand-blue rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,112,243,0.2)] border border-brand-blue/20">
                  <GlobeHemisphereWest size={32} weight="duotone" />
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Welcome to SmsDigitals!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-6 max-w-sm leading-relaxed">
                  Before we show you how the platform works, select your preferred currency for display rates and wallet balances.
                </p>

                <div className="flex flex-col sm:flex-row gap-3.5 w-full mb-2">
                  <button
                    type="button"
                    onClick={() => setSelected("NGN")}
                    className={`relative flex-1 flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all min-h-[110px] ${
                      selected === "NGN"
                        ? "border-brand-blue bg-brand-blue/5 shadow-[0_0_20px_rgba(0,112,243,0.1)]"
                        : "border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">₦</div>
                    <div className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300">Naira (NGN)</div>
                    <div className="text-[10px] text-slate-400">Local Bank & Cards</div>
                    {selected === "NGN" && (
                      <CheckCircle size={20} weight="fill" className="text-brand-blue absolute top-3 right-3" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelected("USD")}
                    className={`relative flex-1 flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all min-h-[110px] ${
                      selected === "USD"
                        ? "border-brand-blue bg-brand-blue/5 shadow-[0_0_20px_rgba(0,112,243,0.1)]"
                        : "border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">$</div>
                    <div className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300">Dollar (USD)</div>
                    <div className="text-[10px] text-slate-400">Crypto & Global</div>
                    {selected === "USD" && (
                      <CheckCircle size={20} weight="fill" className="text-brand-blue absolute top-3 right-3" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-white/40 mt-3 font-medium">
                  You can change your preferred currency anytime in Profile Settings.
                </p>
              </motion.div>
            )}

            {/* ── Slide 1: Welcome & Overview ──────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue border border-brand-blue/20 flex items-center justify-center shrink-0">
                    <ShieldCheck size={26} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Real Numbers for Instant Verification
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5 leading-relaxed">
                      SmsDigitals gives you instant, private phone numbers to bypass SMS verifications on any website or app.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">⚡</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">100+ Supported Apps</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Verify WhatsApp, Telegram, Google, Claude, OpenAI, TikTok, Instagram, Steam, and banking portals.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">📶</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Physical & Non-VoIP Carrier SIMs</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Genuine mobile telecom routing guarantees high deliverability with zero VoIP rejection blocks.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">🔒</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Complete Privacy & Anonymity</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Keep your personal phone number confidential and protected from spam or unwanted data brokers.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Slide 2: Funding Your Wallet ──────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Wallet size={26} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Fast & Flexible Wallet Deposits
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5 leading-relaxed">
                      All number orders are deducted directly from your account balance. Top up using your preferred gateway:
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">🇳🇬</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Paystack (Bank Transfer & Cards)</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Instant automated account crediting for Nigerian Naira via transfer or debit card.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">🪙</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Crypto via NOWPayments</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Deposit USDT (TRC20/ERC20), BTC, LTC, and major tokens with automatic blockchain confirmation.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">🎟️</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Voucher Gift Codes</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Redeem community vouchers, promotional codes, or admin gift cards directly on the Fund page.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Slide 3: Choosing the Right Server ────────────────── */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <HardDrives size={26} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Dedicated Verification Servers
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5 leading-relaxed">
                      Choose the server architecture tailored for your country and platform:
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                      Server 1
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">USA & Canada Lines</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Instant virtual lines with area code routing for North American apps and rapid testing.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                      Server 2
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">USA Dedicated Physical SIMs</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Physical carrier lines built specifically for strict apps like WhatsApp, Telegram, and US banks.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-purple-500/20 bg-purple-500/5 flex items-start gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
                      Server 3
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Global 100+ Countries</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Worldwide numbers covering UK, Nigeria, Germany, India, Brazil, France, and beyond.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                      Rentals
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Long-Term Dedicated Rentals</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Need a line for days or weeks? Rent dedicated numbers for 1–365 days with real-time SMS inboxes.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Slide 4: Receiving SMS & 100% Auto-Refund ────────── */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue border border-brand-blue/20 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,112,243,0.15)]">
                    <ArrowCounterClockwise size={26} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Zero-Risk: No Code, No Charge
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5 leading-relaxed">
                      You only pay for verification codes you actually receive. Here is our 100% safety guarantee:
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">⏱️</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">20-Minute Line Countdown</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Once you rent a short-term line, you have a 20-minute active window to request and receive your OTP code.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">💰</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        100% Automatic Wallet Refund
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-white/60 leading-relaxed">
                        If no code arrives within 20 minutes (or if you cancel manually), <strong>100% of your funds are immediately refunded to your wallet</strong>. Zero loss.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">📋</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Real-Time Screen Notification</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
                        The moment an SMS lands, an alert pops up with a 1-click &ldquo;Copy Code&rdquo; button for instant entry.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* ── Fixed Footer Controls ───────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-3.5 sm:py-4 border-t border-black/5 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-sm z-20">
            {/* Left: Back Button */}
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="min-h-[44px] px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center gap-1.5 shrink-0"
              >
                <ArrowLeft size={14} weight="bold" />
                <span className="hidden sm:inline">Back</span>
              </button>
            ) : (
              <div className="w-12 sm:w-16" />
            )}

            {/* Center: Step Dots */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  disabled={isSubmitting}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    step === i 
                      ? "w-6 bg-brand-blue" 
                      : "w-2 bg-slate-200 dark:bg-white/20 hover:bg-slate-300 dark:hover:bg-white/30"
                  }`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            {/* Right: Next / Finish CTA (Brand Blue) */}
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting || (step === 0 && !selected)}
              className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-brand-blue hover:bg-brand-blue-hover shadow-[0_4px_16px_rgba(0,112,243,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <Spinner size={18} className="animate-spin" />
              ) : step === 0 ? (
                <>
                  <span>Continue</span>
                  <ArrowRight size={14} weight="bold" />
                </>
              ) : step < 4 ? (
                <>
                  <span>Next</span>
                  <ArrowRight size={14} weight="bold" />
                </>
              ) : (
                <>
                  <span>I Understand, Let&apos;s Start!</span>
                  <Sparkle size={14} weight="fill" />
                </>
              )}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
