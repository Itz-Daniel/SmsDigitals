"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Check, Wallet } from "@phosphor-icons/react";
import Link from "next/link";

interface PurchaseConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  serviceName: string;
  cost: string;
  isProcessing: boolean;
  error?: string | null;
}

export function PurchaseConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
  cost,
  isProcessing,
  countryName,
  error
}: PurchaseConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isProcessing ? onClose : undefined}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-[480px] bg-[#0A0A0A] border border-white/10 rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/5 bg-[#050505]">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1 block">Selected Service</span>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-xl">📱</span> {serviceName}
              </h2>
            </div>
            {!isProcessing && (
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X weight="bold" />
              </button>
            )}
          </div>

          {/* Cost Banner */}
          <div className="bg-[#111111] p-4 mx-5 sm:mx-6 mt-5 sm:mt-6 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-sm font-medium text-white/60">Estimated Cost</span>
            <span className="text-lg font-mono font-bold text-white tracking-wider">
              {cost}
            </span>
          </div>

          <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-2">
            {error && (
              <div className={`mb-4 p-3.5 rounded-xl border text-sm flex gap-3 items-start animate-in fade-in slide-in-from-top-2 ${
                error === "Insufficient balance." 
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              }`}>
                <span className="text-xl shrink-0 mt-0.5">{error === "Insufficient balance." ? "💰" : "⚠️"}</span>
                <div className="leading-relaxed font-medium">
                  {error === "Insufficient balance." ? (
                    <>Your wallet balance is too low to purchase this number. Please top up to continue.</>
                  ) : (
                    <>{error}</>
                  )}
                </div>
              </div>
            )}
            
            <div className="bg-brand-blue/5 border border-brand-blue/10 rounded-xl p-3.5">
              <h3 className="text-sm font-bold text-brand-blue mb-0.5">Read rules before proceeding</h3>
              <p className="text-[11px] text-brand-blue/70">📋 Important Rules</p>
            </div>
          </div>

          {/* Rules List - Scrollable */}
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 overflow-y-auto max-h-[42vh] custom-scrollbar space-y-4 pr-3 sm:pr-4">
            
            <div className="flex gap-4">
              <span className="text-[22px] shrink-0 leading-none">⏱️</span>
              <div>
                <h4 className="text-[13px] font-bold text-white mb-1">Numbers are time-limited</h4>
                <p className="text-xs text-white/50 leading-[1.6]">You have up to 20 minutes after purchase to receive your verification code. The order auto-expires after this window.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[22px] shrink-0 leading-none">📱</span>
              <div>
                <h4 className="text-[13px] font-bold text-white mb-1">One-time use only</h4>
                <p className="text-xs text-white/50 leading-[1.6]">Each number can only receive one verification SMS. It cannot be reused once a code is delivered.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[22px] shrink-0 leading-none">💰</span>
              <div>
                <h4 className="text-[13px] font-bold text-white mb-1">Cancel for a refund</h4>
                <p className="text-xs text-white/50 leading-[1.6]">If no code arrives, cancel the order within 3 minutes of purchase to get a full wallet refund. After 3 minutes the cancel button unlocks.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[22px] shrink-0 leading-none">🌐</span>
              <div>
                <h4 className="text-[13px] font-bold text-white mb-1">USA & Canada (+1) numbers</h4>
                <p className="text-xs text-white/50 leading-[1.6]">This server provides both US and Canadian numbers. Both share the +1 dial code. For USA-only services (e.g. POF), use Server 2 instead.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[22px] shrink-0 leading-none">🔄</span>
              <div>
                <h4 className="text-[13px] font-bold text-white mb-1">Keep this page open</h4>
                <p className="text-xs text-white/50 leading-[1.6]">Your code will appear here automatically. Do not close or refresh the page while waiting for the SMS.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[22px] shrink-0 leading-none">⚠️</span>
              <div>
                <h4 className="text-[13px] font-bold text-white mb-1">No guarantees on delivery</h4>
                <p className="text-xs text-white/50 leading-[1.6]">Some services block certain numbers. If a code doesn&apos;t arrive, try a different server. Cancel for a refund if unsuccessful.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[22px] shrink-0 leading-none">🚫</span>
              <div>
                <h4 className="text-[13px] font-bold text-red-400 mb-1">Prohibited use</h4>
                <p className="text-xs text-red-400/70 leading-[1.6]">Using these numbers for fraud, harassment, or any illegal activity is strictly forbidden and will result in an immediate account ban.</p>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-5 sm:p-6 border-t border-white/5 bg-[#050505] flex gap-3">
            {!isProcessing && (
              <button 
                onClick={onClose}
                className="w-1/3 py-4 rounded-xl text-sm font-bold text-white/40 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            )}
            {error === "Insufficient balance." ? (
              <Link 
                href="/dashboard/wallet"
                className="w-2/3 py-4 rounded-xl bg-brand-blue text-white font-bold text-sm shadow-[0_0_20px_rgba(0,112,243,0.3)] hover:bg-brand-blue/90 transition-all flex items-center justify-center gap-2"
              >
                <Wallet weight="bold" className="text-lg" />
                Top Up Balance
              </Link>
            ) : (
              <button 
                onClick={onConfirm}
                disabled={isProcessing}
                className={`${isProcessing ? 'w-full' : 'w-2/3'} py-4 rounded-xl bg-brand-blue text-white font-bold text-sm shadow-[0_0_20px_rgba(0,112,243,0.3)] hover:bg-brand-blue/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check weight="bold" className="text-lg" />
                    I Understand, Continue
                  </>
                )}
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
