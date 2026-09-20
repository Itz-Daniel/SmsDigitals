"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  Spinner, 
  CaretDown, 
  MagnifyingGlass, 
  WarningCircle, 
  Clock, 
  CheckCircle, 
  Copy, 
  Check, 
  Broadcast
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { SERVICES } from "@/lib/data/sms-data";
import { CancelOrderButton } from "@/components/CancelOrderButton";
import { useCurrency } from "@/components/CurrencyContext";
import { PurchaseSuccessModal } from "@/components/PurchaseSuccessModal";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

interface ServiceItem {
  id: string;
  name: string;
}

const POPULAR_QUICK_SERVICES = [
  { id: "whatsapp", name: "WhatsApp" },
  { id: "telegram", name: "Telegram" },
  { id: "tinder", name: "Tinder" },
  { id: "bumble", name: "Bumble" },
  { id: "paypal", name: "PayPal" },
  { id: "tiktok", name: "TikTok" },
  { id: "openai", name: "OpenAI" },
  { id: "google", name: "Google" },
  { id: "instagram", name: "Instagram" }
];

export default function USPurchasePage() {
  const { currency } = useCurrency();
  const { isSandbox } = useSandboxMode();

  const [selectedService, setSelectedService] = useState(SERVICES[0].id);
  const [selectedServiceName, setSelectedServiceName] = useState(SERVICES[0].name);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [rentals, setRentals] = useState<Rental[]>([]);

  // Purchase Success Modal State
  const [successModalData, setSuccessModalData] = useState<{
    isOpen: boolean;
    serviceName: string;
    phoneNumber: string;
    cost: string;
    orderId: string;
  }>({
    isOpen: false,
    serviceName: "",
    phoneNumber: "",
    cost: "",
    orderId: ""
  });

  const fetchRentals = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .eq('region', 'usa')
        .order('created_at', { ascending: false });

      if (data) {
        setRentals(data as Rental[]);
      }
    } catch {
      // silently handle
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let channel: RealtimeChannel | null = null;
    const supabase = createClient();

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      const { data } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .eq('region', 'usa')
        .order('created_at', { ascending: false });

      if (data && isMounted) {
        setRentals(data as Rental[]);
      }

      channel = supabase.channel(`realtime-rentals-usa-${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals', filter: `user_id=eq.${user.id}` }, () => {
          fetchRentals();
        })
        .subscribe();
    };

    init();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchRentals]);

  // Active Code Polling for any Waiting lines (polls every 3.5s for instant SMS delivery)
  useEffect(() => {
    const waitingRentals = rentals.filter(r => r.status === 'Waiting');
    if (waitingRentals.length === 0) return;

    const interval = setInterval(async () => {
      for (const r of waitingRentals) {
        try {
          const res = await fetch('/api/check-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rental_id: r.id })
          });
          const data = await res.json();
          if (data.status === 'Received' || data.status === 'Expired') {
            fetchRentals();
          }
        } catch {
          // ignore transient error
        }
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [rentals, fetchRentals]);

  useEffect(() => {
    let isMounted = true;

    const loadPrice = async () => {
      try {
        const res = await fetch('/api/pricing/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: 'usa', serviceName: selectedServiceName, currency })
        });
        const data = await res.json();
        if (isMounted) {
          if (data.available && data.cost !== undefined) {
            setLivePrice(data.cost);
            setIsAvailable(true);
          } else {
            setIsAvailable(false);
          }
          setIsFetchingPrice(false);
        }
      } catch {
        if (isMounted) {
          setIsAvailable(false);
          setIsFetchingPrice(false);
        }
      }
    };

    loadPrice();

    return () => {
      isMounted = false;
    };
  }, [selectedServiceName, currency]);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    setError(null);
    try {
      const res = await fetch('/api/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: 'usa',
          serviceId: selectedService,
          serviceName: selectedServiceName,
          region: 'usa',
          currency: currency,
          isSandbox: isSandbox
        })
      });

      const data = await res.json();
      if (data.success) {
        const rentalObj = data.rental || {};
        const orderId = rentalObj.order_id || data.order_id || data.order?.order_id || `rent_${Date.now()}`;
        const rentalId = rentalObj.id || orderId;
        const phoneNumber = rentalObj.phone_number || data.phone_number || data.order?.phone_number || "";
        const costVal = rentalObj.cost || data.cost || livePrice || 0;

        const newRentalItem: Rental = {
          id: rentalId,
          order_id: orderId,
          phone_number: phoneNumber,
          service: selectedService,
          status: 'Waiting',
          sms_code: null,
          cost: costVal,
          currency: currency,
          created_at: new Date().toISOString()
        };

        setRentals(prev => [newRentalItem, ...prev]);

        setSuccessModalData({
          isOpen: true,
          serviceName: selectedServiceName,
          phoneNumber: phoneNumber,
          cost: isSandbox ? "$0.00 (Free Test)" : currency === 'USD' ? `$${costVal}` : `₦${costVal?.toLocaleString()}`,
          orderId: orderId
        });

        fetchRentals();
      } else {
        const rawErr = data.error || "";
        const isProviderErr = /5sim|grizzly|smspva|textverified|smsman|daisy|carrier|provider/i.test(rawErr);
        setError(isProviderErr ? "This line is currently out of stock. Please try again in a few moments or select another country." : (rawErr || "Purchase failed. Check your wallet balance."));
      }
    } catch (err: unknown) {
      setError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-24 md:pb-32 w-full max-w-6xl text-slate-900 dark:text-white font-sans overflow-x-hidden">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <Link 
            href="/dashboard/sms"
            className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-colors flex items-center gap-1 mb-1.5"
          >
            ← Back to Server Selection
          </Link>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>🇺🇸</span> USA Dedicated Server
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hidden md:inline">
            Real Physical SIMs
          </span>
        </div>
      </div>

      {/* ── Main 2-Column Grid (Order Form on Left / Active Lines on Right) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Order Control Card */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 p-6 md:p-7 flex flex-col gap-5 shadow-sm dark:shadow-none">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                Deploy Number
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue">
                NON-VOIP
              </span>
            </div>

            {/* Quick Popular Services Row (Horizontal Scroll Rail on Mobile) */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                Popular Services
              </span>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {POPULAR_QUICK_SERVICES.map((s) => {
                  const matched = SERVICES.find(srv => srv.name.toLowerCase().includes(s.name.toLowerCase()));
                  const isSelected = selectedServiceName.toLowerCase().includes(s.name.toLowerCase());
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (matched) {
                          setSelectedService(matched.id);
                          setSelectedServiceName(matched.name);
                        }
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? "bg-brand-blue text-white border-brand-blue shadow-sm shadow-brand-blue/20"
                          : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Application Dropdown Search */}
            <div className="flex flex-col gap-2 relative">
              <span className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                Target Application
              </span>
              
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 text-slate-900 dark:text-white text-left focus:border-brand-blue transition-all flex justify-between items-center"
                >
                  <span className="truncate font-bold text-sm">{selectedServiceName}</span>
                  <CaretDown weight="bold" size={16} className={`transition-transform text-slate-400 ${isServiceDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                
                <AnimatePresence>
                  {isServiceDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsServiceDropdownOpen(false)} 
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[300px]"
                      >
                        <div className="p-2.5 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 sticky top-0 z-10">
                          <div className="flex items-center gap-2 bg-white dark:bg-black/40 rounded-xl px-3 py-1.5 border border-slate-200/80 dark:border-white/10">
                            <MagnifyingGlass size={15} className="text-slate-400" />
                            <input 
                              type="text"
                              placeholder="Search 1,300+ services..."
                              value={serviceSearchQuery}
                              onChange={(e) => setServiceSearchQuery(e.target.value)}
                              className="bg-transparent border-none outline-none text-xs w-full text-slate-900 dark:text-white placeholder:text-slate-400"
                              autoFocus
                            />
                          </div>
                        </div>
                        
                        <div className="overflow-y-auto p-1.5 flex-1 divide-y divide-slate-100 dark:divide-white/5">
                          {SERVICES.filter((s: ServiceItem) => s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
                            .slice(0, 40)
                            .map((service: ServiceItem) => (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => {
                                  setSelectedService(service.id);
                                  setSelectedServiceName(service.name);
                                  setIsServiceDropdownOpen(false);
                                  setServiceSearchQuery("");
                                }}
                                className={`w-full text-left flex justify-between px-3 py-2 rounded-xl text-xs transition-colors ${selectedServiceName === service.name ? "bg-brand-blue/10 text-brand-blue font-bold" : "text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5"}`}
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

            {/* Live Pricing & Stock Box */}
            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider block">
                  Unit Price
                </span>
                {isFetchingPrice ? (
                  <span className="text-sm font-bold text-brand-blue animate-pulse">Checking price...</span>
                ) : !isAvailable || livePrice === null ? (
                  <span className="text-xs font-bold text-red-500 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Out of Stock
                  </span>
                ) : (
                  <span className="text-2xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
                    {isSandbox ? "$0.00" : currency === 'USD' ? `$${livePrice}` : `₦${livePrice?.toLocaleString()}`}
                  </span>
                )}
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {isSandbox ? "Sandbox Free" : "In Stock"}
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <WarningCircle size={16} weight="fill" className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Order Action Button */}
            <button 
              type="button"
              onClick={handlePurchase}
              disabled={isPurchasing || (isFetchingPrice && !isSandbox)}
              className={`w-full text-white rounded-2xl p-3.5 flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                isSandbox ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/25" : "bg-brand-blue hover:bg-blue-600 shadow-brand-blue/25"
              }`}
            >
              {isPurchasing ? (
                <>
                  <Spinner size={18} className="animate-spin" /> Provisioning Line...
                </>
              ) : (
                <>
                  {isSandbox ? "Deploy Test USA Number (Free)" : "Deploy USA Number"} <ArrowRight weight="bold" size={16} />
                </>
              )}
            </button>

          </div>
        </div>

        {/* Right Column: Live Verification Monitor (Active Lines) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              Active Lines ({rentals.length})
            </span>
            <span className="text-[11px] text-slate-400 dark:text-white/30">
              Real-time OTP listener
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {rentals.length === 0 ? (
                <div className="p-10 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 flex flex-col items-center justify-center text-center gap-2 text-slate-400 dark:text-white/40">
                  <Broadcast size={32} weight="light" className="opacity-40 mb-1" />
                  <p className="text-sm font-bold text-slate-700 dark:text-white/80">No active USA lines</p>
                  <p className="text-xs max-w-xs text-slate-500 dark:text-white/40">
                    Select a service on the left and deploy your number. Incoming SMS codes will appear here instantly.
                  </p>
                </div>
              ) : (
                rentals.map((rental) => (
                  <motion.div 
                    key={rental.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-surface/30 p-5 flex flex-col gap-3.5 shadow-sm dark:shadow-none"
                  >
                    {/* Header: Service + Status Pill */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${rental.status === 'Waiting' ? 'bg-brand-blue/10 text-brand-blue' : rental.status === 'Received' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                          {rental.status === 'Waiting' ? <Clock size={18} weight="duotone" className="animate-pulse" /> : rental.status === 'Received' ? <CheckCircle size={18} weight="fill" /> : <WarningCircle size={18} weight="fill" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {SERVICES.find(s => s.id === rental.service)?.name || rental.service}
                          </h4>
                          <span className="text-[10px] text-slate-400 dark:text-white/40 uppercase font-mono">
                            USA Line {rental.order_id.startsWith('sandbox-') && '· Test'}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${rental.status === 'Waiting' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20' : rental.status === 'Received' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-slate-100 dark:bg-white/10 text-slate-500 border-slate-200 dark:border-white/10'}`}>
                        {rental.status === 'Waiting' ? 'Waiting for SMS...' : rental.status === 'Received' ? 'Code Received' : rental.status}
                      </span>
                    </div>

                    {/* Phone Number Box with Copy */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 dark:text-white/40">Number</span>
                        <span className="text-base font-mono font-bold tracking-wider text-slate-900 dark:text-white">{rental.phone_number}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(rental.phone_number, `phone-${rental.id}`)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm border border-slate-200 dark:border-transparent"
                      >
                        {copiedId === `phone-${rental.id}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        {copiedId === `phone-${rental.id}` ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    {/* SMS Code Display */}
                    <div className={`p-3.5 rounded-2xl flex flex-col items-center justify-center border ${rental.status === 'Waiting' ? 'bg-slate-50 dark:bg-black/20 border-slate-200/60 dark:border-white/5' : rental.status === 'Received' ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white/20' : 'bg-slate-100 dark:bg-white/5 border-slate-200/60 dark:border-white/5'}`}>
                      {rental.status === 'Waiting' ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                          <div className="flex items-center gap-2 text-brand-blue text-xs font-bold">
                            <Spinner size={15} className="animate-spin" />
                            Listening for incoming code...
                          </div>
                          <CancelOrderButton 
                            rentalId={rental.id} 
                            createdAt={rental.created_at} 
                            cost={rental.cost}
                            currency={rental.currency}
                            onCancelSuccess={fetchRentals} 
                          />
                        </div>
                      ) : rental.status === 'Received' ? (
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-black/60 font-bold block">SMS Code</span>
                            <span className="text-2xl font-mono font-black tracking-widest text-white dark:text-slate-900">
                              {rental.sms_code}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(rental.sms_code || '', `code-${rental.id}`)}
                            className="px-3.5 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-1 shadow-sm shadow-brand-blue/30"
                          >
                            {copiedId === `code-${rental.id}` ? <Check size={13} /> : <Copy size={13} />}
                            {copiedId === `code-${rental.id}` ? 'Copied!' : 'Copy Code'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-white/40 text-xs">Rental Expired or Cancelled</span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      <PurchaseSuccessModal
        isOpen={successModalData.isOpen}
        onClose={() => setSuccessModalData(prev => ({ ...prev, isOpen: false }))}
        serviceName={successModalData.serviceName}
        phoneNumber={successModalData.phoneNumber}
        cost={successModalData.cost}
        orderId={successModalData.orderId}
        countryFlag="🇺🇸"
      />
    </div>
  );
}
