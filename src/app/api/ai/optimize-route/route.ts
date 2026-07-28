import { NextResponse } from "next/server";
import { getOptimalCarrierRoute } from "@/lib/ai-verification-engine";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { country = 'us', service = 'whatsapp' } = await req.json();
    const routes = getOptimalCarrierRoute(country, service);

    return NextResponse.json({
      success: true,
      country,
      service,
      recommendedRoute: routes[0],
      allRoutes: routes
    });
  } catch (error: any) {
    console.error("AI Optimize Route API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to optimize route." }, { status: 500 });
  }
}
