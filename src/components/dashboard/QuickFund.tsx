"use client";

import { useState } from "react";
import { Plus, Spinner } from "@phosphor-icons/react";

interface QuickFundProps {
  email?: string;
  onSuccessPayment?: (reference: string, amount: string) => Promise<void>;
  publicKey?: string;
}

export default function QuickFund({ email, onSuccessPayment, publicKey }: QuickFundProps) {
  const [fundAmount, setFundAmount] = useState<string>("");
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFund = async () => {
    const amountVal = parseInt(fundAmount || "0");
    if (!fundAmount || isNaN(amountVal) || amountVal < 100) {
      setErrorMsg("Minimum amount is ₦100");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setVerifying(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountVal,
          currency: "NGN",
          type: "paystack",
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg(data.error || "Failed to initialize payment gateway.");
        setVerifying(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment initialization failed.";
      setErrorMsg(msg);
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative z-10 flex flex-col md:flex-row gap-4 mt-2 items-start md:items-center w-full">
        <div className="relative w-full md:w-auto md:flex-1 md:max-w-[250px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 font-mono text-sm">₦</span>
          <input 
            type="number" 
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            placeholder="Amount (e.g. 5000)" 
            disabled={verifying}
            className="w-full bg-slate-50 dark:bg-[#050505] border border-black/5 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white text-sm font-mono focus:border-brand-blue/50 outline-none transition-colors shadow-sm dark:shadow-none"
          />
        </div>
        <button 
          onClick={handleFund}
          disabled={verifying || !fundAmount}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-bold tracking-wide hover:bg-slate-800 dark:hover:bg-white/90 transition-transform active:scale-95 duration-200 disabled:opacity-50"
        >
          {verifying ? <Spinner className="animate-spin text-lg" /> : <Plus weight="bold" className="text-lg" />}
          Fund Wallet
        </button>
      </div>
      {errorMsg && <p className="text-danger dark:text-red-400 text-sm font-medium">{errorMsg}</p>}
    </div>
  );
}
