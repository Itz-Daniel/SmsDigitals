export default function DashboardRootLoading() {
  return (
    <div className="flex flex-col gap-12 pb-12 w-full max-w-5xl text-slate-900 dark:text-white transition-colors duration-500 animate-pulse">
      {/* Skeleton Hero */}
      <section className="w-full flex flex-col gap-6">
        <div>
          <div className="h-8 bg-slate-200 dark:bg-white/10 rounded-lg w-64 mb-3"></div>
          <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-lg w-48"></div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-surface/30 p-8 md:p-10 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="w-24 h-4 bg-slate-200 dark:bg-white/10 rounded-full"></div>
            <div className="w-32 h-8 bg-slate-200 dark:bg-white/10 rounded-full"></div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-64 h-16 bg-slate-200 dark:bg-white/10 rounded-2xl"></div>
            <div className="w-48 h-4 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
          </div>
          <div className="flex gap-4 min-h-[52px]">
            <div className="w-32 h-12 bg-slate-200 dark:bg-white/10 rounded-xl"></div>
            <div className="w-32 h-12 bg-slate-200 dark:bg-white/10 rounded-xl"></div>
          </div>
        </div>
      </section>

      {/* Skeleton Bento Grid */}
      <section className="w-full flex flex-col gap-6">
        <div className="h-6 bg-slate-200 dark:bg-white/10 rounded-lg w-32"></div>
        <div className="grid grid-cols-4 md:grid-cols-6 grid-flow-dense gap-4">
          <div className="col-span-2 md:col-span-2 row-span-2 h-64 rounded-2xl bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10"></div>
          <div className="col-span-2 md:col-span-2 row-span-1 h-32 rounded-2xl bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10"></div>
          <div className="col-span-2 md:col-span-2 row-span-1 h-32 rounded-2xl bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10"></div>
          <div className="col-span-2 md:col-span-1 row-span-1 h-32 rounded-2xl bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10"></div>
          <div className="col-span-2 md:col-span-1 row-span-1 h-32 rounded-2xl bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10"></div>
          <div className="col-span-4 md:col-span-2 row-span-1 h-32 rounded-2xl bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10"></div>
        </div>
      </section>
    </div>
  );
}
