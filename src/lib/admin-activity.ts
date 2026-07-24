import { createAdminClient } from "@/lib/supabase/admin";

export interface SecurityLogParams {
  type: "fraud_alert" | "deposit" | "system_alert";
  title: string;
  message: string;
  userId?: string;
  userEmail?: string;
}

export async function logAdminSecurityActivity(params: SecurityLogParams): Promise<void> {
  try {
    const supabaseAdmin = createAdminClient();

    await supabaseAdmin
      .from("admin_security_logs")
      .insert({
        type: params.type,
        title: params.title,
        message: params.message,
        user_id: params.userId || null,
        user_email: params.userEmail || null,
        status: "pending",
        created_at: new Date().toISOString()
      });
  } catch (err) {
    console.warn("Failed to log admin security activity to database:", err);
  }
}
