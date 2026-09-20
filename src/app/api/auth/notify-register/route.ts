import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Fire and forget welcome email
    sendWelcomeEmail(email).catch((err) =>
      console.error("Error sending register welcome email:", err)
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Notify register error:", err);
    return NextResponse.json({ error: "Failed to process register notification" }, { status: 500 });
  }
}
