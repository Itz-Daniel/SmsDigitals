import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sendAdminNotificationEmail } from "@/lib/resend";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, replyText, attachmentUrl } = body;

    if (!ticketId || (!replyText && !attachmentUrl)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch current ticket to verify ownership and get messages
    const { data: ticket, error: fetchError } = await supabase
      .from('support_tickets')
      .select('user_id, messages, subject')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentMessages = ticket.messages || [];
    const newMessages = [...currentMessages, { sender: 'user', text: replyText, timestamp: new Date().toISOString(), attachment_url: attachmentUrl || null }];

    const adminDb = createSupabaseClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Update ticket
    const { error: updateError } = await adminDb
      .from('support_tickets')
      .update({
        messages: newMessages,
        status: 'Open' // Mark as open so admin knows user replied
      })
      .eq('id', ticketId);

    if (updateError) throw updateError;

    // Send async email without blocking the response
    sendAdminNotificationEmail(ticket.subject || 'Support Ticket', true).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("User Reply Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to reply to ticket";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
