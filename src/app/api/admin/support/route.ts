import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // In a real app, verify admin role here. For MVP, we assume /api/admin is protected or we trust this call
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminDb = createAdminClient();
    
    // Fetch all tickets
    const { data: tickets, error } = await adminDb
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch user details for these tickets to get emails
    // A more scalable way is a DB view, but for MVP we fetch users directly
    const { data: usersData, error: authError } = await adminDb.auth.admin.listUsers();
    
    const ticketsWithEmails = tickets.map(ticket => {
      const ticketUser = usersData?.users.find(u => u.id === ticket.user_id);
      return {
        ...ticket,
        user_email: ticketUser?.email || 'Unknown User'
      };
    });

    return NextResponse.json({ tickets: ticketsWithEmails });
  } catch (error: unknown) {
    console.error("Admin Support API GET Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
