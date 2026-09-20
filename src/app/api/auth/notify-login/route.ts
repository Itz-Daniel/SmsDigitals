import { NextResponse } from "next/server";
import { sendLoginAlertEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Capture IP and User-Agent from incoming headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("x-real-ip") || 
               "Unknown IP";
    const userAgent = req.headers.get("user-agent") || "Web Browser";

    // Dispatch login security email in background
    sendLoginAlertEmail({
      userEmail: email,
      ipAddress: ip,
      userAgent: userAgent,
    }).catch((err) => console.error("Error sending login alert email:", err));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Notify login error:", err);
    return NextResponse.json({ error: "Failed to process login notification" }, { status: 500 });
  }
}
