import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Total Users
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 2. Total Funding Volume (Revenue)
    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('amount')
      .eq('type', 'Funding')
      .eq('status', 'Success');

    const totalRevenue = transactions?.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) || 0;

    // 3. SMS Rentals Stats
    const { count: activeRentals } = await supabaseAdmin
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Waiting', 'Received']);

    const { count: totalRentals } = await supabaseAdmin
      .from('rentals')
      .select('*', { count: 'exact', head: true });

    // 4. Open Support Tickets
    const { count: openTickets } = await supabaseAdmin
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("Resolved","Closed")');

    // 5. Recent Activity (last 5 signups and deposits)
    const { data: recentUsers } = await supabaseAdmin
      .from('profiles')
      .select('id, email, created_at, avatar_url')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentDeposits } = await supabaseAdmin
      .from('transactions')
      .select('id, amount, currency, created_at, user_id')
      .eq('type', 'Funding')
      .eq('status', 'Success')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalRevenue,
        activeRentals: activeRentals || 0,
        totalRentals: totalRentals || 0,
        openTickets: openTickets || 0,
      },
      recent: {
        users: recentUsers || [],
        deposits: recentDeposits || []
      }
    });

  } catch (error: unknown) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
