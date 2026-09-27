import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { GlobalCodePopup } from "@/components/GlobalCodePopup";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { CurrencyOnboardingModal } from "@/components/CurrencyOnboardingModal";
import { AccountStatusBanner } from "@/components/AccountStatusBanner";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const email = user.email || "user@example.com";
  const initials = email.substring(0, 2);

  // Fetch avatar URL and account status from profiles
  const { data: profileData } = await supabase
    .from("profiles")
    .select("avatar_url, account_status, flag_reason, referred_by")
    .eq("id", user.id)
    .single();

  // Automatic referral linking if ref_code cookie is present and user not yet linked
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const refCode = cookieStore.get("ref_code")?.value;
    if (refCode && !profileData?.referred_by) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const supabaseAdmin = createAdminClient();
      const { data: referrer } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("referral_code", refCode)
        .maybeSingle();

      if (referrer && referrer.id !== user.id) {
        await supabaseAdmin
          .from("profiles")
          .update({ referred_by: referrer.id })
          .eq("id", user.id);
      }
    }
  } catch (refErr) {
    console.error("DashboardLayout referral link error:", refErr);
  }

  const avatarUrl = profileData?.avatar_url || null;
  const accountStatus = profileData?.account_status || "active";
  const flagReason = profileData?.flag_reason || null;
  const isAdmin = user?.app_metadata?.role === 'admin';
  const isDeveloperApiEnabled = Boolean(user?.user_metadata?.developer_api_enabled);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground transition-colors duration-500 font-sans">
      {/* Desktop Sidebar (Only visible on xl screens >= 1280px) */}
      <div className="hidden lg:block">
        <Sidebar email={email} initials={initials} avatarUrl={avatarUrl} isAdmin={isAdmin} isDeveloperApiEnabled={isDeveloperApiEnabled} />
      </div>
      <CurrencyProvider>
        <main className="flex-1 flex flex-col h-full relative overflow-y-auto overflow-x-hidden pb-28 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Header avatarUrl={avatarUrl} isAdmin={isAdmin} email={email} isDeveloperApiEnabled={isDeveloperApiEnabled} />
          <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full flex-1">
            <AccountStatusBanner status={accountStatus} reason={flagReason} />
            {children}
          </div>
        </main>
        <MobileBottomNav />
        <GlobalCodePopup userId={user.id} />
        <CurrencyOnboardingModal />
      </CurrencyProvider>
    </div>
  );
}
