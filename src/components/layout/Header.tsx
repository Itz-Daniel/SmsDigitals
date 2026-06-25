"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Headset, List, X, SignOut, Gear, Sun, Moon } from "@phosphor-icons/react";
import { NotificationBell } from "./NotificationBell";
import { navGroups } from "./Sidebar";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export function Header({ avatarUrl, isAdmin = false, email }: { avatarUrl?: string | null; isAdmin?: boolean; email?: string }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Handle hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header className="h-[80px] min-h-[80px] shrink-0 border-b border-black/5 dark:border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8">
        
        {/* Mobile: Hamburger & Logo (Visible on tablet & mobile < 1024px) */}
        <div className="lg:hidden">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <List size={24} weight="bold" />
            </button>
            
            <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <div className="w-6 h-6 rounded bg-brand-blue flex items-center justify-center text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              SmsDigitals
            </Link>
          </div>
        </div>

        {/* Desktop: Dashboard Title (Visible on laptop >= 1280px) */}
        <div className="hidden lg:block">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h1>
        </div>
        
        {/* Right Side Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {mounted && (
            <button 
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-colors"
            >
              {resolvedTheme === 'dark' ? <Sun weight="duotone" size={20} /> : <Moon weight="duotone" size={20} />}
            </button>
          )}
          <div className="shrink-0 flex items-center">
            <NotificationBell />
          </div>
          <Link href="/dashboard/support" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-colors shrink-0">
            <Headset size={20} />
          </Link>
          
          {/* Avatar (Hidden on small mobile) */}
          <div className="hidden sm:block w-px h-6 bg-black/10 dark:bg-white/10 mx-2 shrink-0"></div>
          <div className="hidden sm:flex w-10 h-10 rounded-full bg-brand-blue/10 border border-black/10 dark:border-white/10 items-center justify-center text-sm font-medium text-brand-blue cursor-pointer hover:bg-brand-blue/15 transition-colors shrink-0 overflow-hidden shadow-sm dark:shadow-none relative">
            <img 
              src={avatarUrl || `https://api.dicebear.com/7.x/beam/svg?seed=${encodeURIComponent(email || 'user')}`} 
              alt="" 
              className="w-full h-full object-cover relative z-10" 
              onError={(e) => {
                // If DiceBear fails, fallback to a clean typographic gradient avatar
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue to-cyan-400 flex items-center justify-center text-white font-bold text-xs uppercase z-0">
              {(email || 'U').charAt(0)}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Only mounts if opened, and stays hidden on xl just in case) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden max-lg:block"
            />
            
            {/* Drawer */}
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#0A0A0A] border-r border-black/5 dark:border-white/10 z-[101] hidden max-lg:flex flex-col"
            >
              {/* Drawer Header */}
              <div className="h-20 flex items-center justify-between px-6 border-b border-black/5 dark:border-white/5">
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="w-6 h-6 rounded bg-brand-blue flex items-center justify-center text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  SmsDigitals
                </Link>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* Drawer Nav */}
              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {navGroups.map((group) => {
                  const filteredItems = group.items.filter(item => {
                    if ((item.name === "Admin Support" || item.name === "Admin Overview") && !isAdmin) return false;
                    return true;
                  });

                  if (filteredItems.length === 0) return null;

                  return (
                  <div key={group.title}>
                    <h3 className="px-4 text-[10px] font-mono tracking-widest text-slate-400 dark:text-white/30 mb-3 uppercase">
                      {group.title}
                    </h3>
                    <div className="space-y-1">
                      {filteredItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        
                        if ((item as any).disabled) {
                          return (
                            <div
                              key={item.name}
                              className="flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-all duration-200 cursor-not-allowed opacity-60 text-slate-500 dark:text-white/40"
                            >
                              <div className="flex items-center gap-3">
                                <Icon weight="regular" className="text-lg text-slate-400 dark:text-white/30" />
                                {item.name}
                              </div>
                              {item.badge && (
                                <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-slate-500 dark:text-white/50">
                                  {item.badge}
                               </span>
                              )}
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={clsx(
                              "flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-all duration-200 group",
                              isActive
                                ? "bg-brand-blue/10 text-brand-blue font-medium"
                                : "text-slate-600 hover:bg-black/5 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon
                                weight={isActive ? "fill" : "regular"}
                                className={clsx("text-lg", isActive ? "text-brand-blue" : "text-slate-400 group-hover:text-slate-700 dark:text-white/40 dark:group-hover:text-white/80")}
                              />
                              {item.name}
                            </div>
                            {item.badge && (
                              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-blue/20 text-brand-blue">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )})}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-black/5 dark:border-white/5 space-y-1 bg-slate-50 dark:bg-[#050505]">
                <Link 
                  href="/dashboard/settings" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-black/5 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
                >
                  <Gear className="text-lg text-slate-400 dark:text-white/40" />
                  Profile Settings
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-[#111] flex items-center justify-center border border-black/5 dark:border-white/5">
                    <SignOut className="text-lg" />
                  </div>
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
