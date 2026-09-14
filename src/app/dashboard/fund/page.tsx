import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FundWalletClient from "./FundWalletClient";

export const dynamic = "force-dynamic";

export default async function FundWalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

  return (
    <FundWalletClient
      userEmail={user.email || ""}
      publicKey={publicKey}
      userId={user.id}
    />
  );
}
