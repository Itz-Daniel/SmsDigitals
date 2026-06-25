"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, AppWindow, ArrowRight, Spinner, CaretDown, MagnifyingGlass, WarningCircle, Clock, CheckCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { SERVICES, COUNTRIES } from "@/lib/data/sms-data";
import { CancelOrderButton } from "@/components/CancelOrderButton";
import { PurchaseConfirmationModal } from "@/components/PurchaseConfirmationModal";

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
  const [currency, setCurrency] = useState("USD");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [rentals, setRentals] = useState<Rental[]>([]);

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
      console.error("Live price error:", err);
      setIsOutOfStock(true);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  useEffect(() => {
    fetchLivePrice(selectedServiceName, globalCountry, currency);
  }, [selectedServiceName, globalCountry, currency]);

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

    const supabase = createClient();
    
    // 1. Setup Supabase Realtime subscription
    const channel = supabase.channel('realtime-rentals-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals', filter: `region=eq.global` }, (payload) => {
        console.log('Realtime change received!', payload);
        fetchRentals(); // Re-fetch the list to get updated data cleanly
      })
      .subscribe();

    // 2. Poll the external provider ONLY for actively waiting rentals, without hitting DB first
    const interval = setInterval(() => {
      setRentals(currentRentals => {
        currentRentals.forEach(rental => {
          if (rental.status === 'Waiting') {
            fetch('/api/check-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rental_id: rental.id })
            }).catch(console.error);
          }
        });
        return currentRentals;
      });
    }, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);



  const handlePurchase = async () => {
    setIsPurchasing(true);
    setError(null);
    
    try {
      const serviceName = selectedServiceName;

      const response = await fetch('/api/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService,
          serviceName,
          country: globalCountry,
          region: "global",
          currency
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsModalOpen(false);
        await fetchRentals();
      } else {
        setError(data.error || "Failed to generate number.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 transition-colors duration-500">
      <div className="max-w-6xl mx-auto flex flex-col relative">
        
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/10 blur-[150px] rounded-full pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10 w-full mt-8"
        >
          {/* Left Column: Purchase Section */}
          <div className="w-full lg:w-[45%] flex flex-col gap-8">
            
            <div className="flex flex-col gap-2">
              <Link 
                href="/dashboard/sms"
                className="w-fit mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-colors flex items-center gap-2"
              >
                ← Back to Servers
              </Link>

              <div className="w-fit rounded-full px-3 py-1 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-2 mb-4 shadow-sm dark:shadow-none">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black animate-pulse"></span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">
                  Server: Global Routing
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[4rem] font-bold tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 dark:from-white dark:via-white/90 dark:to-white/30">
                Procure <br/> Numbers.
              </h1>
              <p className="text-slate-500 dark:text-white/40 mt-4 max-w-sm text-sm">Instantly deploy highly-trusted virtual numbers for seamless global verification.</p>
            </div>

            {/* Double-Bezel Card */}
            <div className="p-1.5 rounded-[2rem] border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 shadow-2xl dark:shadow-none">
              <div className="bg-slate-50 dark:bg-[#0A0A0A] rounded-[calc(2rem-0.375rem)] p-6 shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-6">
                
                {/* Currency Toggle */}
                <div className="flex bg-slate-200 dark:bg-[#111111] p-1 rounded-xl border border-black/5 dark:border-white/5">
                  <button 
                    onClick={() => setCurrency("USD")}
                    className={`flex-1 py-2 text-sm font-semibold transition-colors rounded-lg ${currency === "USD" ? "bg-white text-slate-900 dark:bg-white/10 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"}`}
                  >
                    USD ($)
                  </button>
                  <button 
                    onClick={() => setCurrency("NGN")}
                    className={`flex-1 py-2 text-sm font-semibold transition-colors rounded-lg ${currency === "NGN" ? "bg-white text-slate-900 dark:bg-white/10 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"}`}
                  >
                    NGN (₦)
                  </button>
                </div>

                {/* Form Groups */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <MapPin weight="bold" /> Target Region
                    </label>
                    
                    {/* Locked Region Tab */}
                    <div className="flex flex-wrap gap-2">
                      <button className="flex-1 min-w-[100px] py-3 px-2 rounded-xl text-xs font-bold transition-all bg-brand-blue text-white shadow-[0_0_20px_rgba(0,112,243,0.3)] cursor-default">
                        Global Selection
                      </button>
                    </div>

                    <div className="relative z-30 mt-2">
                      <button 
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="w-full bg-white dark:bg-[#111111] border border-black/5 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white text-left focus:border-brand-blue/50 transition-colors flex justify-between items-center shadow-sm dark:shadow-none"
                      >
                        <span className="truncate pr-4">
                          {COUNTRIES.find(c => c.iso === globalCountry)?.name || "Select Country"}
                        </span>
                        <CaretDown weight="bold" className={`transition-transform duration-300 ${isCountryDropdownOpen ? "rotate-180" : ""}`} />
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
                              className="absolute z-50 w-full mt-2 bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[350px]"
                            >
                              <div className="p-3 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-[#111111] sticky top-0 z-10">
                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/40 rounded-lg px-3 py-2 border border-black/5 dark:border-white/5 focus-within:border-brand-blue/50 transition-colors">
                                  <MagnifyingGlass className="text-slate-400 dark:text-white/40 flex-shrink-0" />
                                  <input 
                                    type="text"
                                    placeholder="Search country..."
                                    value={countrySearchQuery}
                                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              
                              <div className="overflow-y-auto p-1 custom-scrollbar flex-1">
                                {COUNTRIES.filter((c: any) => c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()))
                                  .map((country: any) => (
                                    <button
                                      key={country.iso}
                                      onClick={() => {
                                        setGlobalCountry(country.iso);
                                        setIsCountryDropdownOpen(false);
                                        setCountrySearchQuery("");
                                      }}
                                      className={`w-full text-left flex justify-between px-4 py-3 rounded-lg text-sm transition-colors ${globalCountry === country.iso ? "bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue font-bold" : "text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"}`}
                                    >
                                      <span>{country.name}</span>
                                    </button>
                                  ))}
                                {COUNTRIES.filter((c: any) => c.name.toLowerCase().includes(countrySearchQuery.toLowerCase())).length === 0 && (
                                  <div className="p-8 text-center flex flex-col items-center gap-2 text-slate-400 dark:text-white/40">
                                    <WarningCircle size={24} />
                                    <span className="text-sm">No countries found.</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <AppWindow weight="bold" /> Required Service
                    </label>
                    <div className="relative z-20">
                      <button 
                        onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                        className="w-full bg-white dark:bg-[#111111] border border-black/5 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white text-left focus:border-brand-blue/50 transition-colors flex justify-between items-center shadow-sm dark:shadow-none"
                      >
                        <span className="truncate pr-4">{selectedServiceName}</span>
                        <CaretDown weight="bold" className={`transition-transform duration-300 ${isServiceDropdownOpen ? "rotate-180" : ""}`} />
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
                              className="absolute z-50 w-full mt-2 bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[350px]"
                            >
                              <div className="p-3 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-[#111111] sticky top-0 z-10">
                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/40 rounded-lg px-3 py-2 border border-black/5 dark:border-white/5 focus-within:border-brand-blue/50 transition-colors">
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
                              
                                <div className="overflow-y-auto p-1 custom-scrollbar flex-1">
                                  {SERVICES.filter((s: any) => s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
                                    .slice(0, 30)
                                    .map((service: any) => (
                                      <button
                                        key={service.id}
                                        onClick={() => {
                                          setSelectedService(service.id);
                                          setSelectedServiceName(service.name);
                                          setIsServiceDropdownOpen(false);
                                          setServiceSearchQuery("");
                                        }}
                                        className={`w-full text-left flex justify-between px-4 py-3 rounded-lg text-sm transition-colors ${selectedService === service.id ? "bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue font-bold" : "text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"}`}
                                      >
                                        <span>{service.name}</span>
                                      </button>
                                    ))}
                                {SERVICES.filter((s: any) => s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())).length === 0 && (
                                  <div className="p-8 text-center flex flex-col items-center gap-2 text-slate-400 dark:text-white/40">
                                    <WarningCircle size={24} />
                                    <span className="text-sm">No services found.</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Error is now inside the modal */}

                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-bold text-slate-400 dark:text-white/50 uppercase tracking-widest">Live Price</span>
                  {isFetchingPrice ? (
                    <span className="text-sm font-mono text-brand-blue animate-pulse">Fetching...</span>
                  ) : isOutOfStock ? (
                    <span className="text-sm font-bold text-red-500">Out of Stock</span>
                  ) : (
                    <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                      {currency === 'USD' ? '$' : '₦'}
                      {livePrice?.toLocaleString()}
                    </span>
                  )}
                </div>

                <button 
                  onClick={() => setIsModalOpen(true)}
                  disabled={isPurchasing || isFetchingPrice || isOutOfStock}
                  className="w-full group bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-gray-100 rounded-xl p-4 flex items-center justify-between transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  <span className="text-sm font-bold tracking-wide">
                    {isPurchasing ? "Connecting to Network..." : "Purchase Number"}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-black/10 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors duration-500">
                    {isPurchasing ? <Spinner className="animate-spin" /> : <ArrowRight weight="bold" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Active Numbers Stream */}
          <div className="w-full xl:w-[60%] flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
              <h3 className="text-xl font-medium flex items-center gap-2 text-slate-900 dark:text-white">
                Network Stream <span className="text-brand-blue/50">·</span> <span className="text-sm text-slate-500 dark:text-white/40 font-normal">{rentals.length} active nodes</span>
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {rentals.length === 0 ? (
                  <div className="p-12 border border-black/10 dark:border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-white/20 bg-slate-50 dark:bg-transparent">
                    <AppWindow size={48} weight="thin" />
                    <p className="text-sm">No active numbers on this server.</p>
                  </div>
                ) : (
                  rentals.map((rental) => (
                    <motion.div 
                      key={rental.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-[#111111] border border-black/5 dark:border-white/5 rounded-2xl p-5 hover:border-black/10 dark:hover:border-white/10 transition-colors flex flex-col gap-4 shadow-sm dark:shadow-none"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rental.status === 'Waiting' ? 'bg-brand-blue/10 text-brand-blue' : rental.status === 'Received' ? 'bg-slate-900 dark:bg-white text-white dark:text-black/10 text-slate-900 dark:text-white' : 'bg-red-500/10 text-red-500'}`}>
                            {rental.status === 'Waiting' ? <Clock weight="duotone" size={24} className="animate-pulse" /> : rental.status === 'Received' ? <CheckCircle weight="fill" size={24} /> : <WarningCircle weight="fill" size={24} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{SERVICES.find(s => s.id === rental.service)?.name || rental.service}</span>
                            <span className="text-[11px] text-slate-500 dark:text-white/40 uppercase tracking-widest">{rental.status}</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-lg font-mono tracking-wider text-slate-900 dark:text-white">{rental.phone_number}</span>
                          <span className="text-[10px] text-slate-400 dark:text-white/30">{rental.currency === 'USD' ? '$' : '₦'}{rental.cost}</span>
                        </div>
                      </div>

                      {/* Code Display Area */}
                      <div className={`w-full p-4 rounded-xl flex items-center justify-center border ${rental.status === 'Waiting' ? 'bg-slate-50 dark:bg-black shadow-inner border-black/5 dark:border-white/5' : rental.status === 'Received' ? 'bg-slate-900 dark:bg-white text-white dark:text-black/5 border-slate-900 dark:border-white/20' : 'bg-red-500/5 border-red-500/10'}`}>
                        {rental.status === 'Waiting' ? (
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20">
                              <Spinner className="w-3.5 h-3.5 text-brand-blue animate-spin" />
                              <span className="text-xs font-medium text-brand-blue">Waiting for SMS...</span>
                            </div>
                            <CancelOrderButton 
                              rentalId={rental.id} 
                              createdAt={rental.created_at} 
                              onCancelSuccess={fetchRentals} 
                            />
                          </div>
                        ) : rental.status === 'Received' ? (
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase text-slate-900 dark:text-white tracking-widest mb-1">Received Code</span>
                            <span className="text-3xl font-mono tracking-[0.2em] text-slate-900 dark:text-white drop-shadow-[0_0_5px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                              {rental.sms_code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-white/30 text-sm">Rental Cancelled or Expired</span>
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
        countryName={COUNTRIES.find(c => c.iso === globalCountry)?.name || "Unknown"}
        serviceName={selectedServiceName}
        cost={currency === 'USD' ? `$${livePrice}` : `₦${livePrice?.toLocaleString()}`}
        error={error}
      />
    </div>
  );
}
