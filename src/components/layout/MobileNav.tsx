"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Swap, Wallet, Hash, Gear } from "@phosphor-icons/react";
import clsx from "clsx";

const navItems = [
  { name: "Home", href: "/dashboard", icon: House },
  { name: "Wallet", href: "/dashboard/fund", icon: Wallet },
  { name: "Numbers", href: "/dashboard/sms", icon: Hash },
  { name: "History", href: "/dashboard/transactions", icon: Swap },
  { name: "Profile", href: "/dashboard/settings", icon: Gear },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-white/10 z-[100] lg:hidden pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-brand-blue" : "text-white/40 hover:text-white/80"
              )}
            >
              <Icon weight={isActive ? "fill" : "regular"} className="text-2xl" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
