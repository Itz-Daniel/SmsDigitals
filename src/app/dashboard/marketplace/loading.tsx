import { Storefront, MagnifyingGlass, ShoppingCart } from "@phosphor-icons/react";

export default function MarketplaceLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-20 animate-pulse">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 dark:bg-[#111] p-8 rounded-3xl text-white shadow-xl dark:shadow-none border border-transparent dark:border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 w-full">
          <div className="h-10 bg-white/10 rounded-lg w-64 mb-4"></div>
          <div className="h-4 bg-white/5 rounded-lg w-full max-w-xl"></div>
        </div>
        <div className="relative z-10 flex gap-4 w-full md:w-auto mt-4 md:mt-0">
          <div className="h-12 bg-white/10 rounded-2xl w-40"></div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96 flex-shrink-0 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl"></div>
        <div className="flex-1 flex gap-2 w-full overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-slate-100 dark:bg-white/5 rounded-xl flex-shrink-0"></div>
          ))}
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="space-y-12">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-2xl"></div>
            <div>
              <div className="h-6 w-32 bg-slate-200 dark:bg-white/10 rounded-lg mb-2"></div>
              <div className="h-4 w-24 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-3xl p-6 flex flex-col gap-4 h-[220px]">
                <div className="w-16 h-6 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
                <div className="w-3/4 h-6 bg-slate-200 dark:bg-white/10 rounded-lg"></div>
                <div className="flex-1 space-y-2 mt-2">
                  <div className="w-full h-4 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
                  <div className="w-5/6 h-4 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
                </div>
                <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div className="w-20 h-8 bg-slate-200 dark:bg-white/10 rounded-lg"></div>
                  <div className="w-20 h-10 bg-slate-200 dark:bg-white/10 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
