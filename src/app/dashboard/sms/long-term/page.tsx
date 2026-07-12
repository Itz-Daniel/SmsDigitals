"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClockCounterClockwise, Plus, Phone, Spinner, CheckCircle, WarningCircle, CaretDown } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";

interface LongTermRental {
  id: string;
  provider: string;
  provider_order_id: string;
  phone_number: string;
  service: string;
  country: string;
  price_paid: number;
  currency: string;
  expires_at: string;
  auto_renew: boolean;
  status: string;
}

const COMMON_SERVICES = [
  { id: "whatsapp", name: "WhatsApp" },
  { id: "telegram", name: "Telegram" },
  { id: "instagram", name: "Instagram" },
  { id: "facebook", name: "Facebook" },
  { id: "google", name: "Google / Gmail" },
  { id: "tiktok", name: "TikTok" },
  { id: "twitter", name: "Twitter / X" },
  { id: "discord", name: "Discord" },
  { id: "tinder", name: "Tinder" },
];

const COMMON_COUNTRIES = [
  { id: "usa", name: "United States" },
  { id: "canada", name: "Canada" },
  { id: "england", name: "United Kingdom" },
  { id: "germany", name: "Germany" },
  { id: "france", name: "France" },
  { id: "brazil", name: "Brazil" },
  { id: "indonesia", name: "Indonesia" },
];

import { useCurrency } from "@/components/CurrencyContext";

export default function LongTermRentalsPage() {
  const { currency } = useCurrency();
  const [rentals, setRentals] = useState<LongTermRental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Rent Form State
  const [isRenting, setIsRenting] = useState(false);
  const [selectedService, setSelectedService] = useState(COMMON_SERVICES[0]);
  const [selectedCountry, setSelectedCountry] = useState(COMMON_COUNTRIES[0]);
  const [autoRenew, setAutoRenew] = useState(true);
  const [rentStatus, setRentStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [rentMessage, setRentMessage] = useState("");
  
  const [price, setPrice] = useState<number | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchRentals();
  }, []);

  useEffect(() => {
    if (isRenting) {
      fetchPrice();
    }
  }, [selectedService, selectedCountry, isRenting, currency]);

  const fetchPrice = async () => {
    setIsPriceLoading(true);
    try {
      const res = await fetch("/api/sms/long-term/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: selectedService.name,
          country: selectedCountry.id,
          currency: currency
        })
      });
      const data = await res.json();
      if (data.success && data.cost) {
        setPrice(data.cost);
      } else {
        setPrice(null);
      }
    } catch (e) {
      setPrice(null);
    }
    setIsPriceLoading(false);
  };

  const fetchRentals = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("long_term_rentals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRentals(data);
    }
    setIsLoading(false);
  };

  const handleRent = async () => {
    setRentStatus('loading');
    setRentMessage("");

    try {
      const res = await fetch("/api/sms/long-term/rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          country: selectedCountry.id,
          currency: currency,
          autoRenew: autoRenew
        })
      });

      const data = await res.json();
      if (data.success) {
        setRentStatus('success');
        setRentMessage(`Successfully rented ${data.data.phone_number} for 30 days!`);
        fetchRentals();
        setTimeout(() => setIsRenting(false), 3000);
      } else {
        setRentStatus('error');
        setRentMessage(data.error || "Failed to rent number");
      }
    } catch (e: any) {
      setRentStatus('error');
      setRentMessage("An unexpected error occurred.");
    }
  };

  const toggleAutoRenew = async (id: string, currentValue: boolean) => {
    // Optimistic UI update
    setRentals(rentals.map(r => r.id === id ? { ...r, auto_renew: !currentValue } : r));
    
    try {
      await fetch("/api/sms/long-term/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rental_id: id,
          action: 'toggle_auto_renew',
          autoRenewValue: !currentValue
        })
      });
    } catch (e) {
      // Revert if failed
      setRentals(rentals.map(r => r.id === id ? { ...r, auto_renew: currentValue } : r));
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 dark:bg-[#111] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <ClockCounterClockwise size={36} className="text-brand-blue" weight="duotone" />
            1-Month Rentals
          </h1>
          <p className="text-slate-400 max-w-xl">
            Rent dedicated virtual numbers for 30 days. Perfect for long-term accounts like WhatsApp Business, Telegram, or Discord. Manage auto-renewals to keep your numbers forever.
          </p>
        </div>
        <button
          onClick={() => { setIsRenting(true); setRentStatus('idle'); }}
          className="relative z-10 bg-brand-blue hover:bg-brand-blue-hover text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-[0_4px_12px_rgba(0,112,243,0.3)] transition-all active:scale-95"
        >
          <Plus size={20} weight="bold" />
          Rent New Number
        </button>
      </div>

      {/* Active Rentals Table */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Your Active Rentals</h2>
        
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size={40} className="animate-spin text-brand-blue" />
          </div>
        ) : rentals.length === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center">
            <Phone size={48} className="opacity-20 mb-4" />
            <p>You don't have any long-term rented numbers yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-400 text-sm">
                  <th className="pb-4 font-semibold px-4">Service & Number</th>
                  <th className="pb-4 font-semibold px-4">Expires In</th>
                  <th className="pb-4 font-semibold px-4 text-center">Status</th>
                  <th className="pb-4 font-semibold px-4 text-right">Auto Renew</th>
                </tr>
              </thead>
              <tbody>
                {rentals.map((rental) => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(rental.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                  const isExpiringSoon = daysLeft <= 3 && rental.status === 'Active';

                  return (
                    <tr key={rental.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white text-base">{rental.phone_number}</span>
                          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{rental.service} • {rental.country}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {rental.status === 'Active' ? (
                          <div className={`text-sm font-bold ${isExpiringSoon ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                            {daysLeft} days
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">--</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                          rental.status === 'Active' ? 'bg-brand-blue/10 text-brand-blue' :
                          rental.status === 'Expired' ? 'bg-red-500/10 text-red-500' :
                          'bg-slate-500/10 text-slate-500'
                        }`}>
                          {rental.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {rental.status === 'Active' ? (
                          <label className="inline-flex items-center cursor-pointer relative">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={rental.auto_renew}
                              onChange={() => toggleAutoRenew(rental.id, rental.auto_renew)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                          </label>
                        ) : (
                          <span className="text-slate-400 text-sm">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rent Modal */}
      <AnimatePresence>
        {isRenting && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#111] p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl relative border border-black/5 dark:border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-6">Rent New Number</h2>
              
              {rentStatus === 'idle' || rentStatus === 'error' ? (
                <div className="space-y-6">
                  {/* Service Selection */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Service</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-slate-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                        value={selectedService.id}
                        onChange={e => setSelectedService(COMMON_SERVICES.find(s => s.id === e.target.value) || COMMON_SERVICES[0])}
                      >
                        {COMMON_SERVICES.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                    </div>
                  </div>

                  {/* Country Selection */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Country</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-slate-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                        value={selectedCountry.id}
                        onChange={e => setSelectedCountry(COMMON_COUNTRIES.find(s => s.id === e.target.value) || COMMON_COUNTRIES[0])}
                      >
                        {COMMON_COUNTRIES.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                    </div>
                  </div>

                  {/* Auto Renew Toggle */}
                  <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 cursor-pointer">
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">Auto-Renew Monthly</div>
                      <div className="text-xs text-slate-500 mt-0.5">Automatically deduct balance to keep number</div>
                    </div>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={autoRenew}
                        onChange={e => setAutoRenew(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                    </div>
                  </label>

                  {rentStatus === 'error' && (
                    <div className="p-3 bg-red-500/10 text-red-500 text-sm font-bold rounded-xl flex items-center gap-2">
                      <WarningCircle size={20} />
                      {rentMessage}
                    </div>
                  )}

                  <div className="bg-brand-blue/10 p-4 rounded-xl border border-brand-blue/20 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total 30-Day Cost</span>
                    <div className="flex items-center gap-2">
                      {isPriceLoading ? (
                        <Spinner size={16} className="animate-spin text-brand-blue" />
                      ) : price !== null ? (
                        <span className="text-xl font-bold text-brand-blue">{currency === 'USD' ? '$' : '₦'}{price.toLocaleString()}</span>
                      ) : (
                        <span className="text-sm font-bold text-red-500">Unavailable</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setIsRenting(false)}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleRent}
                      disabled={isPriceLoading || price === null}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(0,112,243,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      Pay & Rent
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  {rentStatus === 'loading' ? (
                    <>
                      <Spinner size={48} className="animate-spin text-brand-blue" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">Provisioning number...</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={64} className="text-brand-blue" weight="fill" />
                      <p className="font-bold text-slate-900 dark:text-white text-lg">{rentMessage}</p>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
