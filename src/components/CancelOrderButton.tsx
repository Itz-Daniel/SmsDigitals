"use client";

import { useState, useEffect } from "react";
import { Spinner, Clock, Prohibit, Info } from "@phosphor-icons/react";
import { motion } from "framer-motion";

interface CancelOrderButtonProps {
  rentalId: string;
  createdAt: string;
  onCancelSuccess: () => void;
}

export function CancelOrderButton({ rentalId, createdAt, onCancelSuccess }: CancelOrderButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  }, [createdAt]);

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
        onCancelSuccess();
      } else {
        setErrorMessage(data.error || "Failed to cancel order.");
        setIsCancelling(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error while cancelling.");
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
          <span className="whitespace-nowrap">Cancel in {formattedTime}</span>
        </button>

        {/* Subtle Cooldown Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-white/10 h-1 rounded-full overflow-hidden">
          <div 
            className="bg-brand-blue h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Hover Explainer Tooltip */}
        <span className="text-[10px] text-slate-400 dark:text-white/40 font-medium flex items-center gap-1 whitespace-nowrap">
          <Info size={11} className="text-brand-blue shrink-0" /> Provider 2m delivery window
        </span>
      </div>
    );
  }

  // Cooldown finished -> Active Vibrant Cancel Button
  return (
    <div className="flex flex-col items-center sm:items-end w-full sm:w-auto gap-1">
      <motion.button 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={handleCancel}
        disabled={isCancelling}
        className="w-full sm:w-auto text-xs px-4 py-2 rounded-xl font-extrabold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 dark:border-red-500/40 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10 active:scale-95 disabled:opacity-50"
      >
        {isCancelling ? (
          <>
            <Spinner size={14} className="animate-spin text-current shrink-0" />
            <span className="whitespace-nowrap">Refunding Wallet...</span>
          </>
        ) : (
          <>
            <Prohibit size={14} weight="bold" className="shrink-0" />
            <span className="whitespace-nowrap">Cancel & Refund Wallet</span>
          </>
        )}
      </motion.button>

      {errorMessage && (
        <span className="text-[10px] font-bold text-red-500 mt-1 text-center sm:text-right">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
