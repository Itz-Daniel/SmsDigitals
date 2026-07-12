"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      // Store the referral code in a cookie for 30 days
      const d = new Date();
      d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
      document.cookie = `ref_code=${ref};expires=${d.toUTCString()};path=/`;
    }
  }, [searchParams]);

  return null;
}
