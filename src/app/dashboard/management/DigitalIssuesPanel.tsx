"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { WarningCircle, CheckCircle, XCircle, Spinner } from "@phosphor-icons/react";

interface ReportedIssue {
  id: string;
  user_id: string;
  provider_api_id: string;
  product_name: string;
  price_paid_usd: number;
  currency_used: string;
  status: string;
  issue_reported_at: string;
  purchased_at: string;
  users: {
    email: string;
  };
}

export default function DigitalIssuesPanel() {
  const [issues, setIssues] = useState<ReportedIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setIsLoading(true);
    // Fetch all digital orders where status is 'Issue Reported'
    const { data, error } = await supabase
      .from("digital_orders")
      .select(`
        *,
        users:user_id ( email )
      `)
      .eq("status", "Issue Reported")
      .order("issue_reported_at", { ascending: false });

    if (data) {
      // Cast safely since postgrest relation typing can be tricky
      setIssues(data as any);
    }
    setIsLoading(false);
  };

  const processRefund = async (orderId: string) => {
    if (!confirm("Are you sure you want to approve this refund? The funds will be credited to the user's wallet immediately.")) return;
    
    setProcessingId(orderId);
    try {
      const res = await fetch("/api/admin/refund-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(data.message);
        setIssues(issues.filter(i => i.id !== orderId));
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Unexpected error processing refund.");
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRefund = async (orderId: string) => {
    if (!confirm("Are you sure you want to REJECT this refund? The order status will be reverted to Completed.")) return;
    
    setProcessingId(orderId);
    try {
      const { error } = await supabase
        .from('digital_orders')
        .update({ status: 'Completed' })
        .eq('id', orderId);

      if (error) throw error;
      
      alert("Refund rejected. Order marked as completed.");
      setIssues(issues.filter(i => i.id !== orderId));
    } catch (err: any) {
      alert("Error rejecting refund: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#111] p-6 md:p-8 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <WarningCircle size={28} className="text-amber-500" weight="fill" />
          Reported Account Issues
        </h2>
        <span className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
          {issues.length} Pending
        </span>
      </div>

      <div className="text-sm text-slate-500 dark:text-slate-400">
        Users have 15 minutes to report a bad account. Verify the refund with Buy-accs.net before approving here.
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Spinner className="animate-spin text-slate-400" size={24} />
        </div>
      ) : issues.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-slate-50 dark:bg-black/20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <CheckCircle size={48} className="mx-auto mb-3 opacity-20" weight="duotone" />
          <p className="font-bold">All clear!</p>
          <p className="text-sm">No pending issues reported.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map(issue => (
            <div key={issue.id} className="p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-slate-50 dark:bg-[#0A0A0A] flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div>
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  {issue.product_name || "Unknown Product"}
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Order ID: <span className="font-mono">{issue.id}</span></p>
                  <p>User: <span className="font-bold text-slate-700 dark:text-slate-300">{issue.users?.email || issue.user_id}</span></p>
                  <p>Reported: {new Date(issue.issue_reported_at).toLocaleString()}</p>
                  <p>Amount to Refund: <span className="font-bold text-red-500">${issue.price_paid_usd.toFixed(2)}</span></p>
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                <button
                  onClick={() => rejectRefund(issue.id)}
                  disabled={processingId === issue.id}
                  className="flex-1 md:flex-none px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => processRefund(issue.id)}
                  disabled={processingId === issue.id}
                  className="flex-1 md:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === issue.id ? <Spinner className="animate-spin" /> : "Approve Refund"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
