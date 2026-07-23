"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, AppWindow, ArrowRight, Spinner, CaretDown, MagnifyingGlass, WarningCircle, Clock, CheckCircle, Copy, Check, Radio, Globe } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { SERVICES, COUNTRIES } from "@/lib/data/sms-data";
import { CancelOrderButton } from "@/components/CancelOrderButton";
import { PurchaseConfirmationModal } from "@/components/PurchaseConfirmationModal";
import { useCurrency } from "@/components/CurrencyContext";

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

const POPULAR_QUICK_SERVICES = [
  { id: "wa", name: "WhatsApp" },
  { id: "tg", name: "Telegram" },
  { id: "lf", name: "TikTok" },
  { id: "go", name: "Google" },
  { id: "oi", name: "Tinder" },
];

export default function GlobalPurchasePage() {
  const region = "global";
  
  const [globalCountry, setGlobalCountry] = useState(COUNTRIES[1].iso); // Default to UK
  const [selectedService, setSelectedService] = useState(SERVICES[0].id);
  const [selectedServiceName, setSelectedServiceName] = useState(SERVICES[0].name);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(true);
  const [isOutOfStock, setIsOutOfStock] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const { currency } = useCurrency();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [rentals, setRentals] = useState<Rental[]>([]);

  const fetchRentals = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return;

      const { data } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .eq('region', 'global')
        .order('created_at', { ascending: false });

      if (data) {
        setRentals(data);
      }
    } catch (err) {
      console.error("Failed to fetch rentals:", err);
    }
  };

  useEffect(() => {
    fetchRentals();

    let channel: any = null;
    let isMounted = true;
    const supabase = createClient();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      channel = supabase.channel(`realtime-rentals-global-${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals', filter: `user_id=eq.${user.id}` }, () => {
          fetchRentals();
        })
        .subscribe();
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchLivePrice = async (serviceName: string, countryIso: string, cur: string) => {
    setIsFetchingPrice(true);
    setLivePrice(null);
    setIsOutOfStock(false);
    setError(null);
    try {
      const res = await fetch('/api/pricing/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryIso, serviceName, currency: cur })
      });
      const data = await res.json();
      if (data.available && data.cost !== undefined) {
        setLivePrice(data.cost);
      } else {
        setIsOutOfStock(true);
      }
    } catch (err) {
      setIsOutOfStock(true);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  useEffect(() => {
    fetchLivePrice(selectedServiceName, globalCountry, currency);
  }, [selectedServiceName, globalCountry, currency]);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: globalCountry,
          service: selectedService,
          serviceName: selectedServiceName,
          currency: currency
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchRentals();
      } else {
        setError(data.error || "Purchase failed. Check your wallet balance.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const selectedCountryObj = COUNTRIES.find(c => c.iso === globalCountry) || COUNTRIES[0];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative">
        
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/10 blur-[150px] rounded-full pointer-events-none"></div>

        {/* TOP COMMAND HEADER BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#111111] p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm relative z-10">
          <div className="flex flex-col gap-1">
            <Link 
              href="/dashboard/sms"
              className="w-fit text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-colors flex items-center gap-1.5 mb-1"
            >
              ← Back to Server Selection
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Globe size={28} className="text-brand-blue" /> Global Server (44+ Countries)
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                99.8% Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-2xl border border-black/5 dark:border-white/5">
            <Radio size={18} className="text-brand-blue animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/40 font-bold">Routing</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">Global Multi-Carrier SIM</span>
            </div>
          </div>
        </div>

        {/* MAIN SPLIT GRID (Control Hub Left + Live Monitor Right) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10"
        >
          {/* LEFT COLUMN: ORDER CONTROL CARD (5 Cols on LG) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white dark:bg-[#111111] rounded-3xl p-6 md:p-8 border border-black/5 dark:border-white/10 shadow-xl flex flex-col gap-6 relative overflow-hidden">
              
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AppWindow size={20} className="text-brand-blue" /> Deploy Global Number
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20 flex items-center gap-1">
                  <span>{selectedCountryObj.flag}</span> {selectedCountryObj.name}
                </span>
              </div>

              {/* SEARCHABLE COUNTRY SELECTOR */}
              <div className="flex flex-col gap-2 relative">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Select Target Country
                </label>
                <div className="relative z-30">
                  <button 
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white text-left focus:border-brand-blue transition-all flex justify-between items-center shadow-sm"
                  >
                    <span className="truncate pr-4 font-bold text-sm flex items-center gap-2">
                      <span className="text-lg">{selectedCountryObj.flag}</span> {selectedCountryObj.name}
                    </span>
                    <CaretDown weight="bold" className={`transition-transform duration-300 text-slate-400 ${isCountryDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isCountryDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsCountryDropdownOpen(false)} 
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className="absolute z-50 w-full mt-2 bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[300px]"
                        >
                          <div className="p-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 sticky top-0 z-10">
                            <div className="flex items-center gap-2 bg-white dark:bg-black/40 rounded-xl px-3 py-2 border border-slate-200 dark:border-white/10">
                              <MagnifyingGlass className="text-slate-400 dark:text-white/40 flex-shrink-0" />
                              <input 
                                type="text"
                                placeholder="Search 44+ countries..."
                                value={countrySearchQuery}
                                onChange={(e) => setCountrySearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30"
                                autoFocus
                              />
                            </div>
                          </div>
                          
                          <div className="overflow-y-auto p-2 custom-scrollbar flex-1 space-y-1">
                            {COUNTRIES.filter((c: any) => c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()))
                              .map((c: any) => (
                                <button
                                  key={c.iso}
                                  onClick={() => {
                                    setGlobalCountry(c.iso);
                                    setIsCountryDropdownOpen(false);
                                    setCountrySearchQuery("");
                                  }}
                                  className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-colors ${globalCountry === c.iso ? "bg-brand-blue/10 text-brand-blue font-bold" : "text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5"}`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="text-base">{c.flag}</span> {c.name}
                                  </span>
                                </button>
                              ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* QUICK SERVICE SELECTION TAGS */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Popular Services
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_QUICK_SERVICES.map((s) => {
                    const matched = SERVICES.find(srv => srv.name.toLowerCase().includes(s.name.toLowerCase()));
                    const isSelected = selectedServiceName.toLowerCase().includes(s.name.toLowerCase());
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (matched) {
                            setSelectedService(matched.id);
                            setSelectedServiceName(matched.name);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20"
                            : "bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FULL SERVICE DROPDOWN SELECTOR */}
              <div className="flex flex-col gap-2 relative">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Select Target Application
                </label>
                <div className="relative z-20">
                  <button 
                    onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white text-left focus:border-brand-blue transition-all flex justify-between items-center shadow-sm"
                  >
                    <span className="truncate pr-4 font-bold text-sm">{selectedServiceName}</span>
                    <CaretDown weight="bold" className={`transition-transform duration-300 text-slate-400 ${isServiceDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isServiceDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsServiceDropdownOpen(false)} 
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className="absolute z-50 w-full mt-2 bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[350px]"
                        >
                          <div className="p-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 sticky top-0 z-10">
                            <div className="flex items-center gap-2 bg-white dark:bg-black/40 rounded-xl px-3 py-2 border border-slate-200 dark:border-white/10">
                              <MagnifyingGlass className="text-slate-400 dark:text-white/40 flex-shrink-0" />
                              <input 
                                type="text"
                                placeholder="Search 1,300+ services..."
                                value={serviceSearchQuery}
                                onChange={(e) => setServiceSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30"
                                autoFocus
                              />
                            </div>
                          </div>
                          
                          <div className="overflow-y-auto p-2 custom-scrollbar flex-1 space-y-1">
                            {SERVICES.filter((s: any) => s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
                              .slice(0, 40)
                              .map((service: any) => (
                                <button
                                  key={service.id}
                                  onClick={() => {
                                    setSelectedService(service.id);
                                    setSelectedServiceName(service.name);
                                    setIsServiceDropdownOpen(false);
                                    setServiceSearchQuery("");
                                  }}
                                  className={`w-full text-left flex justify-between px-3.5 py-2.5 rounded-xl text-sm transition-colors ${selectedServiceName === service.name ? "bg-brand-blue/10 text-brand-blue font-bold" : "text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5"}`}
                                >
                                  <span>{service.name}</span>
                                </button>
                              ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* LIVE PRICING & STOCK BOX */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider block mb-0.5">Live Unit Price</span>
                  {isFetchingPrice ? (
                    <span className="text-sm font-bold text-brand-blue animate-pulse">Calculating...</span>
                  ) : isOutOfStock || livePrice === null ? (
                    <span className="text-sm font-bold text-red-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span> Out of Stock
                    </span>
                  ) : (
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                      {currency === 'USD' ? '$' : '₦'}
                      {livePrice?.toLocaleString()}
                    </span>
                  )}
                </div>

                {!isOutOfStock && livePrice !== null && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    In Stock
                  </span>
                )}
              </div>

              {/* ORDER ACTION BUTTON */}
              <button 
                onClick={() => setIsModalOpen(true)}
                disabled={isPurchasing || isFetchingPrice || isOutOfStock || livePrice === null}
                className="w-full bg-brand-blue text-white hover:bg-blue-600 rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-base transition-all shadow-lg shadow-brand-blue/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isPurchasing ? (
                  <>
                    <Spinner size={20} className="animate-spin" /> Provisioning Number...
                  </>
                ) : (
                  <>
                    Deploy {selectedCountryObj.name} Number <ArrowRight weight="bold" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE VERIFICATION MONITOR (7 Cols on LG) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Live Verification Monitor
              </h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white">
                {rentals.length} Active {rentals.length === 1 ? 'Line' : 'Lines'}
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {rentals.length === 0 ? (
                  <div className="p-12 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white/50 dark:bg-[#111111]/50 backdrop-blur-sm flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shadow-inner">
                      <Radio size={32} className="animate-pulse" />
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">No Active Verifications</h3>
                    <p className="text-xs text-slate-500 dark:text-white/50 max-w-sm leading-relaxed font-medium">
                      Select a target country and application on the left and click <strong className="text-slate-800 dark:text-white">Deploy Number</strong> to receive instant SMS codes.
                    </p>
                  </div>
                ) : (
                  rentals.map((rental) => (
                    <motion.div 
                      key={rental.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-xl flex flex-col gap-4 relative overflow-hidden"
                    >
                      {/* Top Bar: Service + Status Pill */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rental.status === 'Waiting' ? 'bg-brand-blue/10 text-brand-blue' : rental.status === 'Received' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {rental.status === 'Waiting' ? <Clock weight="duotone" size={20} className="animate-pulse" /> : rental.status === 'Received' ? <CheckCircle weight="fill" size={20} /> : <WarningCircle weight="fill" size={20} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {SERVICES.find(s => s.id === rental.service)?.name || rental.service}
                            </h4>
                            <span className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-widest font-semibold">
                              Global SIM
                            </span>
                          </div>
                        </div>

                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${rental.status === 'Waiting' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20' : rental.status === 'Received' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                          {rental.status === 'Waiting' ? 'Waiting for SMS...' : rental.status === 'Received' ? '✓ Code Received' : rental.status}
                        </span>
                      </div>

                      {/* Phone Number Bar with Copy Button */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-white/40">Virtual Phone Number</span>
                          <span className="text-lg font-mono font-bold tracking-wider text-slate-900 dark:text-white">{rental.phone_number}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(rental.phone_number, `phone-${rental.id}`)}
                          className="px-3 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          {copiedId === `phone-${rental.id}` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          {copiedId === `phone-${rental.id}` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>

                      {/* SMS Code Display Area */}
                      <div className={`p-4 rounded-2xl flex flex-col items-center justify-center border ${rental.status === 'Waiting' ? 'bg-slate-100/70 dark:bg-black/40 border-slate-200 dark:border-white/5' : rental.status === 'Received' ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white/20 shadow-lg' : 'bg-red-500/5 border-red-500/10'}`}>
                        {rental.status === 'Waiting' ? (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-2 text-brand-blue text-xs font-bold">
                              <Spinner className="w-4 h-4 animate-spin" />
                              Listening for incoming message...
                            </div>
                            <CancelOrderButton 
                              rentalId={rental.id} 
                              createdAt={rental.created_at} 
                              onCancelSuccess={fetchRentals} 
                            />
                          </div>
                        ) : rental.status === 'Received' ? (
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-black/60 font-bold block">SMS Verification Code</span>
                              <span className="text-3xl font-mono font-black tracking-[0.2em] text-slate-900 dark:text-white dark:text-slate-900">
                                {rental.sms_code}
                              </span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(rental.sms_code || '', `code-${rental.id}`)}
                              className="px-4 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-1.5 shadow-md shadow-brand-blue/30"
                            >
                              {copiedId === `code-${rental.id}` ? <Check size={14} /> : <Copy size={14} />}
                              {copiedId === `code-${rental.id}` ? 'Copied Code!' : 'Copy Code'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-white/40 text-xs font-medium">Rental Expired / Cancelled</span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      <PurchaseConfirmationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={handlePurchase}
        isProcessing={isPurchasing}
        countryName={selectedCountryObj.name}
        serviceName={selectedServiceName}
        cost={currency === 'USD' ? `$${livePrice}` : `₦${livePrice?.toLocaleString()}`}
        error={error}
      />
    </div>
  );
}
