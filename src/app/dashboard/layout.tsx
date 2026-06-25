import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const email = user.email || "user@example.com";
  const initials = email.substring(0, 2);

  // Fetch avatar URL from profiles
  const { data: profileData } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  const avatarUrl = profileData?.avatar_url || null;
  const isAdmin = email === process.env.ADMIN_EMAIL;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground transition-colors duration-500">
      {/* Desktop Sidebar (Only visible on xl screens >= 1280px) */}
      <div className="hidden lg:block">
        <Sidebar email={email} initials={initials} avatarUrl={avatarUrl} isAdmin={isAdmin} />
      </div>
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto overflow-x-hidden pb-16 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Header avatarUrl={avatarUrl} isAdmin={isAdmin} email={email} />
        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
