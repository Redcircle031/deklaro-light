import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Deklaro | Sign in",
  description: "Access Deklaro to automate Polish SME invoicing workflows.",
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return children;
}
