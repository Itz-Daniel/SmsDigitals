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

    const { ticketId, status } = await request.json();

    if (!ticketId || !status) {
      return NextResponse.json({ error: "ticketId and status are required" }, { status: 400 });
    }

    const validStatuses = ["Open", "In Progress", "Resolved", "Closed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const adminDb = createAdminClient();

    const { data, error } = await adminDb
      .from("support_tickets")
      .update({ status })
      .eq("id", ticketId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, ticket: data });
  } catch (error: unknown) {
    console.error("Admin Ticket Status Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
