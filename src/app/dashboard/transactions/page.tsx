"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Swap, Spinner, Receipt, WarningCircle, CheckCircle, Clock } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  created_at: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setTransactions(data);
      setLoading(false);
    };

    fetchTransactions();
  }, []);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(d);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 relative overflow-hidden transition-colors duration-500">
      
      {/* Ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-blue/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#10B981]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto flex flex-col gap-12 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col gap-3">
          <div className="w-fit rounded-full px-3 py-1 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-2 mb-2 shadow-sm dark:shadow-none">
            <Receipt className="text-slate-500 dark:text-white/60" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">Financial Ledger</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-white/40">
            Transactions.
          </h1>
          <p className="text-slate-500 dark:text-white/40 text-sm max-w-md">Complete history of your wallet funding, number purchases, and automatic refunds.</p>
        </div>

        {/* Double-Bezel Table Container */}
        <div className="w-full p-1.5 rounded-[2rem] border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-3xl shadow-2xl dark:shadow-none">
          <div className="bg-slate-50 dark:bg-[#0A0A0A] rounded-[calc(2rem-0.375rem)] overflow-hidden shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-transparent">
            
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 bg-slate-100 dark:bg-[#111111]">
                    <th className="p-6 text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.2em]">Transaction ID</th>
                    <th className="p-6 text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.2em]">Type</th>
                    <th className="p-6 text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.2em]">Date & Time</th>
                    <th className="p-6 text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.2em]">Status</th>
                    <th className="p-6 text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.2em] text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <Spinner className="animate-spin text-2xl text-slate-400 dark:text-white/20 mx-auto" />
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-16 text-center text-slate-400 dark:text-white/30">
                        <div className="flex flex-col items-center gap-3">
                          <Swap className="text-4xl text-slate-300 dark:text-white/10" />
                          <p>No transactions found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        key={tx.id} 
                        className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                      >
                        {/* ID / Reference */}
                        <td className="p-6">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-sm text-slate-600 dark:text-white/80">TXN-{tx.id.split('-')[0].toUpperCase()}</span>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              tx.type === 'Funding' ? 'bg-[#10B981]/10 text-[#10B981]' : 
                              tx.type === 'Refund' ? 'bg-brand-blue/10 text-brand-blue' : 
                              'bg-red-500/10 text-red-500'
                            }`}>
                              {tx.type === 'Funding' || tx.type === 'Refund' ? <ArrowDownLeft weight="bold" /> : <ArrowUpRight weight="bold" />}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white/90">{tx.type}</span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="p-6 text-sm text-slate-500 dark:text-white/50">
                          {formatDate(tx.created_at)}
                        </td>

                        {/* Status */}
                        <td className="p-6">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                            tx.status === 'Success' ? 'bg-[#10B981]/10 text-[#10B981]' :
                            tx.status === 'Failed' ? 'bg-red-500/10 text-red-400' :
                            'bg-orange-500/10 text-orange-400'
                          }`}>
                            {tx.status === 'Success' ? <CheckCircle weight="fill" /> : tx.status === 'Failed' ? <WarningCircle weight="fill" /> : <Clock weight="fill" />}
                            {tx.status}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="p-6 text-right">
                          <span className={`font-mono text-base font-semibold ${
                            tx.type === 'Funding' || tx.type === 'Refund' ? 'text-[#10B981]' : 'text-slate-900 dark:text-white'
                          }`}>
                            {tx.type === 'Funding' || tx.type === 'Refund' ? '+' : '-'}{tx.currency === 'USD' ? '$' : '₦'}{tx.amount.toLocaleString()}
                          </span>
                        </td>

                      </motion.tr>
                    ))
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
