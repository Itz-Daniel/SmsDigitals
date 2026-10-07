"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  ClockCounterClockwise, 
  Plus, 
  Phone, 
  Spinner, 
  CheckCircle, 
  WarningCircle, 
  CaretDown, 
  Calendar, 
  Tag, 
  ShieldCheck,
  ChatCircleText,
  Copy,
  Check,
  ArrowClockwise,
  X,
  EnvelopeSimple,
  MagnifyingGlass
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useCurrency } from "@/components/CurrencyContext";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CountryFlag } from "@/components/CountryFlag";
import { SERVICES, COUNTRIES } from "@/lib/data/sms-data";

interface RentalMessage {
  id: string | number;
  sender: string;
  text: string;
  code?: string | null;
  date: string;
}

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
  incoming_sms?: RentalMessage[];
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

const AVAILABLE_COUNTRIES = COUNTRIES.map(c => ({ id: c.iso, name: c.name }));

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
  const [selectedCountry, setSelectedCountry] = useState(AVAILABLE_COUNTRIES[0] || { id: "usa", name: "United States" });
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>("");
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  // Custom Dropdown States (Service & Country)
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  const [rentStatus, setRentStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [rentMessage, setRentMessage] = useState("");
  
  const [price, setPrice] = useState<number | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  // SMS Inbox State
  const [selectedRentalForInbox, setSelectedRentalForInbox] = useState<LongTermRental | null>(null);
  const [inboxMessages, setInboxMessages] = useState<RentalMessage[]>([]);
  const [isInboxLoading, setIsInboxLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const supabase = createClient();

  // Prevent background scroll and automatically notify floating nav to hide
  useEffect(() => {
    if (isRenting || !!selectedRentalForInbox) {
      document.body.setAttribute("data-modal-open", "true");
      document.body.classList.add("modal-open");
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.removeAttribute("data-modal-open");
        document.body.classList.remove("modal-open");
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isRenting, selectedRentalForInbox]);

  useEffect(() => {
    fetchRentals();
  }, []);

  const activeDays = isCustomDays ? (parseInt(customDays) || 30) : selectedDays;

  useEffect(() => {
    if (isRenting) {
      fetchPrice();
    }
  }, [selectedService, selectedCountry, activeDays, isRenting, currency]);

  // Live polling for open SMS inbox modal every 6 seconds
  useEffect(() => {
    if (!selectedRentalForInbox) return;
    const interval = setInterval(() => {
      fetchInboxMessages(selectedRentalForInbox.id, true);
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedRentalForInbox]);

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
      if (data.success && data.cost !== undefined) {
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
        setRentMessage(`🎉 Successfully rented ${data.data.phone_number} for ${activeDays} days!`);
        fetchRentals();
        setTimeout(() => setIsRenting(false), 2500);
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

  const openSmsInbox = (rental: LongTermRental) => {
    setSelectedRentalForInbox(rental);
    setInboxMessages(rental.incoming_sms || []);
    fetchInboxMessages(rental.id);
  };

  const fetchInboxMessages = async (rentalId: string, silent: boolean = false) => {
    if (!silent) setIsInboxLoading(true);
    try {
      const res = await fetch("/api/sms/long-term/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rental_id: rentalId })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setInboxMessages(data.messages);
        setRentals(prev => prev.map(r => 
          r.id === rentalId ? { ...r, incoming_sms: data.messages, status: data.status || r.status } : r
        ));
      }
    } catch (err) {
      console.error("Failed to check messages:", err);
    } finally {
      if (!silent) setIsInboxLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'code' | 'phone') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2500);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-36 md:pb-24 font-sans transition-colors">
      
      {/* Header Banner - Responsive Dark & Light Mode Theme */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 dark:bg-[#111] p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-black/5 dark:border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <div className="w-fit rounded-full px-3 py-1 bg-brand-blue/20 border border-brand-blue/30 text-brand-blue dark:text-cyan-400 text-[10px] font-extrabold uppercase tracking-widest mb-3">
            Flexible Duration Rentals (1 - 365 Days)
          </div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <ClockCounterClockwise size={36} className="text-brand-blue dark:text-cyan-400" weight="duotone" />
            Dedicated SMS Rentals
          </h1>
          <p className="text-slate-300 dark:text-slate-400 max-w-xl text-xs md:text-sm leading-relaxed">
            Rent dedicated virtual lines for 1 day, 7 days, 30 days, or custom durations. Keep your numbers for WhatsApp, Telegram, or Google as long as you need with real-time SMS code monitoring.
          </p>
        </div>
        <button
          onClick={() => { setIsRenting(true); setRentStatus('idle'); }}
          className="relative z-10 bg-brand-blue hover:bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-[0_4px_12px_rgba(0,112,243,0.3)] transition-all active:scale-95 text-sm shrink-0 cursor-pointer"
        >
          <Plus size={20} weight="bold" />
          Rent New Number
        </button>
      </div>

      {/* Active Rentals Table - Responsive Dark & Light Mode Theme */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your Active Dedicated Rentals</h2>
          <button 
            onClick={fetchRentals}
            className="text-xs font-bold text-slate-500 hover:text-brand-blue flex items-center gap-1.5 transition-colors"
          >
            <ArrowClockwise size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
        
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size={40} className="animate-spin text-brand-blue" />
          </div>
        ) : rentals.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-white/40 flex flex-col items-center">
            <Phone size={48} className="opacity-20 mb-4" />
            <p className="text-sm font-medium">You don't have any active rented numbers yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5 text-slate-500 dark:text-white/40 text-xs uppercase tracking-wider font-bold">
                  <th className="pb-4 px-4">Service & Number</th>
                  <th className="pb-4 px-4">Expires In</th>
                  <th className="pb-4 px-4 text-center">SMS Inbox</th>
                  <th className="pb-4 px-4 text-center">Status</th>
                  <th className="pb-4 px-4 text-right">Auto Renew</th>
                </tr>
              </thead>
              <tbody>
                {rentals.map((rental) => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(rental.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                  const isExpiringSoon = daysLeft <= 3 && rental.status === 'Active';
                  const smsCount = rental.incoming_sms ? rental.incoming_sms.length : 0;

                  return (
                    <tr key={rental.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center p-1.5 shrink-0">
                            <ServiceIcon name={rental.service} size={20} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-base">{rental.phone_number}</span>
                            <span className="text-xs text-slate-500 dark:text-white/50 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span>{rental.service}</span>
                              <span>•</span>
                              <CountryFlag country={rental.country} size={14} />
                              <span>{rental.country}</span>
                            </span>
                          </div>
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
                      
                      {/* SMS INBOX BUTTON */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => openSmsInbox(rental)}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-white dark:text-cyan-400 dark:hover:text-white border border-brand-blue/20 transition-all font-bold text-xs shadow-sm active:scale-95 cursor-pointer"
                        >
                          <ChatCircleText size={16} weight="bold" />
                          <span>View SMS</span>
                          {smsCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold ml-0.5">
                              {smsCount}
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                          rental.status === 'Active' ? 'bg-brand-blue/10 text-brand-blue dark:text-cyan-400 border border-brand-blue/20' :
                          rental.status === 'Expired' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          'bg-slate-500/10 text-slate-500 dark:text-white/40'
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
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md overscroll-contain"
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0.8 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-white dark:bg-[#111] rounded-t-[32px] sm:rounded-3xl w-full sm:max-w-lg shadow-2xl relative border-t sm:border border-black/10 dark:border-white/15 max-h-[92dvh] sm:max-h-[88vh] flex flex-col font-sans text-slate-900 dark:text-white overflow-hidden"
            >
              {/* Mobile Sheet Grab Handle */}
              <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20" />
              </div>

              {/* Modal Header */}
              <div className="p-5 sm:p-6 pb-3 border-b border-black/5 dark:border-white/10 flex items-start justify-between shrink-0">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">Rent Dedicated Line</h3>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Exclusive virtual line reserved just for you for extended durations.</p>
                </div>
                <button
                  onClick={() => setIsRenting(false)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-500 dark:text-white transition-colors cursor-pointer shrink-0"
                  aria-label="Close modal"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {rentStatus === 'idle' || rentStatus === 'error' ? (
                <>
                  {/* Scrollable Form Content */}
                  <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
                    
                    {/* Custom Dropdown: Target Service / Application */}
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-bold text-slate-600 dark:text-white/60">Service / Application</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsServiceDropdownOpen(!isServiceDropdownOpen);
                            setIsCountryDropdownOpen(false);
                          }}
                          className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 px-4 py-3 rounded-2xl font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <ServiceIcon name={selectedService.name} size={20} />
                            <span className="truncate">{selectedService.name}</span>
                          </div>
                          <CaretDown size={16} weight="bold" className={`text-slate-400 shrink-0 transition-transform ${isServiceDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {isServiceDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsServiceDropdownOpen(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[260px]"
                              >
                                <div className="p-2 border-b border-slate-100 dark:border-white/10 sticky top-0 bg-white dark:bg-[#161616] z-10">
                                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/60 rounded-xl px-3 py-2 border border-slate-200/80 dark:border-white/10">
                                    <MagnifyingGlass size={15} className="text-slate-400 shrink-0" />
                                    <input
                                      type="text"
                                      placeholder="Search services..."
                                      value={serviceSearchQuery}
                                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                                      className="bg-transparent border-none outline-none text-xs w-full text-slate-900 dark:text-white placeholder:text-slate-400"
                                      autoFocus
                                    />
                                    {serviceSearchQuery && (
                                      <button type="button" onClick={() => setServiceSearchQuery("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                        <X size={13} weight="bold" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="overflow-y-auto p-1.5 divide-y divide-slate-100/60 dark:divide-white/5 custom-scrollbar">
                                  {(serviceSearchQuery
                                    ? SERVICES.filter(s => s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
                                    : SERVICES
                                  ).slice(0, 40).map((srv) => (
                                    <button
                                      key={srv.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedService({ id: srv.id, name: srv.name });
                                        setIsServiceDropdownOpen(false);
                                        setServiceSearchQuery("");
                                      }}
                                      className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                                        selectedService.id === srv.id
                                          ? "bg-brand-blue/10 text-brand-blue font-bold"
                                          : "text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <ServiceIcon name={srv.name} size={18} />
                                        <span className="truncate">{srv.name}</span>
                                      </div>
                                      {selectedService.id === srv.id && <Check size={14} weight="bold" className="text-brand-blue shrink-0" />}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Custom Dropdown: Country */}
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-bold text-slate-600 dark:text-white/60">Country</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCountryDropdownOpen(!isCountryDropdownOpen);
                            setIsServiceDropdownOpen(false);
                          }}
                          className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 px-4 py-3 rounded-2xl font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <CountryFlag country={selectedCountry.id} size={20} />
                            <span className="truncate">{selectedCountry.name}</span>
                          </div>
                          <CaretDown size={16} weight="bold" className={`text-slate-400 shrink-0 transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {isCountryDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsCountryDropdownOpen(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[260px]"
                              >
                                <div className="p-2 border-b border-slate-100 dark:border-white/10 sticky top-0 bg-white dark:bg-[#161616] z-10">
                                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/60 rounded-xl px-3 py-2 border border-slate-200/80 dark:border-white/10">
                                    <MagnifyingGlass size={15} className="text-slate-400 shrink-0" />
                                    <input
                                      type="text"
                                      placeholder="Search countries..."
                                      value={countrySearchQuery}
                                      onChange={(e) => setCountrySearchQuery(e.target.value)}
                                      className="bg-transparent border-none outline-none text-xs w-full text-slate-900 dark:text-white placeholder:text-slate-400"
                                      autoFocus
                                    />
                                    {countrySearchQuery && (
                                      <button type="button" onClick={() => setCountrySearchQuery("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                        <X size={13} weight="bold" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="overflow-y-auto p-1.5 divide-y divide-slate-100/60 dark:divide-white/5 custom-scrollbar">
                                  {AVAILABLE_COUNTRIES
                                    .filter(c => c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()))
                                    .map((c) => (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedCountry({ id: c.id, name: c.name });
                                          setIsCountryDropdownOpen(false);
                                          setCountrySearchQuery("");
                                        }}
                                        className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                                          selectedCountry.id === c.id
                                            ? "bg-brand-blue/10 text-brand-blue font-bold"
                                            : "text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 truncate">
                                          <CountryFlag country={c.id} size={18} />
                                          <span className="truncate">{c.name}</span>
                                        </div>
                                        {selectedCountry.id === c.id && <Check size={14} weight="bold" className="text-brand-blue shrink-0" />}
                                      </button>
                                    ))}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Selected Preview Badge */}
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                      <ServiceIcon name={selectedService.name} size={18} />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedService.name}</span>
                      <span className="text-slate-400">•</span>
                      <CountryFlag country={selectedCountry.id} size={16} />
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{selectedCountry.name}</span>
                    </div>

                    {/* Duration Selection (Presets + Custom Input) */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-600 dark:text-white/60">Rental Duration</label>
                        {discountPercent > 0 && (
                          <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Tag size={12} weight="bold" />
                            {discountPercent}% DURATION DISCOUNT
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {DURATION_PRESETS.map((preset) => (
                          <button
                            key={preset.days}
                            type="button"
                            onClick={() => { setSelectedDays(preset.days); setIsCustomDays(false); }}
                            className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                              !isCustomDays && selectedDays === preset.days
                                ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20"
                                : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-brand-blue/40"
                            }`}
                          >
                            <span>{preset.label}</span>
                            {preset.discount && (
                              <span className={`text-[9px] font-extrabold mt-0.5 ${
                                !isCustomDays && selectedDays === preset.days ? "text-cyan-200" : "text-emerald-500"
                              }`}>
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
                              : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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
                    <div className="bg-brand-blue/10 dark:bg-brand-blue/15 p-4 rounded-2xl border border-brand-blue/20 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Total Duration Cost</span>
                        <span className="text-[10px] text-slate-500 dark:text-white/50 font-semibold">{activeDays} Days Dedicated Access</span>
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
                  </div>

                  {/* Sticky Action Footer - Protected with iOS Safe-Area Padding */}
                  <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/10 bg-white/95 dark:bg-[#111]/95 backdrop-blur-lg pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shrink-0 flex gap-3">
                    <button 
                      onClick={() => setIsRenting(false)}
                      className="flex-1 min-h-[48px] py-3 px-4 rounded-2xl font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleRent}
                      disabled={isPriceLoading || price === null}
                      className="flex-1 min-h-[48px] py-3 px-4 rounded-2xl font-bold text-xs text-white bg-brand-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      Pay & Rent Number
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 py-12 flex flex-col items-center justify-center text-center space-y-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
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

      {/* SMS INBOX MODAL */}
      <AnimatePresence>
        {selectedRentalForInbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md overscroll-contain"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-white dark:bg-[#111] rounded-t-[32px] sm:rounded-3xl w-full sm:max-w-xl shadow-2xl relative border-t sm:border border-black/10 dark:border-white/15 max-h-[92dvh] sm:max-h-[88vh] flex flex-col text-slate-900 dark:text-white overflow-hidden"
            >
              {/* Mobile Sheet Grab Handle */}
              <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20" />
              </div>

              {/* Modal Header */}
              <div className="p-5 sm:p-6 pb-4 border-b border-black/5 dark:border-white/10 flex items-start justify-between shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-bold text-slate-900 dark:text-white tracking-wide">
                      {selectedRentalForInbox.phone_number}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedRentalForInbox.phone_number, 'phone')}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-brand-blue transition-colors cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedPhone ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/50 font-medium">
                    <span className="uppercase font-bold tracking-wider">{selectedRentalForInbox.service}</span>
                    <span>•</span>
                    <span className="uppercase">{selectedRentalForInbox.country}</span>
                    <span>•</span>
                    <span className="text-brand-blue font-bold">
                      Expires: {new Date(selectedRentalForInbox.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRentalForInbox(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-500 dark:text-white transition-colors cursor-pointer"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Toolbar: Refresh & Auto-poll indicator */}
              <div className="px-5 sm:px-6 py-2.5 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-slate-600 dark:text-white/70 font-medium">
                    Live SMS Monitoring Active
                  </span>
                </div>
                <button
                  onClick={() => fetchInboxMessages(selectedRentalForInbox.id)}
                  disabled={isInboxLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-blue text-white font-bold text-xs hover:bg-blue-600 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  <ArrowClockwise size={14} className={isInboxLoading ? "animate-spin" : ""} weight="bold" />
                  <span>{isInboxLoading ? "Checking..." : "Refresh"}</span>
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3 custom-scrollbar pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                {inboxMessages.length === 0 ? (
                  <div className="py-14 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                    <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue mb-3">
                      <EnvelopeSimple size={26} weight="duotone" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Waiting for incoming SMS...</h3>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-1 max-w-sm">
                      Send your verification code from <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedRentalForInbox.service}</span> to this number. It will appear here automatically.
                    </p>
                  </div>
                ) : (
                  inboxMessages.map((msg, idx) => (
                    <div
                      key={msg.id || idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5 hover:border-brand-blue/40 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-brand-blue dark:text-cyan-400 bg-brand-blue/10 px-2.5 py-1 rounded-lg">
                          {msg.sender || selectedRentalForInbox.service}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(msg.date).toLocaleDateString()}
                        </span>
                      </div>

                      {msg.code && (
                        <div className="flex items-center justify-between bg-white dark:bg-black/40 p-3 rounded-xl border border-black/5 dark:border-white/10">
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verification Code</div>
                            <div className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white tracking-widest">
                              {msg.code}
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(msg.code!, 'code')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
                          >
                            {copiedCode === msg.code ? (
                              <>
                                <Check size={14} weight="bold" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} weight="bold" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-slate-600 dark:text-slate-300 font-mono leading-relaxed bg-white/50 dark:bg-white/5 p-2.5 rounded-lg border border-black/5 dark:border-white/5 break-words">
                        {msg.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
