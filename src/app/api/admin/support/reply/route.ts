import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendTicketReplyEmail } from "@/lib/resend";
import { isUserAdmin } from "@/lib/admin-guard";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isUserAdmin(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { ticketId, replyText, userEmail, ticketSubject, attachmentUrl } = await request.json().catch(() => ({}));

    if (!ticketId || (!replyText && !attachmentUrl)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let safeAttachmentUrl: string | null = null;
    if (attachmentUrl && typeof attachmentUrl === 'string') {
      try {
        const parsed = new URL(attachmentUrl);
        if (parsed.protocol === 'https:') {
          safeAttachmentUrl = attachmentUrl;
        }
      } catch {}
    }

    const cleanReplyText = typeof replyText === 'string' ? replyText.slice(0, 5000) : "";

    const adminDb = createAdminClient();

    // 1. Fetch current ticket to get messages array
    const { data: ticket, error: fetchError } = await adminDb
      .from('support_tickets')
      .select('messages, subject')
      .eq('id', ticketId)
      .single();

    if (fetchError) throw fetchError;

    const currentMessages = ticket.messages || [];
    const newMessages = [
      ...currentMessages, 
      { 
        sender: 'admin', 
        text: cleanReplyText, 
        timestamp: new Date().toISOString(), 
        attachment_url: safeAttachmentUrl 
      }
    ];

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

    return NextResponse.json({ 
      success: true, 
      messages: newMessages,
      newMessage: newMessages[newMessages.length - 1] 
    });
  } catch (error: unknown) {
    console.error("Admin Reply Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to send reply";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
