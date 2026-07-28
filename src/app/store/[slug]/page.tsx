"use client";

import { useState, useEffect, use } from "react";
import { Globe, Storefront, ArrowRight, Spinner, CheckCircle, Clock, Radio, Copy, Check, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SERVICES, COUNTRIES } from "@/lib/data/sms-data";

interface StoreConfig {
  id: string;
  store_slug: string;
  store_name: string;
  logo_url: string | null;
  accent_color: string;
  profit_margin_percent: number;
}

interface RentalOrder {
  rental_id: string;
  order_id: string;
  phone_number: string;
  service: string;
  cost: number;
  currency: string;
  expires_at: string;
  sms_code?: string | null;
  status?: string;
}

export default function PublicResellerStorefront({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [store, setStore] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[1].iso); // UK
  const [selectedService, setSelectedService] = useState(SERVICES[0].id);
  const [selectedServiceName, setSelectedServiceName] = useState(SERVICES[0].name);

  const [activeOrders, setActiveOrders] = useState<RentalOrder[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchStore();
  }, [slug]);

  const fetchStore = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reseller/store?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.success && data.store) {
        setStore(data.store);
      } else {
        setError(data.error || "Storefront not found.");
      }
    } catch (e) {
      setError("Failed to load storefront.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCountryObj = COUNTRIES.find(c => c.iso === selectedCountry) || COUNTRIES[0];
  const markupPercent = store?.profit_margin_percent || 20;

  // Base retail price calculation
  const basePriceUsd = 0.80;
  const retailPriceUsd = (basePriceUsd * (1 + markupPercent / 100)).toFixed(2);

  const handlePurchaseNumber = async () => {
    setIsPurchasing(true);
    setError(null);

    try {
      const res = await fetch("/api/reseller/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug: slug,
          country: selectedCountry,
          serviceId: selectedService,
          serviceName: selectedServiceName,
          currency: "USD"
        })
      });

      const data = await res.json();

      if (data.success && data.order) {
        const newOrder: RentalOrder = {
          ...data.order,
          status: "Waiting",
          sms_code: null
        };
        setActiveOrders(prev => [newOrder, ...prev]);
      } else {
        setError(data.error || "Failed to procure virtual line.");
      }
    } catch (err: any) {
      setError("Network error while ordering number.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4 text-white font-sans">
        <Spinner size={36} className="animate-spin text-brand-blue" />
        <span className="text-sm font-bold tracking-wider">Connecting to Storefront...</span>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="w-full min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center gap-4 text-white font-sans">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 shadow-xl">
          <Storefront size={32} />
        </div>
        <h1 className="text-2xl font-black">Storefront Unavailable</h1>
        <p className="text-sm text-slate-400 max-w-md">{error || "The storefront you are looking for does not exist or has been paused."}</p>
        <Link href="/" className="px-6 py-2.5 rounded-xl bg-brand-blue text-white font-bold text-xs hover:bg-blue-600 transition-all">
          Go to Main Platform
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white font-sans pb-32 transition-colors duration-500 relative overflow-hidden">
      
      {/* Dynamic Ambient Brand Glow */}
      <div 
        className="absolute top-0 right-1/4 w-[600px] h-[600px] blur-[180px] rounded-full pointer-events-none opacity-20"
        style={{ backgroundColor: store.accent_color || '#0070F3' }}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-8 relative z-10">
        
        {/* HEADER BRANDING BANNER (Matches Storefront UI) */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-2xl overflow-hidden shrink-0 shadow-lg">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
              ) : (
                <Storefront size={28} style={{ color: store.accent_color }} />
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{store.store_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Certified Partner
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Instant Virtual OTP SMS Verification Node</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/10">
            <ShieldCheck size={20} className="text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Guarantee</span>
              <span className="text-xs font-bold text-white">Auto-Refund Guarantee</span>
            </div>
          </div>
        </header>

        {/* MAIN STORE GRID (Left: Order Selector, Right: Live Orders Monitor) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: STORE ORDER PANEL (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col gap-6">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Globe size={20} style={{ color: store.accent_color }} /> Select Target Number
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white border border-white/10">
                  {selectedCountryObj.flag} {selectedCountryObj.name}
                </span>
              </div>

              {/* Country Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Country</label>
                <select 
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm font-bold focus:outline-none focus:border-brand-blue"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.iso} value={c.iso} className="bg-slate-900 text-white">
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Platform / App</label>
                <select 
                  value={selectedService}
                  onChange={(e) => {
                    setSelectedService(e.target.value);
                    const found = SERVICES.find(s => s.id === e.target.value);
                    if (found) setSelectedServiceName(found.name);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm font-bold focus:outline-none focus:border-brand-blue"
                >
                  {SERVICES.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price & Stock Badge */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Unit Line Price</span>
                  <span className="text-2xl font-black font-mono text-white">${retailPriceUsd} USD</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> In Stock
                </span>
              </div>

              {/* Order Button */}
              <button
                onClick={handlePurchaseNumber}
                disabled={isPurchasing}
                style={{ backgroundColor: store.accent_color || '#0070F3' }}
                className="w-full text-white font-extrabold text-base p-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isPurchasing ? (
                  <>
                    <Spinner size={20} className="animate-spin" /> Provisioning Line...
                  </>
                ) : (
                  <>
                    Deploy {selectedServiceName} Number <ArrowRight weight="bold" />
                  </>
                )}
              </button>

            </div>
          </div>

          {/* RIGHT: LIVE ORDERS MONITOR (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Radio size={22} className="text-brand-blue animate-pulse" /> Live Order Monitor
              </h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white">
                {activeOrders.length} {activeOrders.length === 1 ? 'Line' : 'Lines'} Active
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {activeOrders.length === 0 ? (
                <div className="p-12 rounded-3xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center">
                    <Radio size={28} className="animate-pulse" />
                  </div>
                  <h3 className="font-bold text-base text-white">No Active Verifications</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Select a service on the left and click <strong className="text-white">Deploy Number</strong> to generate an instant OTP verification line.
                  </p>
                </div>
              ) : (
                activeOrders.map((order) => (
                  <div 
                    key={order.rental_id}
                    className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col gap-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue/20 text-brand-blue flex items-center justify-center font-bold">
                          <Clock size={20} className="animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-white">{order.service.toUpperCase()}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">Order ID: #{order.order_id}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-blue/20 text-brand-blue border border-brand-blue/30">
                        Waiting for SMS...
                      </span>
                    </div>

                    {/* Phone Number Display */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</span>
                        <span className="text-lg font-mono font-bold tracking-wider text-white">{order.phone_number}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(order.phone_number, order.rental_id)}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all flex items-center gap-1.5"
                      >
                        {copiedId === order.rental_id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        {copiedId === order.rental_id ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    {/* SMS Code Box */}
                    <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center text-center">
                      <span className="text-xs text-slate-400 flex items-center gap-2 font-medium">
                        <Spinner size={14} className="animate-spin text-brand-blue" />
                        Listening for incoming verification SMS...
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* FOOTER GUARANTEE */}
        <footer className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs font-medium">
          <span>Powered by {store.store_name} &bull; All Rights Reserved</span>
          <span className="flex items-center gap-1">
            <Sparkle size={14} className="text-brand-blue" /> Secure Multi-Carrier Infrastructure
          </span>
        </footer>

      </div>
    </div>
  );
}
