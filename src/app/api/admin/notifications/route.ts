import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Helper to authenticate admin
async function authenticateAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Unauthorized", status: 401 };
  }

  // Create admin DB client to bypass RLS
  const adminDb = createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  return { adminDb };
}

export async function GET() {
  try {
    const auth = await authenticateAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: notifications, error } = await auth.adminDb!
      .from('global_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error("Admin Notifications GET Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { title, message, icon_type } = await request.json();

    if (!title || !message || !icon_type) {
      return NextResponse.json({ error: "Title, message, and icon type are required." }, { status: 400 });
    }

    const { data, error } = await auth.adminDb!
      .from('global_notifications')
      .insert([{ title, message, icon_type }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, notification: data });
  } catch (error: any) {
    console.error("Admin Notifications POST Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authenticateAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Notification ID is required." }, { status: 400 });
    }

    const { error } = await auth.adminDb!
      .from('global_notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Notifications DELETE Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
