import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTicketCreatedEmail, sendAdminNotificationEmail } from "@/lib/resend";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tickets });
  } catch (error: unknown) {
    console.error("Support API GET Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, message, priority } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .insert([
        {
          user_id: user.id,
          subject,
          message,
          priority: priority || 'Normal',
          status: 'Open',
          messages: [{ sender: 'user', text: message, timestamp: new Date().toISOString() }],
          has_unread_admin_reply: false
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Send async emails without blocking the response
    if (user.email) {
      sendTicketCreatedEmail(user.email, subject).catch(console.error);
    }
    sendAdminNotificationEmail(subject, false).catch(console.error);

    return NextResponse.json({ success: true, ticket: data });
  } catch (error: unknown) {
    console.error("Support API POST Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
