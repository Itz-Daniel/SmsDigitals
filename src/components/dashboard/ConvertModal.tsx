import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowDown } from "@phosphor-icons/react";

import { Spinner, CheckCircle } from "@phosphor-icons/react";

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  ngnBalance: number;
  usdBalance: number;
  exchangeRate: number;
  onConvertSuccess: (newNgn: number, newUsd: number) => void;
}

export default function ConvertModal({ isOpen, onClose, ngnBalance, usdBalance, exchangeRate, onConvertSuccess }: ConvertModalProps) {
  const [amountSend, setAmountSend] = useState<string>("");
  const [amountReceive, setAmountReceive] = useState<string>("");
  const [fee, setFee] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const FEE_PERCENTAGE = 0.015; // 1.5%
  const MIN_AMOUNT = 1000;

  // Update receive amount when send amount changes
  useEffect(() => {
    if (amountSend) {
      const parsed = parseFloat(amountSend);
      if (!isNaN(parsed) && parsed > 0) {
        const calculatedFee = parsed * FEE_PERCENTAGE;
        const amountAfterFee = parsed - calculatedFee;
        
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFee(calculatedFee.toFixed(2));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAmountReceive((amountAfterFee / exchangeRate).toFixed(2));
      } else {
        setAmountReceive("");
        setFee("");
      }
    } else {
      setAmountReceive("");
      setFee("");
    }
  }, [amountSend, exchangeRate]);

  const handleConvert = async () => {
    const parsedAmount = parseFloat(amountSend);
    if (!parsedAmount || parsedAmount <= 0) return;
    
    if (parsedAmount < MIN_AMOUNT) {
      setError(`Minimum conversion amount is ₦${MIN_AMOUNT.toLocaleString()}`);
      return;
    }

    if (parsedAmount > ngnBalance) {
      setError("Insufficient NGN balance");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/wallet/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_ngn: parsedAmount }),
      });

      const data = await res.json();

      if (data.success) {
        onConvertSuccess(data.new_balance_ngn, data.new_balance_usd);
        setAmountSend("");
        setAmountReceive("");
        setFee("");
      } else {
        setError(data.error || "Failed to convert money.");
      }
    } catch (err: unknown) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-black/5 dark:border-white/5 flex flex-col gap-4">
              <button 
                onClick={onClose}
                className="self-start flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white/60 border border-black/5 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowLeft weight="bold" />
                Back
              </button>
              
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Convert Money</h2>
                <p className="text-sm text-slate-500 dark:text-white/40 mt-1">Swap between NGN and USD instantly</p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              
              {/* Rate Card */}
              <div className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-white/40 mb-1">Today's Rate</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">₦{exchangeRate.toLocaleString('en-NG', { minimumFractionDigits: 2 })} / $1</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(0,112,243,0.6)] animate-pulse"></div>
                  <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Live</span>
                </div>
              </div>

              {error && (
                <div className="w-full rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  {error}
                </div>
              )}

              {/* Conversion Flow */}
              <div className="relative flex flex-col gap-3">
                
                {/* YOU SEND */}
                <div className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 p-5 focus-within:border-black/20 dark:focus-within:border-white/20 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold tracking-wider text-slate-400 dark:text-white/60 uppercase">You Send</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-white/40">
                      Bal: <span className="text-slate-900 dark:text-white">₦{ngnBalance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 bg-slate-200 dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-300 dark:hover:bg-white/5 transition-colors">
                      <span className="text-xs font-bold text-slate-600 dark:text-white/60">NG</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">NGN</span>
                      <ArrowDown size={12} weight="bold" className="text-slate-500 dark:text-white/40" />
                    </div>
                    
                    <input 
                      type="number" 
                      value={amountSend}
                      onChange={(e) => setAmountSend(e.target.value)}
                      placeholder="0.00"
                      className="bg-transparent border-none text-right text-2xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-0 w-full placeholder:text-slate-300 dark:placeholder:text-white/20"
                    />
                  </div>
                </div>

                {/* Swap Icon */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center shadow-[0_4px_20px_rgba(0,112,243,0.3)] border-4 border-white dark:border-[#0A0A0A]">
                  <ArrowDown size={16} weight="bold" className="text-white" />
                </div>

                {/* YOU RECEIVE */}
                <div className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 p-5 focus-within:border-brand-blue/30 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold tracking-wider text-brand-blue uppercase">You Receive</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-white/40">
                      USD Wallet: <span className="text-brand-blue">${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 bg-slate-200 dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-300 dark:hover:bg-white/5 transition-colors">
                      <span className="text-xs font-bold text-slate-600 dark:text-white/60">US</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">USD</span>
                      <ArrowDown size={12} weight="bold" className="text-slate-500 dark:text-white/40" />
                    </div>
                    
                    <input 
                      type="text" 
                      value={amountReceive}
                      readOnly
                      placeholder="0.00"
                      className="bg-transparent border-none text-right text-2xl font-bold text-brand-blue focus:outline-none focus:ring-0 w-full placeholder:text-brand-blue/30"
                    />
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="w-full rounded-2xl border border-black/5 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-5 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-white/40">Conversion fee (1.5%)</span>
                  <span className="text-red-500 font-mono">
                    {fee ? `- ₦${fee}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-white/40">Amount after fee</span>
                  <span className="text-slate-900 dark:text-white font-mono">
                    {fee && amountSend ? `₦${(parseFloat(amountSend) - parseFloat(fee)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-black/5 dark:border-white/5 pt-3 mt-1">
                  <span className="text-slate-500 dark:text-white/40">Exchange rate</span>
                  <span className="text-brand-blue font-mono">₦{exchangeRate.toLocaleString('en-NG', { minimumFractionDigits: 2 })} = $1</span>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-white/40 text-center flex items-center justify-center gap-1.5 pb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span>
                Usually arrives in under a minute
              </p>
              
              <button 
                onClick={handleConvert}
                className="w-full py-4 rounded-xl bg-brand-blue text-white font-bold text-lg hover:bg-brand-blue-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,112,243,0.2)]"
                disabled={!amountSend || parseFloat(amountSend) <= 0 || loading}
              >
                {loading ? (
                  <Spinner className="animate-spin text-2xl" />
                ) : (
                  "Convert to USD"
                )}
              </button>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
