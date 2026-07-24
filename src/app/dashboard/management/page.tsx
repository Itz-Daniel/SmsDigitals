import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSettingsPanel from "./AdminSettingsPanel";
import GlobalNotificationManager from "./GlobalNotificationManager";
import DigitalIssuesPanel from "./DigitalIssuesPanel";

export const metadata = {
  title: 'HQ Control Center | SmsDigitals Management',
};

export const dynamic = 'force-dynamic';

export default async function ManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Strict Server-Side Security
  if (!user || user.app_metadata?.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch current settings directly from database (checking both settings and api_settings)
  const { data: settings } = await supabase
    .from('settings')
    .select('profit_margin, affiliate_percentage, brand_pricing, rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent')
    .eq('id', 1)
    .single();

  const { data: apiSettings } = await supabase
    .from('api_settings')
    .select('profit_margin, affiliate_percentage, brand_pricing, rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent')
    .limit(1)
    .single();

  const initialMargin = settings?.profit_margin ?? apiSettings?.profit_margin ?? 0.40;
  const initialAffiliatePercentage = settings?.affiliate_percentage ?? apiSettings?.affiliate_percentage ?? 5.0;
  const initialBrandPricing = settings?.brand_pricing ?? apiSettings?.brand_pricing ?? null;

  // Realistic defaults for Long-Term Rentals ($0.80 floor = ~₦1,200 NGN)
  const initialRentalMinFloor = settings?.rental_min_floor_usd ?? apiSettings?.rental_min_floor_usd ?? 0.80;
  const initialRentalDailyRate = settings?.rental_daily_rate_usd ?? apiSettings?.rental_daily_rate_usd ?? 0.50;
  const initialRentalMargin = settings?.rental_margin_percent ?? apiSettings?.rental_margin_percent ?? 30;

  return (
    <div className="min-h-screen p-4 md:p-8 pt-24 max-w-4xl mx-auto flex flex-col gap-8 pb-20 font-sans">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3 text-slate-900 dark:text-white">
          <span className="text-brand-blue">HQ</span> Control Center
        </h1>
        <p className="text-slate-500 dark:text-white/50 text-sm">
          Secured access for {user.email}. Manage global platform configurations.
        </p>
      </div>

      <DigitalIssuesPanel />
      <AdminSettingsPanel 
        initialMargin={initialMargin} 
        initialAffiliatePercentage={initialAffiliatePercentage}
        initialBrandPricing={initialBrandPricing}
        initialRentalMinFloor={initialRentalMinFloor}
        initialRentalDailyRate={initialRentalDailyRate}
        initialRentalMargin={initialRentalMargin}
      />
      <GlobalNotificationManager />
    </div>
  );
}
