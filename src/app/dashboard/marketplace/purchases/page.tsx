"use client";

import { useState, useEffect } from "react";
import { Receipt, CaretLeft, Copy, CheckCircle, Spinner, WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

interface DigitalOrder {
  id: string;
  provider_api_id: string;
  product_name: string;
  price_paid_usd: number;
  currency_used: string;
  account_logs: string;
  status: string;
  purchased_at: string;
}

export default function MarketplacePurchasesPage() {
  const [orders, setOrders] = useState<DigitalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("digital_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false });
      
    if (data) setOrders(data);
    setIsLoading(false);
  };

  const copyLogs = (id: string, logs: string) => {
    navigator.clipboard.writeText(logs);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const reportIssue = async (orderId: string) => {
    if (!confirm("Are you sure you want to report an issue with this account? An admin will review it and process your refund if valid.")) return;
    
    setReportingId(orderId);
    try {
      const res = await fetch("/api/marketplace/report-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchOrders();
      } else {
        alert(data.error || "Failed to report issue.");
      }
    } catch (err) {
      alert("An unexpected error occurred.");
    } finally {
      setReportingId(null);
    }
  };

  const isEligibleForReport = (purchasedAt: string, status: string) => {
    if (status !== 'Completed') return false;
    const purchaseTime = new Date(purchasedAt).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - purchaseTime) / (1000 * 60);
    return diffMinutes <= 15;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 dark:bg-[#111] p-8 rounded-3xl text-white shadow-xl dark:shadow-none border border-transparent dark:border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 w-full">
          <div className="flex items-center gap-3 mb-3">
            <a href="/dashboard/marketplace" className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors">
              <CaretLeft size={24} weight="bold" />
            </a>
            <h1 className="text-3xl font-bold tracking-tight">Purchase History</h1>
          </div>
          <p className="text-slate-400 text-sm">
            View the account logs and credentials for your digital purchases.
          </p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden p-6">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Spinner size={32} className="animate-spin text-brand-blue" />
          </div>
        ) : orders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <Receipt size={48} weight="duotone" className="opacity-50 mb-4" />
            <p className="font-bold text-lg text-slate-700 dark:text-white">No purchases yet</p>
            <p className="text-sm">Head back to the marketplace to buy digital goods.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const eligibleForReport = isEligibleForReport(order.purchased_at, order.status);
              
              return (
                <div key={order.id} className="border border-black/5 dark:border-white/10 rounded-2xl p-6 bg-slate-50 dark:bg-[#0A0A0A] relative">
                  
                  {/* Status Badge */}
                  <div className="absolute top-6 right-6">
                    {order.status === 'Completed' && (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-500/20">
                        {order.status}
                      </span>
                    )}
                    {order.status === 'Refunded' && (
                      <span className="bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-slate-500/20">
                        {order.status}
                      </span>
                    )}
                    {order.status === 'Issue Reported' && (
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-amber-500/20">
                        Reviewing Issue
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4 pb-4 border-b border-black/5 dark:border-white/5 pr-24">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                        {order.product_name || "Digital Account"}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        Order ID: {order.id}
                      </p>
                    </div>
                    <div className="md:text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Paid: <span className="text-brand-blue">${order.price_paid_usd.toFixed(2)}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(order.purchased_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Account Logs & Credentials</p>
                      
                      <div className="flex items-center gap-3">
                        {eligibleForReport && (
                          <button
                            onClick={() => reportIssue(order.id)}
                            disabled={reportingId === order.id}
                            className="text-[11px] font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1 border border-red-500/20"
                          >
                            {reportingId === order.id ? <Spinner className="animate-spin" /> : <WarningCircle weight="bold" />}
                            Report Issue
                          </button>
                        )}
                        <button 
                          onClick={() => copyLogs(order.id, order.account_logs)}
                          className="text-[11px] font-bold flex items-center gap-1 text-slate-600 bg-white dark:bg-black dark:text-slate-300 hover:text-brand-blue dark:hover:text-brand-blue transition-colors px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/10 shadow-sm"
                        >
                          {copiedId === order.id ? <><CheckCircle weight="fill" className="text-emerald-500"/> Copied</> : <><Copy weight="bold" /> Copy Logs</>}
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 text-emerald-400 font-mono text-sm p-5 rounded-xl overflow-x-auto whitespace-pre-wrap shadow-inner border border-white/5">
                      {order.account_logs}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
