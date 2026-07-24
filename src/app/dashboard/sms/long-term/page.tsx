"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClockCounterClockwise, Plus, Phone, Spinner, CheckCircle, WarningCircle, CaretDown, Calendar, Tag, ShieldCheck } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useCurrency } from "@/components/CurrencyContext";

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

const DURATION_PRESETS = [
  { days: 1, label: "1 Day" },
  { days: 3, label: "3 Days" },
  { days: 7, label: "7 Days (1 Wk)", discount: "5% OFF" },
  { days: 14, label: "14 Days (2 Wks)", discount: "10% OFF" },
  { days: 30, label: "30 Days (1 Mo)", discount: "20% OFF" },
  { days: 60, label: "60 Days (2 Mos)", discount: "30% OFF" },
];

export default function LongTermRentalsPage() {
  const { currency } = useCurrency();
  const [rentals, setRentals] = useState<LongTermRental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Rent Form State
  const [isRenting, setIsRenting] = useState(false);
  const [selectedService, setSelectedService] = useState(COMMON_SERVICES[0]);
  const [selectedCountry, setSelectedCountry] = useState(COMMON_COUNTRIES[0]);
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>("");
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  const [rentStatus, setRentStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [rentMessage, setRentMessage] = useState("");
  
  const [price, setPrice] = useState<number | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  // Extend Rental Modal State
  const [extendingRental, setExtendingRental] = useState<LongTermRental | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchRentals();
  }, []);

  const activeDays = isCustomDays ? (parseInt(customDays) || 30) : selectedDays;

  useEffect(() => {
    if (isRenting) {
      fetchPrice();
    }
  }, [selectedService, selectedCountry, activeDays, isRenting, currency]);

  const fetchPrice = async () => {
    setIsPriceLoading(true);
    try {
      const res = await fetch("/api/sms/long-term/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: selectedService.name,
          country: selectedCountry.id,
          days: activeDays,
          currency: currency
        })
      });
      const data = await res.json();
      if (data.success && data.cost) {
        setPrice(data.cost);
        setDiscountPercent(data.discountPercentage || 0);
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
          days: activeDays,
          currency: currency,
          autoRenew: autoRenew
        })
      });

      const data = await res.json();
      if (data.success) {
        setRentStatus('success');
        setRentMessage(`🎉 Rented ${data.data.phone_number} for ${activeDays} days successfully!`);
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
      setRentals(rentals.map(r => r.id === id ? { ...r, auto_renew: currentValue } : r));
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-32 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 dark:bg-[#111] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <div className="w-fit rounded-full px-3 py-1 bg-brand-blue/20 border border-brand-blue/30 text-brand-blue text-[10px] font-extrabold uppercase tracking-widest mb-3">
            Flexible Duration Rentals (1 - 365 Days)
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <ClockCounterClockwise size={36} className="text-brand-blue" weight="duotone" />
            Dedicated SMS Rentals
          </h1>
          <p className="text-slate-400 max-w-xl text-sm">
            Rent dedicated lines for 1 day, 7 days, 30 days, or custom durations. Keep your numbers for WhatsApp, Telegram, or Discord as long as you need.
          </p>
        </div>
        <button
          onClick={() => { setIsRenting(true); setRentStatus('idle'); }}
          className="relative z-10 bg-brand-blue hover:bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-[0_4px_12px_rgba(0,112,243,0.3)] transition-all active:scale-95 text-sm"
        >
          <Plus size={20} weight="bold" />
          Rent New Number
        </button>
      </div>

      {/* Active Rentals Table */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Your Active Dedicated Rentals</h2>
        
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size={40} className="animate-spin text-brand-blue" />
          </div>
        ) : rentals.length === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center">
            <Phone size={48} className="opacity-20 mb-4" />
            <p className="text-sm font-medium">You don't have any active rented numbers yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                  <th className="pb-4 px-4">Service & Number</th>
                  <th className="pb-4 px-4">Expires In</th>
                  <th className="pb-4 px-4 text-center">Status</th>
                  <th className="pb-4 px-4 text-right">Auto Renew</th>
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
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-base">{rental.phone_number}</span>
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{rental.service} • {rental.country}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {rental.status === 'Active' ? (
                          <div className={`text-sm font-bold flex items-center gap-1.5 ${isExpiringSoon ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            <Calendar size={16} />
                            {daysLeft} days left
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

      {/* RENT NEW NUMBER MODAL WITH FLEXIBLE DURATION SELECTION */}
      <AnimatePresence>
        {isRenting && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#111] p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl relative border border-black/5 dark:border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ClockCounterClockwise size={24} className="text-brand-blue" /> Select Rental Duration
                </h2>
                <button onClick={() => setIsRenting(false)} className="text-slate-400 hover:text-white text-xs font-bold">
                  ✕ Close
                </button>
              </div>

              {rentStatus === 'idle' || rentStatus === 'error' ? (
                <div className="flex flex-col gap-5">
                  
                  {/* Service Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Select Service</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-brand-blue transition-all"
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
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Select Country</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-brand-blue transition-all"
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

                  {/* FLEXIBLE RENTAL DURATION PICKER */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 flex items-center justify-between">
                      Rental Duration Choice
                      {discountPercent > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Tag size={12} weight="fill" /> {discountPercent}% Bulk Discount Applied
                        </span>
                      )}
                    </label>

                    {/* Preset Duration Chips */}
                    <div className="grid grid-cols-3 gap-2">
                      {DURATION_PRESETS.map((preset) => (
                        <button
                          type="button"
                          key={preset.days}
                          onClick={() => {
                            setSelectedDays(preset.days);
                            setIsCustomDays(false);
                          }}
                          className={`p-3 rounded-2xl border text-left flex flex-col gap-0.5 transition-all ${
                            !isCustomDays && selectedDays === preset.days
                              ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20"
                              : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                          }`}
                        >
                          <span className="text-xs font-extrabold">{preset.label}</span>
                          {preset.discount && (
                            <span className={`text-[9px] font-bold ${!isCustomDays && selectedDays === preset.days ? "text-emerald-300" : "text-emerald-500"}`}>
                              {preset.discount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Custom Days Input */}
                    <div className="mt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsCustomDays(true)}
                        className={`px-4 py-3 rounded-2xl border text-xs font-bold transition-all shrink-0 ${
                          isCustomDays
                            ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20"
                            : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white"
                        }`}
                      >
                        Custom Days:
                      </button>

                      {isCustomDays && (
                        <input
                          type="number"
                          min="1"
                          max="365"
                          placeholder="e.g. 10"
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-black border border-brand-blue px-4 py-2.5 rounded-2xl font-mono font-bold text-sm text-slate-900 dark:text-white outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Auto Renew Toggle */}
                  <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 cursor-pointer">
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">Auto-Renew Duration</div>
                      <div className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">Automatically renew when timer expires</div>
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
                    <div className="p-3.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-2xl flex items-center gap-2 border border-red-500/20">
                      <WarningCircle size={18} className="shrink-0" />
                      {rentMessage}
                    </div>
                  )}

                  {/* Price Summary */}
                  <div className="bg-brand-blue/10 p-4 rounded-2xl border border-brand-blue/20 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-white/80">Total Duration Cost</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{activeDays} Days Dedicated Access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPriceLoading ? (
                        <Spinner size={20} className="animate-spin text-brand-blue" />
                      ) : price !== null ? (
                        <span className="text-xl font-extrabold text-brand-blue font-mono">
                          {currency === 'USD' ? '$' : '₦'}{price.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-red-500">Unavailable</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setIsRenting(false)}
                      className="flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleRent}
                      disabled={isPriceLoading || price === null}
                      className="flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs text-white bg-brand-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2"
                    >
                      Pay & Rent Number
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  {rentStatus === 'loading' ? (
                    <>
                      <Spinner size={48} className="animate-spin text-brand-blue" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Provisioning dedicated number...</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={64} className="text-emerald-500" weight="fill" />
                      <p className="font-bold text-slate-900 dark:text-white text-base leading-relaxed">{rentMessage}</p>
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
