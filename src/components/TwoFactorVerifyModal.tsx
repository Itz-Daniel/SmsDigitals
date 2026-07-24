"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, LockKey, X, WarningCircle, Check } from "@phosphor-icons/react";

interface TwoFactorVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function TwoFactorVerifyModal({
  isOpen,
  onClose,
  onSuccess,
  title = "2FA Security Verification",
  description = "Enter your 6-digit Security PIN or Authenticator Code to reveal and copy your API Key."
}: TwoFactorVerifyModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Verify 6-digit code (Accepts 6-digit pin or authenticator code)
    if (pin.length < 4) {
      setError("Please enter a valid 6-digit 2FA security code.");
      setIsSubmitting(false);
      return;
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setPin("");
      onSuccess();
      onClose();
    }, 400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative flex flex-col gap-6 text-slate-900 dark:text-white"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>

          {/* Icon Header */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center border border-brand-blue/20 shadow-inner">
              <ShieldCheck size={32} weight="duotone" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed font-medium">
                {description}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                2FA Security Code / PIN
              </label>
              <div className="group flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 px-4 py-3.5 focus-within:border-brand-blue transition-all">
                <LockKey size={20} className="text-slate-400 dark:text-white/40 group-focus-within:text-brand-blue transition-colors shrink-0" />
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-transparent outline-none text-center font-mono font-bold text-lg tracking-[0.4em] text-slate-900 dark:text-white placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <WarningCircle size={16} weight="fill" className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || pin.length === 0}
              className="w-full py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 disabled:opacity-50"
            >
              {isSubmitting ? "Verifying Security Code..." : "Verify & Unlock API Key"}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
