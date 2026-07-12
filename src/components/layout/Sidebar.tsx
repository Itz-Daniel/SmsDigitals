"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, Swap, Wallet, Hash, CreditCard, ClockCounterClockwise, Gear, SignOut, Headset, ChartLineUp, Storefront, UsersThree } from "@phosphor-icons/react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";

export const navGroups = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: House },
      { name: "Transactions", href: "/dashboard/transactions", icon: Swap },
    ],
  },
  {
    title: "SERVICES",
    items: [
      { name: "Fund Wallet", href: "/dashboard/fund", icon: Wallet },
      { name: "Digital Marketplace", href: "/dashboard/marketplace", icon: Storefront, badge: "NEW" },
      { name: "Virtual Numbers", href: "/dashboard/sms", icon: Hash },
      { name: "Long Term Rentals", href: "/dashboard/sms/long-term", icon: ClockCounterClockwise },
      { name: "Affiliate Program", href: "/dashboard/affiliates", icon: UsersThree, badge: "EARN" },
      { name: "Virtual Cards", href: "/dashboard/cards", icon: CreditCard, disabled: true, badge: "SOON", badgeStyle: "disabled" },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { name: "SMS History", href: "/dashboard/history", icon: ClockCounterClockwise },
      { name: "Admin Overview", href: "/dashboard/management/overview", icon: ChartLineUp },
      { name: "Admin Support", href: "/dashboard/management/support", icon: Headset },
    ],
  },
  {
    title: "SUPPORT",
    items: [
      { name: "Support Tickets", href: "/dashboard/support", icon: Headset, badge: "24/7", badgeStyle: "support" },
    ],
  },
];

export function Sidebar({ email, initials, avatarUrl, isAdmin = false }: { email: string; initials: string; avatarUrl?: string | null; isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [hasUnreadReply, setHasUnreadReply] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      // Fetch if they are admin
      fetch('/api/admin/support')
        .then(res => res.json())
        .then(data => {
          if (data.tickets) {
            const open = data.tickets.filter((t: { status: string }) => t.status !== 'Resolved' && t.status !== 'Closed').length;
            setOpenTicketsCount(open);
          }
        })
        .catch(() => {});
    } else {
      // Fetch if they are normal user
      fetch('/api/support')
        .then(res => res.json())
        .then(data => {
          if (data.tickets) {
            const hasUnread = data.tickets.some((t: { has_unread_admin_reply: boolean }) => t.has_unread_admin_reply);
            setHasUnreadReply(hasUnread);
          }
        })
        .catch(() => {});
    }
  }, [pathname, isAdmin]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-64 border-r border-black/5 dark:border-white/5 bg-slate-50 dark:bg-base flex flex-col h-[100dvh] sticky top-0 transition-colors duration-500">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-8 border-b border-black/5 dark:border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          <div className="w-6 h-6 rounded bg-brand-blue flex items-center justify-center text-white">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          SmsDigitals
        </Link>
      </div>

      {/* User Profile Mini */}
      <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white dark:bg-surface border border-black/5 dark:border-white/10 flex items-center justify-center text-sm font-medium text-brand-blue uppercase overflow-hidden shrink-0 shadow-sm dark:shadow-none">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium truncate w-32 text-slate-900 dark:text-white">{email.split('@')[0]}</span>
          <span className="text-[11px] text-slate-500 dark:text-white/40 truncate w-32">{email}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                        className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-not-allowed opacity-60 text-slate-500 dark:text-white/40"
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
                      className={clsx(
                        "flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all duration-200 group",
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
                      {item.name === "Admin Support" && openTicketsCount > 0 ? (
                        <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse">
                          {openTicketsCount}
                        </span>
                      ) : item.name === "Support Tickets" && hasUnreadReply ? (
                        <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-blue text-white shadow-[0_0_10px_rgba(34,197,94,0.3)] animate-pulse">
                          NEW REPLY
                        </span>
                      ) : item.badge && (
                        <span className={clsx(
                          "text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded",
                          (item as { badgeStyle?: string }).badgeStyle === "support"
                            ? "bg-slate-900 dark:bg-white text-white dark:text-black border border-slate-900 dark:border-white/20"
                            : "bg-brand-blue/20 text-brand-blue"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer Nav */}
      <div className="p-4 pb-12 border-t border-black/5 dark:border-white/5 space-y-1">
        <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-black/5 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white transition-colors">
          <Gear className="text-lg text-slate-400 dark:text-white/40" />
          Profile Settings
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-danger/80 hover:bg-danger/10 hover:text-danger transition-colors"
        >
          <SignOut className="text-lg" />
          Logout
        </button>
      </div>
    </aside>
  );
}
