"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, Swap, Wallet, Hash, CreditCard, ClockCounterClockwise, Gear, SignOut, Headset, ChartLineUp, Storefront, UsersThree, Code, User } from "@phosphor-icons/react";
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
      { name: "Virtual Numbers", href: "/dashboard/sms", icon: Hash, badge: "NEW" },
      { name: "Long Term Rentals", href: "/dashboard/sms/long-term", icon: ClockCounterClockwise, badge: "NEW" },
      { name: "Developer API", href: "/dashboard/api", icon: Code, badge: "API", badgeStyle: "new" },
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
      { name: "Global Settings", href: "/dashboard/management", icon: Gear },
    ],
  },
  {
    title: "ACCOUNT & SUPPORT",
    items: [
      { name: "Profile Settings", href: "/dashboard/settings", icon: Gear },
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
    <aside className="w-64 border-r border-black/5 dark:border-white/5 bg-slate-50 dark:bg-base flex flex-col h-[100dvh] sticky top-0 transition-colors duration-500 font-sans">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-8 border-b border-black/5 dark:border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          <img src="/icon.svg" alt="SmsDigitals" className="w-7 h-7 rounded-lg object-cover shadow-sm" />
          SmsDigitals
        </Link>
      </div>

      {/* User Profile Mini (Clickable to /dashboard/settings) */}
      <Link 
        href="/dashboard/settings"
        className="p-5 border-b border-black/5 dark:border-white/5 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
      >
        <div className="w-10 h-10 rounded-full bg-white dark:bg-surface border border-black/5 dark:border-white/10 flex items-center justify-center text-sm font-medium text-brand-blue uppercase overflow-hidden shrink-0 shadow-sm group-hover:border-brand-blue/40 transition-colors">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="flex flex-col truncate">
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-brand-blue transition-colors">{email}</span>
          <span className="text-[10px] text-slate-500 dark:text-white/40 font-mono flex items-center gap-1">
            <Gear size={10} className="text-brand-blue" /> Profile Settings
          </span>
        </div>
      </Link>

      {/* Nav Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {navGroups.map((group) => {
          // Hide MANAGEMENT group if user is not admin
          if (group.title === "MANAGEMENT" && !isAdmin) {
            return null;
          }

          return (
            <div key={group.title} className="flex flex-col gap-1.5">
              <span className="px-4 text-[10px] font-bold tracking-wider text-slate-400 dark:text-white/30 uppercase font-mono">
                {group.title}
              </span>

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const isDisabled = (item as any).disabled;

                let badgeText = item.badge;

                if (isDisabled) {
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 dark:text-white/30 cursor-not-allowed opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full border bg-slate-500/10 text-slate-400 border-slate-500/20 font-bold">
                          {badgeText}
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
                      "flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all group relative overflow-hidden",
                      isActive
                        ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
                        : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <Icon size={18} className={clsx(isActive ? "text-white" : "text-slate-500 dark:text-white/40 group-hover:text-slate-900 dark:group-hover:text-white")} />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <div className="relative z-10 shrink-0">
                        {item.badge === "NEW" ? (
                          <span
                            className={clsx(
                              "text-[9px] px-2 py-0.5 rounded-full border font-extrabold tracking-wider transition-all flex items-center gap-1.5",
                              isActive
                                ? "bg-white/20 text-white border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.4)] backdrop-blur-md"
                                : "bg-brand-blue/15 text-brand-blue dark:text-cyan-400 border-brand-blue/30 dark:border-cyan-400/30 shadow-[0_0_12px_rgba(0,112,243,0.35)] animate-pulse"
                            )}
                          >
                            <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0 animate-ping", isActive ? "bg-emerald-300" : "bg-brand-blue dark:bg-cyan-400")} />
                            {item.badge}
                          </span>
                        ) : item.badgeStyle === "support" && ((isAdmin && openTicketsCount > 0) || (!isAdmin && hasUnreadReply)) ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-extrabold animate-pulse">
                            {isAdmin ? `${openTicketsCount} OPEN` : "1 NEW"}
                          </span>
                        ) : (
                          <span
                            className={clsx(
                              "text-[9px] px-2 py-0.5 rounded-full border font-bold",
                              isActive
                                ? "bg-white/20 text-white border-white/30"
                                : "bg-brand-blue/10 text-brand-blue border-brand-blue/20"
                            )}
                          >
                            {badgeText}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-black/5 dark:border-white/5">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <SignOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
