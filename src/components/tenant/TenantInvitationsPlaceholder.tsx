"use client";

import Link from "next/link";

export function TenantInvitationsPlaceholder() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Invitations</h1>
        <p className="text-sm text-slate-600">
          Manage accountant and client invitations. This view will connect to Deklaro&apos;s
          Supabase functions responsible for issuing time-bound invitation tokens and onboarding
          flows.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm text-slate-600">
          The invitation endpoints are being implemented in the backend sprint. Once available, this
          page will let you generate invite links, assign default roles, and resend pending invites.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          In the meantime, keep tenant memberships in sync directly via the Supabase console or SQL
          migrations. Track progress in{" "}
          <Link href="/specs/001-deklaro-mvp/tasks.md" className="font-semibold text-brand-600">
            Task 1.7
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
