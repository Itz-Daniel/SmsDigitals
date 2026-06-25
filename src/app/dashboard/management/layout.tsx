import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const email = user.email || "";
  const isAdmin = email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return (
    <>
      {children}
    </>
  );
}
