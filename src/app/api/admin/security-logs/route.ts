import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { isUserAdmin } from "@/lib/admin-guard";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Strict Admin Verification
    if (!user || !isUserAdmin(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch flagged accounts from profiles
    const { data: flaggedProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, account_status, flag_reason, flagged_at")
      .in("account_status", ["flagged", "banned"])
      .order("flagged_at", { ascending: false });

    // Fetch security logs
    const { data: logs } = await supabaseAdmin
      .from("admin_security_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      flaggedUsers: flaggedProfiles || [],
      securityLogs: logs || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch admin security logs." }, { status: 500 });
  }
}
