"use client";

import { useState, useEffect } from "react";
import { CreditCard, CheckCircle, Warning, Spinner } from "@phosphor-icons/react";
import { usePaystackPayment } from "react-paystack";
import { createClient } from "@/lib/supabase/client";

export default function FundWalletClient() {
  const [amount, setAmount] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        setEmail(user.email);
      } else {
        setError("Could not retrieve user email. Please log in again.");
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const config = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: parseInt(amount || "0") * 100, // Paystack uses kobo
    publicKey: publicKey,
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = async (reference: any) => {
    setVerifying(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/fund/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference.reference }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(`Successfully credited ₦${amount} to your wallet!`);
        setAmount("");
      } else {
        setError(data.error || "Failed to verify payment. Please contact support.");
      }
    } catch (err) {
      setError("Network error while verifying payment. If you were debited, contact support.");
    } finally {
      setVerifying(false);
    }
  };

  const onClose = () => {
    // User closed the popup
  };

  const handleFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseInt(amount) < 100) {
      setError("Minimum deposit amount is ₦100.");
      return;
    }
    if (!publicKey) {
      setError("Payment gateway is not configured. (Missing PAYSTACK_PUBLIC_KEY)");
      return;
    }

    setError(null);
    setSuccess(null);

    initializePayment({ onSuccess, onClose });
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      <div className="max-w-xl flex flex-col gap-6 mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col gap-2 mb-4 text-center items-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center shadow-lg mb-2 text-brand-blue">
            <CreditCard weight="fill" className="text-3xl" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Fund Your Wallet</h1>
          <p className="text-slate-500 dark:text-white/50 text-sm">Instantly top up your account via Card, USSD, or Bank Transfer.</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <Warning className="text-red-400 mt-0.5 text-xl flex-shrink-0" weight="fill" />
            <p className="text-sm text-red-400/90">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black/10 border border-slate-900 dark:border-white/20 flex items-start gap-3">
            <CheckCircle className="text-green-400 mt-0.5 text-xl flex-shrink-0" weight="fill" />
            <p className="text-sm text-green-400/90">{success}</p>
          </div>
        )}

        {/* Main Funding Card */}
        <div className="w-full bg-white dark:bg-[#0A0A0A] rounded-[2rem] p-1.5 border border-black/5 dark:border-white/10 shadow-2xl relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="bg-slate-50 dark:bg-[#111111] rounded-[calc(2rem-0.375rem)] p-6 md:p-8 flex flex-col gap-6 relative z-10 shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">

            <form onSubmit={handleFund} className="flex flex-col gap-6">

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">
                  Amount to Deposit (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 font-mono text-xl">₦</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-white dark:bg-[#050505] border border-black/5 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white text-2xl font-mono appearance-none outline-none focus:border-brand-blue/50 transition-colors shadow-sm dark:shadow-none"
                    disabled={loading || verifying}
                  />
                </div>
              </div>

              {/* Quick Select Chips */}
              <div className="grid grid-cols-3 gap-2">
                {[1000, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    disabled={loading || verifying}
                    className="py-2.5 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm dark:shadow-none"
                  >
                    ₦{preset.toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || verifying || !amount}
                className="group relative w-full flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-black rounded-full py-4 active:scale-[0.98] transition-transform duration-500 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                <span className="text-base font-bold tracking-wide flex items-center gap-2">
                  {verifying ? (
                    <><Spinner className="animate-spin text-xl" /> Verifying Payment...</>
                  ) : (
                    "Proceed to Payment"
                  )}
                </span>
              </button>

            </form>

            <div className="pt-6 border-t border-black/5 dark:border-white/10 mt-2 flex items-center justify-center gap-4">
              <span className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest font-bold">Secured by Paystack</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
