import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendTicketReplyEmail } from "@/lib/resend";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify admin role in a real app, for MVP assume route is protected
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticketId, replyText, userEmail, ticketSubject, attachmentUrl } = await request.json();

    if (!ticketId || (!replyText && !attachmentUrl)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // 1. Fetch current ticket to get messages array
    const { data: ticket, error: fetchError } = await adminDb
      .from('support_tickets')
      .select('messages')
      .eq('id', ticketId)
      .single();

    if (fetchError) throw fetchError;

    const currentMessages = ticket.messages || [];
    const newMessages = [...currentMessages, { sender: 'admin', text: replyText, timestamp: new Date().toISOString(), attachment_url: attachmentUrl || null }];

    // 2. Update ticket in DB
    const { error: updateError } = await adminDb
      .from('support_tickets')
      .update({
        admin_reply: replyText, // Keep for backwards compatibility temporarily
        messages: newMessages,
        status: 'In Progress', // Keep it open since it's a chat now
        has_unread_admin_reply: true
      })
      .eq('id', ticketId);

    if (updateError) throw updateError;

    // 2. Send Email to the customer
    if (userEmail && userEmail !== 'Unknown User') {
      await sendTicketReplyEmail(userEmail, ticketSubject || 'Support Ticket', replyText);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Admin Reply Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to send reply";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
