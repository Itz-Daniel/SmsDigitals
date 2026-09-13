"use client";

import dynamic from "next/dynamic";

const CookieConsent = dynamic(() => import("@/components/CookieConsent").then(mod => mod.CookieConsent), { ssr: false });
const LivePurchaseToast = dynamic(() => import("@/components/LivePurchaseToast").then(mod => mod.LivePurchaseToast), { ssr: false });

export function ClientWidgets() {
  return (
    <>
      <CookieConsent />
      <LivePurchaseToast />
    </>
  );
}
