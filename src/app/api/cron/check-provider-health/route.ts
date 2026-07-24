import { NextResponse } from "next/server";
import { FiveSimApi, GrizzlyApi, TextVerifiedApi, SmsManApi, SmspvaApi } from "@/lib/providers/sms-providers";
import { notifyLowBalanceAlert, notifyProviderOfflineAlert } from "@/lib/telegram-admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const results: Record<string, { status: string; balance?: number; error?: string }> = {};

    // 1. Check 5Sim
    try {
      const b5 = await FiveSimApi.getBalance();
      results['5sim'] = { status: b5 < 5 ? 'LOW_BALANCE' : 'ONLINE', balance: b5 };
      if (b5 < 5) {
        await notifyLowBalanceAlert('5sim', b5);
      }
    } catch (e: any) {
      results['5sim'] = { status: 'OFFLINE', error: e.message || 'API error' };
      await notifyProviderOfflineAlert('5sim', e.message || 'API Connection Failed');
    }

    // 2. Check Grizzly
    try {
      const bGriz = await GrizzlyApi.getBalance();
      results['grizzly'] = { status: bGriz < 5 ? 'LOW_BALANCE' : 'ONLINE', balance: bGriz };
      if (bGriz < 5) {
        await notifyLowBalanceAlert('grizzly', bGriz);
      }
    } catch (e: any) {
      results['grizzly'] = { status: 'OFFLINE', error: e.message || 'API error' };
      await notifyProviderOfflineAlert('grizzly', e.message || 'API Connection Failed');
    }

    // 3. Check SMS-Man
    try {
      const bMan = await SmsManApi.getBalance();
      results['smsman'] = { status: bMan < 5 ? 'LOW_BALANCE' : 'ONLINE', balance: bMan };
      if (bMan < 5) {
        await notifyLowBalanceAlert('smsman', bMan);
      }
    } catch (e: any) {
      results['smsman'] = { status: 'OFFLINE', error: e.message || 'API error' };
      await notifyProviderOfflineAlert('smsman', e.message || 'API Connection Failed');
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      providers: results
    });

  } catch (error: any) {
    console.error("Provider Health Check Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
