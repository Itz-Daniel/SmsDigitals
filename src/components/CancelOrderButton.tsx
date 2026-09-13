"use client";

import { useState, useEffect } from "react";
import { Spinner, Clock, Prohibit, Info, CheckCircle } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

interface CancelOrderButtonProps {
  rentalId: string;
  createdAt: string;
  cost?: number | string;
  currency?: string;
  onCancelSuccess: () => void;
}

export function CancelOrderButton({ 
  rentalId, 
  createdAt, 
  cost,
  currency = "USD",
  onCancelSuccess 
}: CancelOrderButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const isMockOrTest = rentalId?.startsWith('mock_') || 
                           rentalId?.startsWith('test_') || 
                           rentalId?.startsWith('sandbox_');
      if (isMockOrTest) {
        setSecondsLeft(0);
        return;
      }

      const createdTime = new Date(createdAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - createdTime) / 1000);
      const remaining = 120 - elapsed;
      setSecondsLeft(remaining > 0 ? remaining : 0);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [createdAt, rentalId]);

  const handleCancel = async () => {
    if (secondsLeft > 0 || isCancelling) return;

    setIsCancelling(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rental_id: rentalId })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const refundDisplay = cost !== undefined ? ` (${currency === 'USD' ? '$' : '₦'}${cost})` : "";
        setSuccessMessage(`Refunded${refundDisplay} to your wallet!`);
        setTimeout(() => {
          onCancelSuccess();
        }, 1200);
      } else {
        setErrorMessage(data.error || "Failed to cancel order.");
        setIsCancelling(false);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Network error while cancelling.");
      setIsCancelling(false);
    }
  };

  // Cooldown in progress (0 - 120 seconds)
  if (secondsLeft > 0) {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    const formattedTime = `${m}:${s < 10 ? '0' : ''}${s}`;
    const progressPercent = Math.min(100, Math.max(0, ((120 - secondsLeft) / 120) * 100));

    return (
      <div className="flex flex-col items-center sm:items-end w-full sm:w-auto gap-1 relative">
        <button 
          disabled
          className="w-full sm:w-auto text-xs px-3.5 py-2 rounded-xl font-bold bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-white/60 border border-slate-300 dark:border-white/10 cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm transition-all"
        >
          <Clock size={14} className="text-brand-blue animate-pulse shrink-0" />
          <span className="whitespace-nowrap">Cancel & Refund in {formattedTime}</span>
        </button>

        {/* Subtle Cooldown Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-white/10 h-1 rounded-full overflow-hidden">
          <div 
            className="bg-brand-blue h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Safe Carrier Window Tooltip (No provider leak) */}
        <span className="text-[10px] text-slate-400 dark:text-white/40 font-medium flex items-center gap-1 whitespace-nowrap">
          <Info size={11} className="text-brand-blue shrink-0" /> Automatic refund available after 2m
        </span>
      </div>
    );
  }

  // Cooldown finished -> Active Vibrant Cancel & Refund Button
  return (
    <div className="flex flex-col items-center sm:items-end w-full sm:w-auto gap-1">
      <AnimatePresence mode="wait">
        {successMessage ? (
          <motion.div
            key="success-refund"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle size={15} weight="fill" className="shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </motion.div>
        ) : (
          <motion.button 
            key="cancel-btn"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full sm:w-auto text-xs px-4 py-2 rounded-xl font-extrabold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 dark:border-red-500/40 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10 active:scale-95 disabled:opacity-50"
          >
            {isCancelling ? (
              <>
                <Spinner size={14} className="animate-spin text-current shrink-0" />
                <span className="whitespace-nowrap">Cancelling & Refunding...</span>
              </>
            ) : (
              <>
                <Prohibit size={14} weight="bold" className="shrink-0" />
                <span className="whitespace-nowrap">Cancel & Refund</span>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {errorMessage && (
        <span className="text-[10px] font-bold text-red-500 mt-1 text-center sm:text-right">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
