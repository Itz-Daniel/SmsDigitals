"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCurrency } from "@/components/CurrencyContext";
import { GlobeHemisphereWest, CheckCircle, Spinner } from "@phosphor-icons/react";

export function CurrencyOnboardingModal() {
  const { onboardingCompleted, isLoading, completeOnboarding } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selected, setSelected] = useState<"USD" | "NGN" | null>(null);

  // If still loading context, or if already completed, don't show the modal
  if (isLoading || onboardingCompleted !== false) {
    return null;
  }

  const handleContinue = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    
    // Check for referral cookie
    try {
      const match = document.cookie.match(/(^| )ref_code=([^;]+)/);
      if (match) {
        const refCode = match[2];
        await fetch("/api/affiliates/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralCode: refCode })
        });
        // Clear cookie after attempt
        document.cookie = "ref_code=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    } catch (e) {
      console.error("Failed to process referral", e);
    }

    await completeOnboarding(selected);
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-[#111] p-8 md:p-10 rounded-3xl w-full max-w-lg shadow-2xl relative border border-black/5 dark:border-white/10 overflow-hidden flex flex-col items-center text-center"
        >
          {/* Background decoration */}
          <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-brand-blue/20 blur-[100px] rounded-full pointer-events-none" />

          {/* Icon */}
          <div className="w-20 h-20 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-[0_0_20px_rgba(0,112,243,0.2)]">
            <GlobeHemisphereWest size={40} weight="duotone" />
          </div>

          {/* Content */}
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight relative z-10">
            Welcome to SmsDigitals!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 relative z-10 leading-relaxed">
            Before you start exploring, please select your preferred currency. This will be used to display all prices and wallet balances across the platform.
          </p>

          {/* Options */}
          <div className="flex flex-col sm:flex-row gap-4 w-full mb-8 relative z-10">
            <button
              onClick={() => setSelected("NGN")}
              className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                selected === "NGN"
                  ? "border-brand-blue bg-brand-blue/5 shadow-[0_0_20px_rgba(0,112,243,0.1)]"
                  : "border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">₦</div>
              <div className="font-bold text-slate-700 dark:text-slate-300">Naira (NGN)</div>
              {selected === "NGN" && (
                <CheckCircle size={24} weight="fill" className="text-brand-blue absolute top-4 right-4" />
              )}
            </button>

            <button
              onClick={() => setSelected("USD")}
              className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                selected === "USD"
                  ? "border-brand-blue bg-brand-blue/5 shadow-[0_0_20px_rgba(0,112,243,0.1)]"
                  : "border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">$</div>
              <div className="font-bold text-slate-700 dark:text-slate-300">Dollar (USD)</div>
              {selected === "USD" && (
                <CheckCircle size={24} weight="fill" className="text-brand-blue absolute top-4 right-4" />
              )}
            </button>
          </div>

          <button
            onClick={handleContinue}
            disabled={!selected || isSubmitting}
            className="w-full py-4 rounded-xl font-bold text-white bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-50 disabled:active:scale-100 shadow-[0_4px_12px_rgba(0,112,243,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 relative z-10"
          >
            {isSubmitting ? (
              <Spinner size={24} className="animate-spin" />
            ) : (
              "Continue to Dashboard"
            )}
          </button>
          
          <p className="text-xs text-slate-400 mt-4 relative z-10 font-medium">
            You can always change this later in your profile settings.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
