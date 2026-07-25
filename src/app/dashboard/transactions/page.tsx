"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Swap, Spinner, Receipt, WarningCircle, CheckCircle, Clock, Ticket, Copy, Check } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [txRes, walletTxRes] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

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

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 relative overflow-hidden transition-colors duration-500">
      
      {/* Ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-blue/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#10B981]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto flex flex-col gap-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <div className="w-fit rounded-full px-3 py-1 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-2 mb-1 shadow-sm">
            <Receipt className="text-brand-blue" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-600 dark:text-white/60">Financial Ledger</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Transaction History
          </h1>
          <p className="text-slate-500 dark:text-white/50 text-xs md:text-sm max-w-md">
            Complete record of your wallet funding, virtual number purchases, gift card vouchers, and automatic refunds.
          </p>
        </div>

        {/* Double-Bezel Table Container */}
        <div className="w-full p-1.5 rounded-[2rem] border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-3xl shadow-xl dark:shadow-none transition-colors">
          <div className="bg-slate-50 dark:bg-[#0A0A0A] rounded-[calc(2rem-0.375rem)] overflow-hidden border border-transparent">
            
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 bg-slate-100 dark:bg-[#111111] text-slate-500 dark:text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">
                    <th className="p-5 px-6">Reference ID</th>
                    <th className="p-5 px-6">Type & Description</th>
                    <th className="p-5 px-6">Date & Time</th>
                    <th className="p-5 px-6 text-center">Status</th>
                    <th className="p-5 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-16 text-center">
                        <Spinner className="animate-spin text-2xl text-brand-blue mx-auto" />
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-16 text-center text-slate-400 dark:text-white/30">
                        <div className="flex flex-col items-center gap-3">
                          <Swap className="text-4xl opacity-30" />
                          <p className="text-sm font-medium">No transactions recorded yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, idx) => {
                      const isVoucher = isVoucherTx(tx);
                      const formattedRef = formatReference(tx.reference, tx.id);
                      const rawCopyText = tx.reference || tx.id;
                      const txKey = tx.id || tx.reference || idx.toString();

                      return (
                        <motion.tr 
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03, duration: 0.3 }}
                          key={txKey} 
                          className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                        >
                          {/* Clean Abbreviated Reference ID + 1-Click Copy */}
                          <td className="p-5 px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-200/70 dark:bg-white/10 px-2.5 py-1 rounded-lg border border-black/5 dark:border-white/10">
                                {formattedRef}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyReference(rawCopyText, txKey)}
                                title="Copy Reference ID"
                                className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                {copiedRef === txKey ? <Check className="text-emerald-500" size={14} weight="bold" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>

                          {/* Type & Description */}
                          <td className="p-5 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isVoucher ? 'bg-brand-blue/15 text-brand-blue' :
                                tx.type === 'Funding' ? 'bg-emerald-500/15 text-emerald-500' : 
                                tx.type === 'Refund' ? 'bg-brand-blue/15 text-brand-blue' : 
                                'bg-red-500/15 text-red-500'
                              }`}>
                                {isVoucher ? <Ticket weight="fill" /> : tx.type === 'Funding' || tx.type === 'Refund' ? <ArrowDownLeft weight="bold" /> : <ArrowUpRight weight="bold" />}
                              </div>

                              <div className="flex flex-col">
                                <span className={`font-bold text-xs ${isVoucher ? 'text-brand-blue dark:text-cyan-400' : 'text-slate-900 dark:text-white'}`}>
                                  {isVoucher ? "Gift Card Voucher" : tx.type}
                                </span>
                                {tx.description && (
                                  <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50 truncate max-w-xs">
                                    {tx.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="p-5 px-6 text-xs text-slate-500 dark:text-white/50 font-medium">
                            {formatDate(tx.created_at)}
                          </td>

                          {/* Status */}
                          <td className="p-5 px-6 text-center">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              tx.status === 'Success' || tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              tx.status === 'Failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {tx.status === 'Success' || tx.status === 'Completed' ? <CheckCircle weight="fill" /> : tx.status === 'Failed' ? <WarningCircle weight="fill" /> : <Clock weight="fill" />}
                              {tx.status}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="p-5 px-6 text-right">
                            <span className={`font-mono text-sm font-bold ${
                              isVoucher ? 'text-brand-blue dark:text-cyan-400' : tx.type === 'Funding' || tx.type === 'Refund' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                            }`}>
                              {tx.type === 'Funding' || tx.type === 'Refund' || isVoucher ? '+' : '-'}{tx.currency === 'USD' ? '$' : '₦'}{tx.amount.toLocaleString()}
                            </span>
                          </td>

                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
