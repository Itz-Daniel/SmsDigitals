import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminSecurityActivity } from "@/lib/admin-activity";
import { notifyTelegramAdmin, escapeHtml } from "@/lib/telegram-admin";
import { NextResponse } from "next/server";

export interface FlagFraudParams {
  userId: string;
  userEmail: string;
  ipAddress: string;
  deviceFingerprint: string;
  reason: string;
}

/**
 * Flag an account for fraud, freeze access to all platform features,
 * and dispatch urgent security alerts to Admin feed and Telegram.
 */
export async function flagUserForFraud(params: FlagFraudParams) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Mark account as flagged in database
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

    // 3. Notify Admin via Telegram with sanitized HTML
    const telegramMessage = `🚨 <b>FRAUD SECURITY ALERT: Suspicious Activity Detected!</b>\n\n` +
      `👤 User: <code>${escapeHtml(params.userEmail)}</code> (ID: ${escapeHtml(params.userId)})\n` +
      `📍 IP Address: <code>${escapeHtml(params.ipAddress)}</code>\n` +
      `💻 Device FP: <code>${escapeHtml(params.deviceFingerprint)}</code>\n` +
      `⚠️ Reason: ${escapeHtml(params.reason)}\n\n` +
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

    if (error) {
      console.error("Fraud guard error checking status for", userId, error);
      // Fail-closed on database connection errors
      return { isBlocked: true, status: "locked", reason: "Security verification temporarily unavailable. Please retry in a few moments." };
    }

    if (!profile) {
      return { isBlocked: true, status: "not_found", reason: "User profile not found." };
    }

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
    console.error("Fraud guard exception for", userId, err);
    return { isBlocked: true, status: "locked", reason: "Security verification temporarily unavailable." };
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
        help_url: `${(process.env.NEXT_PUBLIC_SITE_URL || "https://www.smsdigital.fun").replace(/\/$/, "")}/dashboard/support`
      }, 
      { status: 403 }
    );
  }
  return null;
}

export function calculateUserDiscount(lifetimeDepositsUsd: number): number {
  if (lifetimeDepositsUsd >= 500) return 12; // Gold (12% off)
  if (lifetimeDepositsUsd >= 100) return 7;  // Silver (7% off)
  if (lifetimeDepositsUsd >= 20) return 3;   // Bronze (3% off)
  return 0; // Standard (0% off)
}
