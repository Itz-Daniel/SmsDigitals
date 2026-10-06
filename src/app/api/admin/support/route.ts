import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { isUserAdmin } from "@/lib/admin-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isUserAdmin(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
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
