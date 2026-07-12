"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ShoppingCart, 
  Storefront, 
  MagnifyingGlass,
  Funnel,
  TrendUp,
  X,
  Spinner,
  FacebookLogo,
  InstagramLogo,
  TwitterLogo,
  TiktokLogo,
  EnvelopeSimple,
  ShieldCheck,
  PlayCircle,
  DiscordLogo,
  RedditLogo,
  GridFour,
  CheckCircle,
  WarningCircle,
  Info
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useCurrency } from "@/components/CurrencyContext";

interface DigitalProduct {
  id: string;
  provider_api_id: string;
  name: string;
  description: string;
  category: string;
  retail_price_usd: number;
  retail_price_ngn: number;
  stock: number;
}

const POPULAR_CATEGORIES = [
  "All",
  "Instagram",
  "Facebook",
  "Netflix",
  "VPN",
  "Telegram",
  "TikTok",
  "Twitter"
];

// Helper to determine icon based on category name
function getCategoryIcon(categoryName: string, size = 28) {
  const name = categoryName.toLowerCase();
  if (name.includes("facebook") || name.includes("fb")) return <FacebookLogo size={size} className="text-blue-600" weight="fill" />;
  if (name.includes("instagram") || name.includes("ig")) return <InstagramLogo size={size} className="text-pink-600" weight="fill" />;
  if (name.includes("twitter") || name.includes(" x ")) return <TwitterLogo size={size} className="text-sky-500" weight="fill" />;
  if (name.includes("tiktok")) return <TiktokLogo size={size} className="text-slate-900 dark:text-white" weight="fill" />;
  if (name.includes("mail") || name.includes("gmail") || name.includes("outlook") || name.includes("yahoo")) return <EnvelopeSimple size={size} className="text-amber-500" weight="fill" />;
  if (name.includes("vpn")) return <ShieldCheck size={size} className="text-emerald-500" weight="fill" />;
  if (name.includes("netflix")) return <PlayCircle size={size} className="text-red-600" weight="fill" />;
  if (name.includes("discord")) return <DiscordLogo size={size} className="text-indigo-500" weight="fill" />;
  if (name.includes("reddit")) return <RedditLogo size={size} className="text-orange-600" weight="fill" />;
  return <GridFour size={size} className="text-brand-blue" weight="fill" />;
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DigitalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering and Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Currency State
  const { currency } = useCurrency();

  // Modal States
  const [selectedProductToBuy, setSelectedProductToBuy] = useState<DigitalProduct | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [purchaseMessage, setPurchaseMessage] = useState('');
  
  const [selectedProductDesc, setSelectedProductDesc] = useState<DigitalProduct | null>(null);

  // Limits for chunking per category to prevent DOM lag
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({});
  const DEFAULT_LIMIT = 8;

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Reset limits when search/filter changes
    setCategoryLimits({});
    
    // Apply filters and search
    let result = products;

    if (selectedCategory !== "All") {
      result = result.filter(p => p.category.toLowerCase().includes(selectedCategory.toLowerCase()) || p.name.toLowerCase().includes(selectedCategory.toLowerCase()));
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q)
      );
    }

    setFilteredProducts(result);
  }, [searchQuery, selectedCategory, products]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/marketplace/goods");
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching goods:", error);
    }
    setIsLoading(false);
  };

  const handleInitiateBuy = (product: DigitalProduct) => {
    setSelectedProductToBuy(product);
    setPurchaseStatus('idle');
    setPurchaseMessage('');
  };

  const handleConfirmBuy = async () => {
    if (!selectedProductToBuy) return;
    setPurchaseStatus('loading');
    
    try {
      const res = await fetch("/api/marketplace/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          provider_api_id: selectedProductToBuy.provider_api_id
        })
      });

      const data = await res.json();
      if (data.success) {
        setPurchaseStatus('success');
        setPurchaseMessage("Purchase successful! Check your purchase history for the account logs.");
        setProducts(products.map(p => p.id === selectedProductToBuy.id ? { ...p, stock: p.stock - 1 } : p));
      } else {
        setPurchaseStatus('error');
        setPurchaseMessage(data.error || "Purchase failed.");
      }
    } catch (error) {
      setPurchaseStatus('error');
      setPurchaseMessage("An unexpected error occurred.");
    }
  };

  // Group filtered products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, DigitalProduct[]> = {};
    filteredProducts.forEach(product => {
      if (!groups[product.category]) {
        groups[product.category] = [];
      }
      groups[product.category].push(product);
    });
    // Sort keys alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, DigitalProduct[]>);
  }, [filteredProducts]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 dark:bg-[#111] p-8 rounded-3xl text-white shadow-xl dark:shadow-none border border-transparent dark:border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Storefront size={36} className="text-brand-blue" weight="duotone" />
            Digital Marketplace
          </h1>
          <p className="text-slate-400 max-w-xl">
            Instantly purchase social media accounts, streaming subscriptions, and premium digital goods. Delivered immediately after purchase.
          </p>
        </div>
        <div className="relative z-10 flex gap-4">
          <a href="/dashboard/marketplace/purchases" className="bg-white/10 hover:bg-white/20 transition-colors text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 backdrop-blur-sm border border-white/5 shadow-sm">
            <ShoppingCart size={20} weight="bold" />
            My Purchases
          </a>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96 flex-shrink-0">
          <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search thousands of accounts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 shadow-sm transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X size={16} weight="bold" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-x-auto pb-2 scrollbar-hide flex gap-2 w-full">
          {POPULAR_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                selectedCategory === cat 
                ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-md" 
                : "bg-white dark:bg-[#111] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1A1A1A] border border-black/5 dark:border-white/5 shadow-sm"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Categories & Products */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-500">
          <Spinner size={48} className="animate-spin text-brand-blue" />
          <p className="font-bold">Loading live inventory...</p>
        </div>
      ) : Object.keys(groupedProducts).length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-500 bg-white dark:bg-[#111] rounded-3xl border border-black/5 dark:border-white/5">
          <Funnel size={48} weight="duotone" className="opacity-50" />
          <p className="font-bold text-xl text-slate-700 dark:text-white">No accounts found</p>
          <p>Try adjusting your search or category filter.</p>
          <button 
            onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
            className="mt-2 text-brand-blue font-bold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedProducts).map(([categoryName, items]) => {
            const limit = categoryLimits[categoryName] || DEFAULT_LIMIT;
            const visibleItems = items.slice(0, limit);
            const hasMore = items.length > limit;

            return (
              <div key={categoryName} className="space-y-6">
                
                {/* Category Header */}
                <div className="flex items-center gap-4">
                  <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 p-3 rounded-2xl shadow-sm">
                    {getCategoryIcon(categoryName)}
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      {categoryName}
                    </h2>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      {items.length} product{items.length !== 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>

                {/* Grid for this category */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {visibleItems.map((product) => (
                    <div key={product.id} className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-3xl p-6 flex flex-col hover:shadow-xl hover:border-brand-blue/30 transition-all group relative overflow-hidden">
                      
                      <div className="flex justify-between items-start mb-4">
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-lg">
                          <TrendUp size={12} weight="bold" />
                          {product.stock} left
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 leading-tight line-clamp-2 group-hover:text-brand-blue transition-colors">
                        {product.name}
                      </h3>
                      
                      {/* Clamped Description (Clickable) */}
                      <div 
                        onClick={() => setSelectedProductDesc(product)}
                        className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-3 text-ellipsis flex-1 cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors relative group/desc"
                      >
                        <div dangerouslySetInnerHTML={{ __html: product.description }} />
                        <div className="absolute bottom-0 right-0 bg-gradient-to-l from-white dark:from-[#111] pl-8 pb-0.5 text-brand-blue text-xs font-bold opacity-0 group-hover/desc:opacity-100 transition-opacity">
                          Read more
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-1">
                            {currency === "NGN" 
                              ? `₦${product.retail_price_ngn.toLocaleString()}`
                              : `$${product.retail_price_usd.toFixed(2)}`}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleInitiateBuy(product)}
                          disabled={product.stock <= 0}
                          className="bg-brand-blue text-white font-bold h-10 px-5 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 hover:bg-brand-blue-hover shadow-[0_4px_12px_rgba(0,112,243,0.2)]"
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setCategoryLimits(prev => ({ ...prev, [categoryName]: limit + 12 }))}
                      className="px-6 py-3 rounded-full border border-black/10 dark:border-white/10 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm"
                    >
                      Show {items.length - limit} more accounts in {categoryName}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Description Modal */}
      <AnimatePresence>
        {selectedProductDesc && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedProductDesc(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setSelectedProductDesc(null)}
                  className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-white"
                >
                  <X weight="bold" />
                </button>

                <div className="mb-6 pr-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full">
                      {selectedProductDesc.category}
                    </span>
                    <span className="text-brand-blue text-xs font-bold px-3 py-1 bg-brand-blue/10 rounded-full">
                      {currency === "NGN" ? `₦${selectedProductDesc.retail_price_ngn.toLocaleString()}` : `$${selectedProductDesc.retail_price_usd.toFixed(2)}`}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedProductDesc.name}
                  </h2>
                </div>

                <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-black/5 dark:border-white/5 rounded-2xl p-6 max-h-[60vh] overflow-y-auto custom-scrollbar prose dark:prose-invert prose-sm md:prose-base prose-slate max-w-none prose-p:leading-relaxed prose-a:text-brand-blue">
                  <div dangerouslySetInnerHTML={{ __html: selectedProductDesc.description }} />
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Purchase Confirmation Modal */}
      <AnimatePresence>
        {selectedProductToBuy && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => purchaseStatus !== 'loading' && setSelectedProductToBuy(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar flex flex-col items-center text-center"
                onClick={e => e.stopPropagation()}
              >
                {/* Status Icon */}
                <div className="mb-6">
                  {purchaseStatus === 'idle' && (
                    <div className="w-20 h-20 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center mx-auto">
                      <ShoppingCart size={40} weight="duotone" />
                    </div>
                  )}
                  {purchaseStatus === 'loading' && (
                    <div className="w-20 h-20 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center mx-auto">
                      <Spinner size={40} className="animate-spin" />
                    </div>
                  )}
                  {purchaseStatus === 'success' && (
                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle size={40} weight="fill" />
                    </div>
                  )}
                  {purchaseStatus === 'error' && (
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                      <WarningCircle size={40} weight="fill" />
                    </div>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {purchaseStatus === 'idle' ? 'Confirm Purchase' : 
                   purchaseStatus === 'loading' ? 'Processing...' : 
                   purchaseStatus === 'success' ? 'Purchase Successful' : 
                   'Purchase Failed'}
                </h2>
                
                <div className="text-slate-500 dark:text-slate-400 mb-8 max-w-[90%] mx-auto">
                  {purchaseStatus === 'idle' ? (
                    <>
                      You are about to purchase <strong className="text-slate-800 dark:text-white">{selectedProductToBuy.name}</strong> for <strong className="text-slate-800 dark:text-white font-mono bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">{currency === "NGN" ? `₦${selectedProductToBuy.retail_price_ngn.toLocaleString()}` : `$${selectedProductToBuy.retail_price_usd.toFixed(2)}`}</strong>. This will be deducted from your wallet balance.
                    </>
                  ) : (
                    purchaseMessage
                  )}
                </div>

                <div className="w-full flex gap-3">
                  {purchaseStatus === 'idle' ? (
                    <>
                      <button 
                        onClick={() => setSelectedProductToBuy(null)}
                        className="flex-1 py-3.5 px-4 rounded-xl font-bold text-slate-600 dark:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleConfirmBuy}
                        className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-brand-blue hover:bg-brand-blue-hover shadow-[0_4px_12px_rgba(0,112,243,0.3)] transition-colors"
                      >
                        Confirm Pay
                      </button>
                    </>
                  ) : purchaseStatus !== 'loading' ? (
                    <button 
                      onClick={() => setSelectedProductToBuy(null)}
                      className={`w-full py-3.5 px-4 rounded-xl font-bold text-white transition-colors ${purchaseStatus === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-900 dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-gray-200'}`}
                    >
                      {purchaseStatus === 'success' ? 'Got it' : 'Close'}
                    </button>
                  ) : null}
                </div>
                
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
