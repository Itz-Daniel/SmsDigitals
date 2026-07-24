import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Admin Role Check
    const isAdmin = user?.user_metadata?.role === 'admin' || 
                    user?.app_metadata?.role === 'admin' ||
                    user?.email?.toLowerCase().includes('admin');

    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { targetUserId, newStatus } = await req.json();

    if (!targetUserId || !["active", "flagged", "banned"].includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status parameters." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    await supabaseAdmin
      .from("profiles")
      .update({
        account_status: newStatus,
        flag_reason: newStatus === "active" ? null : "Updated by Admin"
      })
      .eq("id", targetUserId);

    return NextResponse.json({
      success: true,
      message: `Account status updated to '${newStatus}' for user ID ${targetUserId}.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update user account status." }, { status: 500 });
  }
}
