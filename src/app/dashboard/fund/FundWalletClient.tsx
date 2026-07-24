"use client";

import { useState, useEffect } from "react";
import { CreditCard, CheckCircle, Warning, Spinner, CurrencyBtc, Copy, Check, QrCode, ArrowRight, ShieldCheck, Bank, Coins, Clock, WarningCircle } from "@phosphor-icons/react";
import { usePaystackPayment } from "react-paystack";
import { createClient } from "@/lib/supabase/client";

type FundMethod = "bank" | "crypto";

const CRYPTO_COINS = [
  { id: "usdttrc20", name: "USDT (TRC20)", network: "TRON", icon: "₮" },
  { id: "usdtbep20", name: "USDT (BEP20)", network: "BSC", icon: "₮" },
  { id: "btc", name: "Bitcoin", network: "BTC", icon: "₿" },
  { id: "eth", name: "Ethereum", network: "ERC20", icon: "Ξ" },
  { id: "sol", name: "Solana", network: "SOL", icon: "◎" },
];

const EXPIRE_TIMEOUT_SECONDS = 45 * 60; // 45 Minutes (2700 Seconds)

export default function FundWalletClient() {
  const [activeMethod, setActiveMethod] = useState<FundMethod>("bank");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Bank / Paystack State
  const [ngnAmount, setNgnAmount] = useState<string>("");

  // Crypto Gateway State
  const [usdAmount, setUsdAmount] = useState<string>("25");
  const [selectedCoin, setSelectedCoin] = useState<string>("usdttrc20");
  const [isGeneratingCrypto, setIsGeneratingCrypto] = useState(false);
  const [cryptoOrder, setCryptoOrder] = useState<{
    orderId: string;
    payAddress: string;
    payAmount: number;
    payCurrency: string;
    priceAmountUsd: number;
    qrUrl: string;
  } | null>(null);
  const [copiedCryptoAddress, setCopiedCryptoAddress] = useState(false);

  // 45-Minute Countdown & Auto-Stop State
  const [timeLeft, setTimeLeft] = useState<number>(EXPIRE_TIMEOUT_SECONDS);
  const [isOrderExpired, setIsOrderExpired] = useState<boolean>(false);

  const supabase = createClient();
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        setEmail(user.email);
      } else {
        setError("Could not retrieve user details. Please log in again.");
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  // 45-Minute Countdown Timer Hook
  useEffect(() => {
    if (!cryptoOrder || isOrderExpired) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsOrderExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cryptoOrder, isOrderExpired]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Paystack NGN Card & Bank Payment Config
  const paystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: parseInt(ngnAmount || "0") * 100,
    publicKey: publicKey,
  };

  const initializePaystack = usePaystackPayment(paystackConfig);

  const handlePaystackSuccess = async (reference: any) => {
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
        setSuccess(`Successfully credited ₦${parseInt(ngnAmount).toLocaleString()} to your wallet!`);
        setNgnAmount("");
      } else {
        setError(data.error || "Failed to verify payment. Please contact support.");
      }
    } catch (err) {
      setError("Network error while verifying payment. If you were debited, contact support.");
    } finally {
      setVerifying(false);
    }
  };

  const handlePaystackFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ngnAmount || parseInt(ngnAmount) < 100) {
      setError("Minimum deposit amount is ₦100.");
      return;
    }
    if (!publicKey) {
      setError("Payment gateway missing configuration.");
      return;
    }

    setError(null);
    setSuccess(null);
    initializePaystack({ onSuccess: handlePaystackSuccess, onClose: () => {} });
  };

  // Generate Crypto Deposit Order with 45-minute limit
  const handleGenerateCryptoOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingCrypto(true);
    setError(null);
    setCryptoOrder(null);
    setIsOrderExpired(false);
    setTimeLeft(EXPIRE_TIMEOUT_SECONDS);

    try {
      const res = await fetch("/api/checkout/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: parseFloat(usdAmount || "10"),
          coin: selectedCoin
        })
      });

      const data = await res.json();
      if (data.success) {
        setCryptoOrder({
          orderId: data.orderId,
          payAddress: data.payAddress,
          payAmount: data.payAmount,
          payCurrency: data.payCurrency,
          priceAmountUsd: data.priceAmountUsd,
          qrUrl: data.qrUrl
        });
      } else {
        setError(data.error || "Failed to generate crypto payment address.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to Crypto Gateway.");
    } finally {
      setIsGeneratingCrypto(false);
    }
  };

  const copyCryptoAddress = () => {
    if (!cryptoOrder) return;
    navigator.clipboard.writeText(cryptoOrder.payAddress);
    setCopiedCryptoAddress(true);
    setTimeout(() => setCopiedCryptoAddress(false), 2000);
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-white/40 font-sans">
        <Spinner size={32} className="animate-spin text-brand-blue" />
        <span className="text-sm font-bold">Loading Wallet Gateways...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 font-sans pb-32">
      <div className="max-w-xl flex flex-col gap-6 mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col gap-2 text-center items-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center shadow-lg mb-2 text-brand-blue">
            <CreditCard weight="fill" className="text-3xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Fund Your Wallet
          </h1>
          <p className="text-slate-500 dark:text-white/50 text-xs sm:text-sm max-w-sm">
            Top up instantly via Local Bank Transfer, Card, or Crypto (USDT, BTC, SOL, ETH).
          </p>
        </div>

        {/* Status Banners */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-600 dark:text-red-400 text-xs font-semibold">
            <Warning size={20} weight="fill" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <CheckCircle size={20} weight="fill" className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* FUNDING METHOD SELECTOR TABS */}
        <div className="grid grid-cols-2 gap-3 bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <button
            onClick={() => setActiveMethod("bank")}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeMethod === "bank"
                ? "bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-md"
                : "text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Bank size={18} weight="bold" /> Card & Bank (NGN)
          </button>

          <button
            onClick={() => setActiveMethod("crypto")}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeMethod === "crypto"
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20"
                : "text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Coins size={18} weight="bold" /> USDT & Crypto (USD)
          </button>
        </div>

        {/* METHOD 1: CARD & BANK TRANSFER (NGN) */}
        {activeMethod === "bank" && (
          <div className="w-full bg-white dark:bg-[#111111] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bank size={20} className="text-brand-blue" /> Instant Card & Bank Deposit
              </h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Instant Auto-Credit
              </span>
            </div>

            <form onSubmit={handlePaystackFund} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Amount in Naira (₦)
                </label>
                <div className="group flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 px-4 py-3.5 focus-within:border-brand-blue transition-all">
                  <span className="text-lg font-bold font-mono text-slate-400">₦</span>
                  <input
                    type="number"
                    min="100"
                    placeholder="e.g. 5000"
                    value={ngnAmount}
                    onChange={(e) => setNgnAmount(e.target.value)}
                    className="w-full bg-transparent outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-2 flex-wrap">
                {["1000", "2000", "5000", "10000", "25000"].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setNgnAmount(val)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white text-xs font-bold transition-all border border-slate-200/80 dark:border-white/5"
                  >
                    +₦{parseInt(val).toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
              >
                {verifying ? <Spinner size={20} className="animate-spin" /> : "Proceed to Paystack Deposit"} <ArrowRight size={16} weight="bold" />
              </button>
            </form>
          </div>
        )}

        {/* METHOD 2: USDT & CRYPTO GATEWAY */}
        {activeMethod === "crypto" && (
          <div className="w-full bg-white dark:bg-[#111111] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CurrencyBtc size={20} className="text-amber-500" /> Automated Crypto Deposit
              </h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                45m Timeout Protection
              </span>
            </div>

            {/* Coin Selector Grid */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                Select Cryptocurrency Network
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CRYPTO_COINS.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSelectedCoin(c.id)}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                      selectedCoin === c.id
                        ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xs font-extrabold flex items-center justify-between">
                      {c.name} <span className="opacity-75 font-mono">{c.icon}</span>
                    </span>
                    <span className="text-[10px] opacity-75 font-semibold">Network: {c.network}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* USD Amount Input */}
            <form onSubmit={handleGenerateCryptoOrder} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Amount in USD ($)
                </label>
                <div className="group flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 px-4 py-3.5 focus-within:border-brand-blue transition-all">
                  <span className="text-lg font-bold font-mono text-slate-400">$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="25"
                    value={usdAmount}
                    onChange={(e) => setUsdAmount(e.target.value)}
                    className="w-full bg-transparent outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Quick USD Presets */}
              <div className="flex gap-2 flex-wrap">
                {["10", "25", "50", "100", "250"].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setUsdAmount(val)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white text-xs font-bold transition-all border border-slate-200/80 dark:border-white/5"
                  >
                    +${val}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={isGeneratingCrypto}
                className="w-full py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
              >
                {isGeneratingCrypto ? <Spinner size={20} className="animate-spin" /> : "Generate Crypto Deposit Address"} <ArrowRight size={16} weight="bold" />
              </button>
            </form>

            {/* GENERATED CRYPTO ORDER DISPLAY & QR CODE WITH 45-MINUTE COUNTDOWN */}
            {cryptoOrder && (
              <div className="p-6 rounded-3xl bg-slate-900 dark:bg-black border border-slate-800 dark:border-white/15 flex flex-col gap-6 text-white shadow-2xl animate-in fade-in">
                
                <div className="flex items-center justify-between border-b border-slate-800 dark:border-white/10 pb-4 flex-wrap gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                      <ShieldCheck size={14} weight="fill" /> Deposit Order Active
                    </span>
                    <span className="text-xs font-mono text-slate-400">Order ID: {cryptoOrder.orderId}</span>
                  </div>

                  {/* 45-MINUTE COUNTDOWN BADGE */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold border ${
                    isOrderExpired
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                  }`}>
                    <Clock size={16} weight="bold" />
                    <span>{isOrderExpired ? "EXPIRED (45m)" : `Expires in ${formatTimer(timeLeft)}`}</span>
                  </div>
                </div>

                {isOrderExpired ? (
                  /* EXPIRED STATE (SERVER AUTO-STOPPED TO AVOID OVERLOAD) */
                  <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col items-center text-center gap-3">
                    <WarningCircle size={36} className="text-red-400" weight="fill" />
                    <div className="flex flex-col gap-1">
                      <h4 className="font-bold text-sm text-red-400">Deposit Window Expired (45m Limit)</h4>
                      <p className="text-xs text-slate-300 max-w-sm">
                        To protect server resources, automatic monitoring for this order has stopped. Click below to generate a fresh address if you still wish to deposit.
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateCryptoOrder}
                      className="mt-2 px-6 py-3 rounded-xl bg-brand-blue text-white font-bold text-xs hover:bg-blue-600 transition-all shadow-md shadow-brand-blue/20"
                    >
                      Generate Fresh Crypto Address
                    </button>
                  </div>
                ) : (
                  /* ACTIVE UNEXPIRED STATE */
                  <>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-36 h-36 p-2 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-lg">
                        <img src={cryptoOrder.qrUrl} alt="Deposit QR Code" className="w-full h-full object-contain" />
                      </div>

                      <div className="flex flex-col gap-2 w-full">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Send Exact Amount to Address
                        </span>
                        <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between gap-3">
                          <code className="text-xs font-mono text-emerald-400 font-bold break-all leading-relaxed">
                            {cryptoOrder.payAddress}
                          </code>
                        </div>

                        <button
                          onClick={copyCryptoAddress}
                          className="w-full mt-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                        >
                          {copiedCryptoAddress ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                          {copiedCryptoAddress ? "Address Copied!" : "Copy Deposit Address"}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <span className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
                        <Spinner size={14} className="animate-spin text-emerald-400" /> Active monitoring for 45 mins. Balance credits automatically upon network confirmation.
                      </span>
                    </div>
                  </>
                )}

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
