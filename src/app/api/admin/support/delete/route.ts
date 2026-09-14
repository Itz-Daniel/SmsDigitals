import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const adminDb = createAdminClient();

    const { error } = await adminDb
      .from("support_tickets")
      .delete()
      .eq("id", ticketId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Ticket deleted successfully" });
  } catch (error: unknown) {
    console.error("Admin Ticket Delete Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to delete ticket";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
