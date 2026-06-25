"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Hash, Spinner, Copy, CheckCircle, WarningCircle, Clock } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

interface Rental {
  id: string;
  order_id: string;
  phone_number: string;
  service: string;
  status: string;
  sms_code: string | null;
  cost: number;
  currency: string;
  created_at: string;
}

export default function HistoryPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const fetchRentals = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      const { data } = await supabase
        .from("rentals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data && isMounted) setRentals(data);
      if (isMounted) setLoading(false);

      if (!isMounted) return;

      // Create a uniquely named channel to avoid conflicts during React StrictMode re-mounts
      channel = supabase.channel(`realtime_rentals_${user.id}_${Date.now()}`);
      
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rentals', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRentals((current) => [payload.new as Rental, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setRentals((current) =>
              current.map((rental) =>
                rental.id === payload.new.id ? (payload.new as Rental) : rental
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setRentals((current) =>
              current.filter((rental) => rental.id !== payload.old.id)
            );
          }
        }
      ).subscribe();
    };

    fetchRentals();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(d);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 relative overflow-hidden transition-colors duration-500">
      
      {/* Ambient glows */}
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[#60A5FA]/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto flex flex-col gap-12 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col gap-3">
          <div className="w-fit rounded-full px-3 py-1 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-2 mb-2 shadow-sm dark:shadow-none">
            <Hash className="text-slate-500 dark:text-white/60" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">SMS Archive</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-white/40">
            Number History.
          </h1>
          <p className="text-slate-500 dark:text-white/40 text-sm max-w-md">Access your previously purchased virtual numbers and their received OTP verification codes.</p>
        </div>

        {/* Double-Bezel Table Container */}
        <div className="w-full p-1.5 rounded-[2rem] border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-3xl shadow-2xl dark:shadow-none">
          <div className="bg-slate-50 dark:bg-[#0A0A0A] rounded-[calc(2rem-0.375rem)] overflow-hidden shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-transparent">
            
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 bg-slate-100 dark:bg-[#111111]">
                    <th className="p-6 text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.2em]">Service & Date</th>
                    <th className="p-6 text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.2em]">Phone Number</th>
                    <th className="p-6 text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.2em]">Cost</th>
                    <th className="p-6 text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.2em]">Status</th>
                    <th className="p-6 text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.2em] text-right">OTP Code</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <Spinner className="animate-spin text-2xl text-slate-400 dark:text-white/20 mx-auto" />
                      </td>
                    </tr>
                  ) : rentals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-16 text-center text-slate-400 dark:text-white/30">
                        <div className="flex flex-col items-center gap-3">
                          <Hash className="text-4xl text-slate-300 dark:text-white/10" />
                          <p>No numbers purchased yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rentals.map((rental, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        key={rental.id} 
                        className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                      >
                        {/* Service & Date */}
                        <td className="p-6">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-900 dark:text-white/90">{rental.service}</span>
                            <span className="text-xs text-slate-500 dark:text-white/40">{formatDate(rental.created_at)}</span>
                          </div>
                        </td>

                        {/* Phone Number */}
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-base text-brand-blue">{rental.phone_number}</span>
                            <button 
                              onClick={() => copyToClipboard(rental.phone_number, rental.id + "phone")}
                              className="text-slate-400 hover:text-slate-900 dark:text-white/30 dark:hover:text-white transition-colors"
                            >
                              {copiedId === rental.id + "phone" ? <CheckCircle className="text-[#10B981]" weight="fill" /> : <Copy />}
                            </button>
                          </div>
                        </td>

                        {/* Cost */}
                        <td className="p-6">
                          <span className="font-mono text-sm text-slate-600 dark:text-white/70">
                            {rental.currency === 'USD' ? '$' : '₦'}{rental.cost}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="p-6">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                            rental.status === 'Received' ? 'bg-[#10B981]/10 text-[#10B981]' :
                            rental.status === 'Refunded' || rental.status === 'Cancelled' ? 'bg-red-500/10 text-red-400' :
                            'bg-orange-500/10 text-orange-400'
                          }`}>
                            {rental.status === 'Received' ? <CheckCircle weight="fill" /> : rental.status === 'Refunded' || rental.status === 'Cancelled' ? <WarningCircle weight="fill" /> : <Clock weight="fill" className="animate-pulse" />}
                            {rental.status}
                          </div>
                        </td>

                        {/* OTP Code */}
                        <td className="p-6 text-right">
                          {rental.sms_code ? (
                            <div className="inline-flex items-center gap-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 px-3 py-1.5 rounded-lg shadow-sm dark:shadow-none">
                              <span className="font-mono text-lg font-bold tracking-widest text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-md">
                                {rental.sms_code}
                              </span>
                              <button 
                                onClick={() => copyToClipboard(rental.sms_code!, rental.id + "code")}
                                className="text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-colors"
                              >
                                {copiedId === rental.id + "code" ? <CheckCircle className="text-[#10B981]" weight="fill" /> : <Copy />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 dark:text-white/30">N/A</span>
                          )}
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
