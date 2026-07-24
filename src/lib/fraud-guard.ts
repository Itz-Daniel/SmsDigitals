import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTelegramAdmin } from "@/lib/telegram-admin";
import { logAdminSecurityActivity } from "@/lib/admin-activity";

export interface FraudCheckParams {
  userId: string;
  userEmail: string;
  ipAddress: string;
  deviceFingerprint: string;
  reason: string;
}

export async function flagUserForFraud(params: FraudCheckParams): Promise<void> {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Update Profile Status to 'flagged'
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        account_status: "flagged",
        flag_reason: params.reason,
        flagged_at: new Date().toISOString()
      })
      .eq("id", params.userId);

    if (error) {
      console.warn("Fraud guard profile update warning:", error.message);
    }

    // 2. Log to Admin Portal Security Activity Feed
    await logAdminSecurityActivity({
      type: "fraud_alert",
      title: "🚨 Fraud Security Alert: Account Soft-Frozen",
      message: `${params.userEmail} soft-frozen. Reason: ${params.reason}. IP: ${params.ipAddress}, Device: ${params.deviceFingerprint}`,
      userId: params.userId,
      userEmail: params.userEmail
    });

    // 3. Notify Admin via Telegram
    const telegramMessage = `🚨 <b>FRAUD SECURITY ALERT: Suspicious Activity Detected!</b>\n\n` +
      `👤 User: <code>${params.userEmail}</code> (ID: ${params.userId})\n` +
      `📍 IP Address: <code>${params.ipAddress}</code>\n` +
      `💻 Device FP: <code>${params.deviceFingerprint}</code>\n` +
      `⚠️ Reason: ${params.reason}\n\n` +
      `<i>Action: Account temporarily soft-frozen. All platform feature access blocked. Please review in Admin Dashboard.</i>`;

    await notifyTelegramAdmin(telegramMessage);
  } catch (err) {
    console.error("Failed to flag user for fraud:", err);
  }
}

export async function checkUserAccountStatus(userId: string): Promise<{ isBlocked: boolean; status: string; reason?: string }> {
  if (!userId) return { isBlocked: false, status: "active" };

  try {
    const supabaseAdmin = createAdminClient();
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("account_status, flag_reason")
      .eq("id", userId)
      .single();

    if (error || !profile) return { isBlocked: false, status: "active" };

    if (profile.account_status === "banned") {
      return {
        isBlocked: true,
        status: "banned",
        reason: "🚫 Account permanently suspended due to terms of service violation. Access to all features has been disabled."
      };
    }

    if (profile.account_status === "flagged") {
      return {
        isBlocked: true,
        status: "flagged",
        reason: "⚠️ Account temporarily flagged for security review. All features are locked until support review."
      };
    }

    return { isBlocked: false, status: "active" };
  } catch (err) {
    return { isBlocked: false, status: "active" };
  }
}

/**
 * Global helper to enforce account status on feature API routes.
 * Returns NextResponse error if user is banned or flagged, or null if active.
 */
export async function enforceActiveAccount(userId: string): Promise<NextResponse | null> {
  const statusCheck = await checkUserAccountStatus(userId);
  if (statusCheck.isBlocked) {
    return NextResponse.json(
      { 
        error: statusCheck.reason,
        account_status: statusCheck.status,
        help_url: "https://smsdigitals.vercel.app/dashboard/support"
      }, 
      { status: 403 }
    );
  }
  return null;
}
