"use client";

import Link from "next/link";

import { useTenant } from "./TenantProvider";
import { TenantSwitcher } from "./TenantSwitcher";

export function TenantOverviewCard() {
  const { tenants, activeTenant } = useTenant();

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Tenant overview</h2>
          <p className="text-sm text-slate-600">
            Manage accounting units, assign roles, and configure Deklaro automation rules.
          </p>
        </div>
        <TenantSwitcher />
      </div>
      <dl className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Active tenant</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900">
            {activeTenant?.name ?? "None selected"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Tenants managed</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900">{tenants.length}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt>
          <dd className="mt-1 text-base font-semibold capitalize text-slate-900">
            {activeTenant?.role.toLowerCase() ?? "N/A"}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          href="/dashboard/tenants/invitations"
          className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-600"
        >
          Manage invitations
        </Link>
        <Link
          href="/dashboard/tenants/settings"
          className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-600"
        >
          Tenant settings
        </Link>
      </div>
    </div>
  );
}
