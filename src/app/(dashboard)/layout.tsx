import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { TenantProvider } from "@/components/tenant/TenantProvider";
import { TenantSwitcher } from "@/components/tenant/TenantSwitcher";
import { env } from "@/lib/env";
import { getServerSession } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Deklaro | Dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In demo mode, skip authentication
  let session = null;
  if (env.isConfigured && !env.isDemoMode) {
    session = await getServerSession();
    if (!session) {
      redirect("/login");
    }
  }

  return (
    <TenantProvider>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="container-responsive flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-6">
              <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
                Deklaro
              </Link>
              <nav className="flex items-center gap-3 text-sm text-slate-600">
                <Link
                  href="/dashboard"
                  className="rounded-lg px-2 py-1 font-semibold text-slate-600 transition hover:text-brand-600"
                >
                  Overview
                </Link>
                <Link
                  href="/dashboard/invoices"
                  className="rounded-lg px-2 py-1 font-semibold text-slate-600 transition hover:text-brand-600"
                >
                  Invoices
                </Link>
                <Link
                  href="/dashboard/tenants"
                  className="rounded-lg px-2 py-1 font-semibold text-slate-600 transition hover:text-brand-600"
                >
                  Tenants
                </Link>
                <Link
                  href="/dashboard/tenants/invitations"
                  className="rounded-lg px-2 py-1 font-semibold text-slate-600 transition hover:text-brand-600"
                >
                  Invitations
                </Link>
              </nav>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
              <TenantSwitcher />
              {env.isConfigured && session ? (
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span>{session.user.email}</span>
                  <LogoutButton />
                </div>
              ) : (
                <div className="rounded-md bg-yellow-50 px-3 py-1 text-xs text-yellow-800">
                  Demo Mode
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="container-responsive flex-1 py-10">{children}</main>
      </div>
    </TenantProvider>
  );
}
