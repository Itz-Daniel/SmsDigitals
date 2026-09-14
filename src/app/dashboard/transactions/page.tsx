"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Swap, 
  Spinner, 
  Receipt, 
  WarningCircle, 
  CheckCircle, 
  Clock, 
  Ticket, 
  Copy, 
  Check, 
  Plus, 
  Wallet, 
  CreditCard 
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/components/CurrencyContext";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  description?: string;
  created_at: string;
}

function formatReference(ref?: string, id?: string): string {
  if (!ref && !id) return "#TXN-000000";
  const raw = ref || id || "";
  
  if (raw.toLowerCase().startsWith("voucher_")) {
    const code = raw.replace(/^voucher_/i, "");
    return `#VCH-${code.toUpperCase()}`;
  }
  
  if (raw.toLowerCase().includes("smspva") || raw.toLowerCase().includes("order")) {
    const cleanNum = raw.replace(/[^0-9]/g, "");
    const shortNum = cleanNum.length > 8 ? cleanNum.slice(0, 8) : cleanNum;
    return `#ORD-${shortNum || raw.slice(-8).toUpperCase()}`;
  }
  
  if (raw.toLowerCase().includes("paystack")) {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "");
    return `#PAY-${clean.slice(-8).toUpperCase()}`;
  }

  if (raw.toLowerCase().includes("crypto")) {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "");
    return `#CRY-${clean.slice(-8).toUpperCase()}`;
  }

  const clean = raw.replace(/[^a-zA-Z0-9]/g, "");
  return `#TXN-${clean.slice(0, 8).toUpperCase()}`;
}

export default function TransactionsPage() {
  const { currency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [wallet, setWallet] = useState<{ balance_ngn: number; balance_usd: number } | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(1450);

  const supabase = createClient();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [txRes, walletTxRes, walletRes, settingsRes] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("wallets").select("balance_ngn, balance_usd").eq("user_id", user.id).maybeSingle(),
      supabase.from("api_settings").select("exchange_rate").maybeSingle(),
    ]);

    if (walletRes.data) {
      setWallet({
        balance_ngn: Number(walletRes.data.balance_ngn) || 0,
        balance_usd: Number(walletRes.data.balance_usd) || 0,
      });
    }

    if (settingsRes.data?.exchange_rate) {
      setExchangeRate(Number(settingsRes.data.exchange_rate) || 1450);
    }

    const merged = [...(txRes.data || []), ...(walletTxRes.data || [])];
    
    // Deduplicate by reference or id
    const uniqueMap = new Map();
    merged.forEach(item => {
      const key = item.reference || item.id;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const sorted = Array.from(uniqueMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setTransactions(sorted);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(d);
  };

  const copyReference = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(key);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const isVoucherTx = (tx: Transaction) => {
    return (
      tx.type?.toLowerCase().includes("voucher") || 
      tx.reference?.toLowerCase().startsWith("voucher_") ||
      tx.description?.toLowerCase().includes("voucher")
    );
  };

  const formatShortDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { 
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit'
      }).format(d);
    } catch {
      return dateString;
    }
  };

  // Calculate Financial Ledger Summary Metrics
  const rate = exchangeRate > 0 ? exchangeRate : 1450;
  let totalCreditedNgn = 0;
  let totalCreditedUsd = 0;
  let totalSpentNgn = 0;
  let totalSpentUsd = 0;
  let countCredited = 0;
  let countSpent = 0;

  transactions.forEach((tx) => {
    const isSuccess = tx.status === "Success" || tx.status === "Completed";
    if (!isSuccess) return;

    const isCredit = 
      tx.type === "Funding" || 
      tx.type === "Deposit" || 
      tx.type === "Refund" || 
      isVoucherTx(tx);
      
    const amount = Number(tx.amount) || 0;
    const isUsd = tx.currency === "USD";

    if (isCredit) {
      countCredited++;
      if (isUsd) {
        totalCreditedUsd += amount;
        totalCreditedNgn += amount * rate;
      } else {
        totalCreditedNgn += amount;
        totalCreditedUsd += amount / rate;
      }
    } else {
      countSpent++;
      if (isUsd) {
        totalSpentUsd += amount;
        totalSpentNgn += amount * rate;
      } else {
        totalSpentNgn += amount;
        totalSpentUsd += amount / rate;
      }
    }
  });

  const isUsdActive = currency === "USD";
  const currencySymbol = isUsdActive ? "$" : "₦";

  const displayedCredited = isUsdActive 
    ? totalCreditedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(totalCreditedNgn).toLocaleString();

  const displayedSpent = isUsdActive 
    ? totalSpentUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(totalSpentNgn).toLocaleString();

  const activeWalletBal = wallet 
    ? (isUsdActive 
        ? (wallet.balance_usd || (wallet.balance_ngn / rate))
        : (wallet.balance_ngn || (wallet.balance_usd * rate)))
    : 0;

  const displayedBalance = isUsdActive
    ? activeWalletBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(activeWalletBal).toLocaleString();

  return (
    <div className="w-full flex flex-col gap-6 md:gap-8 font-sans pb-24 relative transition-colors duration-500">
      
      {/* Ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-blue/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#10B981]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full flex flex-col gap-6 sm:gap-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex flex-col gap-1.5">
            <div className="w-fit rounded-full px-3 py-1 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-2 shadow-sm">
              <Receipt className="text-brand-blue" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-600 dark:text-white/60">Financial Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Transaction History
            </h1>
            <p className="text-slate-500 dark:text-white/50 text-xs sm:text-sm max-w-md">
              Complete record of your wallet funding, virtual number purchases, gift vouchers, and automatic refunds.
            </p>
          </div>

          <Link
            href="/dashboard/fund"
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-blue hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-blue/20 transition-all"
          >
            <Plus size={16} weight="bold" />
            <span>Fund Wallet</span>
          </Link>
        </div>

        {/* ── 3 EXECUTIVE FINANCIAL SUMMARY STAT CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* 1. Total Credited Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Total Credited</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <ArrowDownLeft size={18} weight="bold" />
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                {currencySymbol}{displayedCredited}
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-white/40">
                {countCredited} deposits, vouchers & refunds
              </span>
            </div>
          </div>

          {/* 2. Total Spent Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-rose-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Total Spent</span>
              <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <ArrowUpRight size={18} weight="bold" />
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                {currencySymbol}{displayedSpent}
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-white/40">
                {countSpent} number purchases & rentals
              </span>
            </div>
          </div>

          {/* 3. Available Balance Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#111111] border border-brand-blue/30 bg-gradient-to-br from-brand-blue/[0.04] to-transparent shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-brand-blue/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Available Balance</span>
              <div className="w-9 h-9 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center border border-brand-blue/20">
                <Wallet size={18} weight="bold" />
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-brand-blue tracking-tight">
                {currencySymbol}{displayedBalance}
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-white/40">
                Active wallet funds ready to spend
              </span>
            </div>
          </div>

        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="w-full p-12 rounded-[2rem] border border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl flex flex-col items-center justify-center gap-3">
            <Spinner className="animate-spin text-3xl text-brand-blue" />
            <span className="text-xs font-bold text-slate-400">Loading ledger records...</span>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && transactions.length === 0 && (
          <div className="w-full p-16 rounded-[2rem] border border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-white/30">
            <Swap className="text-4xl opacity-30" />
            <p className="text-sm font-medium">No transactions recorded yet.</p>
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <>
            {/* ============================================================ */}
            {/* 1. MOBILE VIEW (< 640px): NATIVE CARD STACK (Zero Horizontal Scroll) */}
            {/* ============================================================ */}
            <div className="flex flex-col gap-3 sm:hidden">
              {transactions.map((tx, idx) => {
                const isVoucher = isVoucherTx(tx);
                const formattedRef = formatReference(tx.reference, tx.id);
                const rawCopyText = tx.reference || tx.id;
                const txKey = tx.id || tx.reference || idx.toString();

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02, duration: 0.25 }}
                    key={`mob-${txKey}`}
                    className="p-4 rounded-2xl bg-white dark:bg-[#111111] border border-black/5 dark:border-white/10 shadow-sm flex flex-col gap-3"
                  >
                    {/* Top Row: Type, Icon & Amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isVoucher ? 'bg-brand-blue/15 text-brand-blue' :
                          tx.type === 'Funding' ? 'bg-emerald-500/15 text-emerald-500' : 
                          tx.type === 'Refund' ? 'bg-brand-blue/15 text-brand-blue' : 
                          'bg-red-500/15 text-red-500'
                        }`}>
                          {isVoucher ? <Ticket weight="fill" size={18} /> : tx.type === 'Funding' || tx.type === 'Refund' ? <ArrowDownLeft weight="bold" size={18} /> : <ArrowUpRight weight="bold" size={18} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`font-bold text-xs ${isVoucher ? 'text-brand-blue dark:text-cyan-400' : 'text-slate-900 dark:text-white'}`}>
                            {isVoucher ? "Gift Card Voucher" : tx.type}
                          </span>
                          {tx.description && (
                            <span className="text-[11px] font-medium text-slate-500 dark:text-white/50 truncate max-w-[190px]">
                              {tx.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className={`font-mono text-base font-extrabold shrink-0 ${
                        isVoucher ? 'text-brand-blue dark:text-cyan-400' : tx.type === 'Funding' || tx.type === 'Refund' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                      }`}>
                        {tx.type === 'Funding' || tx.type === 'Refund' || isVoucher ? '+' : '-'}{tx.currency === 'USD' ? '$' : '₦'}{tx.amount.toLocaleString()}
                      </span>
                    </div>

                    {/* Bottom Row: Reference Tag + Status Pill + Date */}
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-700 dark:text-white/80 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md border border-black/5 dark:border-white/10 text-[10px]">
                          {formattedRef}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyReference(rawCopyText, txKey)}
                          title="Copy Reference ID"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          {copiedRef === txKey ? <Check className="text-emerald-500" size={13} weight="bold" /> : <Copy size={13} />}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === 'Success' || tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          tx.status === 'Failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {tx.status === 'Success' || tx.status === 'Completed' ? <CheckCircle weight="fill" size={11} /> : tx.status === 'Failed' ? <WarningCircle weight="fill" size={11} /> : <Clock weight="fill" size={11} />}
                          {tx.status}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-white/40 font-medium">
                          {formatShortDate(tx.created_at)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ============================================================ */}
            {/* 2. TABLET VIEW (640px – 1024px): STREAMLINED FIT-TO-WIDTH TABLE */}
            {/* ============================================================ */}
            <div className="hidden sm:block lg:hidden w-full p-1.5 rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-3xl shadow-md">
              <div className="bg-slate-50 dark:bg-[#0A0A0A] rounded-[calc(1.5rem-0.375rem)] overflow-hidden">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 bg-slate-100 dark:bg-[#111111] text-slate-500 dark:text-white/40 text-[10px] uppercase tracking-[0.15em] font-bold">
                      <th className="p-3.5 px-4">Transaction</th>
                      <th className="p-3.5 px-3">Reference</th>
                      <th className="p-3.5 px-3 text-center">Status</th>
                      <th className="p-3.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, idx) => {
                      const isVoucher = isVoucherTx(tx);
                      const formattedRef = formatReference(tx.reference, tx.id);
                      const rawCopyText = tx.reference || tx.id;
                      const txKey = tx.id || tx.reference || idx.toString();

                      return (
                        <tr 
                          key={`tab-${txKey}`}
                          className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                          {/* Type, Description & Date */}
                          <td className="p-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isVoucher ? 'bg-brand-blue/15 text-brand-blue' :
                                tx.type === 'Funding' ? 'bg-emerald-500/15 text-emerald-500' : 
                                tx.type === 'Refund' ? 'bg-brand-blue/15 text-brand-blue' : 
                                'bg-red-500/15 text-red-500'
                              }`}>
                                {isVoucher ? <Ticket weight="fill" size={15} /> : tx.type === 'Funding' || tx.type === 'Refund' ? <ArrowDownLeft weight="bold" size={15} /> : <ArrowUpRight weight="bold" size={15} />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={`font-bold text-xs ${isVoucher ? 'text-brand-blue dark:text-cyan-400' : 'text-slate-900 dark:text-white'}`}>
                                  {isVoucher ? "Gift Card Voucher" : tx.type}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-white/40 font-medium">
                                  {formatShortDate(tx.created_at)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Reference ID + Copy */}
                          <td className="p-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-white/90 bg-slate-200/70 dark:bg-white/10 px-2 py-0.5 rounded border border-black/5 dark:border-white/10">
                                {formattedRef}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyReference(rawCopyText, txKey)}
                                title="Copy Reference ID"
                                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                {copiedRef === txKey ? <Check className="text-emerald-500" size={12} weight="bold" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-3.5 px-3 text-center">
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              tx.status === 'Success' || tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              tx.status === 'Failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {tx.status === 'Success' || tx.status === 'Completed' ? <CheckCircle weight="fill" size={11} /> : tx.status === 'Failed' ? <WarningCircle weight="fill" size={11} /> : <Clock weight="fill" size={11} />}
                              {tx.status}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="p-3.5 px-4 text-right">
                            <span className={`font-mono text-sm font-bold ${
                              isVoucher ? 'text-brand-blue dark:text-cyan-400' : tx.type === 'Funding' || tx.type === 'Refund' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                            }`}>
                              {tx.type === 'Funding' || tx.type === 'Refund' || isVoucher ? '+' : '-'}{tx.currency === 'USD' ? '$' : '₦'}{tx.amount.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ============================================================ */}
            {/* 3. DESKTOP VIEW (>= 1024px): FULL DOUBLE-BEZEL LEDGER TABLE (FIXED WIDTHS & NO CLIPPING) */}
            {/* ============================================================ */}
            <div className="hidden lg:block w-full p-1.5 rounded-[2rem] border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-3xl shadow-xl dark:shadow-none transition-colors overflow-hidden">
              <div className="bg-slate-50 dark:bg-[#0A0A0A] rounded-[calc(2rem-0.375rem)] border border-transparent overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/20">
                <table className="w-full text-left border-collapse table-fixed min-w-[760px]">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 bg-slate-100 dark:bg-[#111111] text-slate-500 dark:text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">
                      <th className="p-4 px-5 w-[20%]">Reference ID</th>
                      <th className="p-4 px-4 w-[36%]">Type & Description</th>
                      <th className="p-4 px-4 w-[18%] whitespace-nowrap">Date & Time</th>
                      <th className="p-4 px-3 w-[12%] text-center">Status</th>
                      <th className="p-4 px-5 w-[14%] text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, idx) => {
                      const isVoucher = isVoucherTx(tx);
                      const formattedRef = formatReference(tx.reference, tx.id);
                      const rawCopyText = tx.reference || tx.id;
                      const txKey = tx.id || tx.reference || idx.toString();

                      return (
                        <motion.tr 
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02, duration: 0.25 }}
                          key={`desk-${txKey}`} 
                          className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                        >
                          {/* Clean Abbreviated Reference ID + 1-Click Copy */}
                          <td className="p-4 px-5 w-[20%]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-200/70 dark:bg-white/10 px-2.5 py-1 rounded-lg border border-black/5 dark:border-white/10 truncate">
                                {formattedRef}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyReference(rawCopyText, txKey)}
                                title="Copy Reference ID"
                                className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
                              >
                                {copiedRef === txKey ? <Check className="text-emerald-500" size={14} weight="bold" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>

                          {/* Type & Description with safe truncation */}
                          <td className="p-4 px-4 w-[36%]">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isVoucher ? 'bg-brand-blue/15 text-brand-blue' :
                                tx.type === 'Funding' ? 'bg-emerald-500/15 text-emerald-500' : 
                                tx.type === 'Refund' ? 'bg-brand-blue/15 text-brand-blue' : 
                                'bg-red-500/15 text-red-500'
                              }`}>
                                {isVoucher ? <Ticket weight="fill" /> : tx.type === 'Funding' || tx.type === 'Refund' ? <ArrowDownLeft weight="bold" /> : <ArrowUpRight weight="bold" />}
                              </div>

                              <div className="flex flex-col min-w-0 flex-1">
                                <span className={`font-bold text-xs truncate ${isVoucher ? 'text-brand-blue dark:text-cyan-400' : 'text-slate-900 dark:text-white'}`}>
                                  {isVoucher ? "Gift Card Voucher" : tx.type}
                                </span>
                                {tx.description && (
                                  <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50 truncate max-w-full" title={tx.description}>
                                    {tx.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Date & Time (Whitespace Nowrap to prevent awkward line breaks) */}
                          <td className="p-4 px-4 w-[18%] text-xs text-slate-500 dark:text-white/50 font-medium whitespace-nowrap">
                            {formatDate(tx.created_at)}
                          </td>

                          {/* Status */}
                          <td className="p-4 px-3 w-[12%] text-center">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              tx.status === 'Success' || tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              tx.status === 'Failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {tx.status === 'Success' || tx.status === 'Completed' ? <CheckCircle weight="fill" /> : tx.status === 'Failed' ? <WarningCircle weight="fill" /> : <Clock weight="fill" />}
                              {tx.status}
                            </div>
                          </td>

                          {/* Amount: Fully Visible and Right-Aligned */}
                          <td className="p-4 px-5 w-[14%] text-right">
                            <span className={`font-mono text-sm font-extrabold whitespace-nowrap ${
                              isVoucher ? 'text-brand-blue dark:text-cyan-400' : tx.type === 'Funding' || tx.type === 'Refund' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                            }`}>
                              {tx.type === 'Funding' || tx.type === 'Refund' || isVoucher ? '+' : '-'}{tx.currency === 'USD' ? '$' : '₦'}{tx.amount.toLocaleString()}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
