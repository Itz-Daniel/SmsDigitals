"use client";

import dynamic from "next/dynamic";

const FloatingSupport = dynamic(() => import("@/components/FloatingSupport").then(mod => mod.FloatingSupport), { ssr: false });
const CookieConsent = dynamic(() => import("@/components/CookieConsent").then(mod => mod.CookieConsent), { ssr: false });
const LivePurchaseToast = dynamic(() => import("@/components/LivePurchaseToast").then(mod => mod.LivePurchaseToast), { ssr: false });

export function ClientWidgets() {
  return (
    <>
      <FloatingSupport />
      <CookieConsent />
      <LivePurchaseToast />
    </>
  );
}
