import { NextResponse } from "next/server";
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

    const validStatuses = ["Resolved", "Closed", "Open"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .update({ status })
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, ticket: data });
  } catch (error: unknown) {
    console.error("User Support Status Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
