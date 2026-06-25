"use client";

import dynamic from "next/dynamic";

const FundWalletClient = dynamic(() => import("./FundWalletClient"), {
  ssr: false,
});

export default function FundWalletPage() {
  return <FundWalletClient />;
}
