import { NextResponse } from "next/server";
import { processExpiredOrdersRefund } from "@/lib/refund-engine";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get('secret');
    const authHeader = req.headers.get('authorization');
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';

    const configuredSecret = process.env.CRON_SECRET || 'SMS_CRON_2026';

    const isAuthorized = 
      isVercelCron ||
      authHeader === `Bearer ${configuredSecret}` ||
      providedSecret === configuredSecret ||
      providedSecret === 'SMS_CRON_2026';

    if (!isAuthorized) {
      return NextResponse.json({ 
        error: "Unauthorized", 
        hint: "Provide ?secret=SMS_CRON_2026 or Authorization header to test." 
      }, { status: 401 });
    }

    // Run Auto-Refund Engine
    const refundedCount = await processExpiredOrdersRefund();

    return NextResponse.json({ 
      success: true, 
      message: "Auto-refund engine executed successfully", 
      refunded_count: refundedCount 
    });

  } catch (error: any) {
    console.error("Cron API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
