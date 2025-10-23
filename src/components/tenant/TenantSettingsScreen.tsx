"use client";

/* eslint-disable react/jsx-no-leaked-render */

import { useMemo, useState } from "react";

import type { TenantRecord } from "@/lib/supabase";

import { useTenant } from "./TenantProvider";
import { CreateTenantForm } from "./CreateTenantForm";

export function TenantSettingsScreen() {
  const { tenants, activeTenant, refresh } = useTenant();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const activeTenantName = activeTenant?.name ?? "No active tenant";
  const activeTenantSlug = activeTenant?.slug ?? "N/A";
  const activeTenantRole = activeTenant ? activeTenant.role.toLowerCase() : "N/A";
  const tenantCountCopy = useMemo(
    () =>
      `Found ${tenants.length} tenant${tenants.length === 1 ? "" : "s"} connected to your Deklaro account.`,
    [tenants.length],
  );
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Tenant settings</h1>
        <p className="text-sm text-slate-600">
          Configure Deklaro for each accounting unit. Create new tenants, inspect current members,
          and prepare invitation links for accountants and client roles.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Active tenant</h2>
            <p className="text-sm text-slate-600">
              The selected tenant defines data visibility, Supabase RLS context, and KSeF
              automation scope.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-600"
            onClick={() => refresh().catch((error) => console.error(error))}
          >
            Refresh tenants
          </button>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">{activeTenantName}</dd>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Slug</dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">{activeTenantSlug}</dd>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt>
            <dd className="mt-1 text-base font-semibold capitalize text-slate-900">
              {activeTenantRole}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Tenant directory</h2>
            <p className="text-sm text-slate-600">{tenantCountCopy}</p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? "Hide create form" : "Create new tenant"}
          </button>
        </div>

        {showCreateForm ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <CreateTenantForm onComplete={() => setShowCreateForm(false)} />
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <TenantTableBody tenants={tenants} />
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <h2 className="mb-2 text-base font-semibold">Invitation workflow</h2>
        <p>
          Invitation flows leverage Supabase edge functions and email templates to onboard
          accountants and client contacts. The UI wiring and notification templates will be added in
          the following iteration once the backend token endpoints are available.
        </p>
      </section>
    </div>
  );
}

function TenantTableBody({ tenants }: { tenants: TenantRecord[] }) {
  if (tenants.length === 0) {
    return (
      <tr>
        <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
          No tenants assigned yet. Create the first tenant to enable Deklaro features.
        </td>
      </tr>
    );
  }

  return (
    <>
      {tenants.map((tenant) => (
        <TenantTableRow key={tenant.id} tenant={tenant} />
      ))}
    </>
  );
}

function TenantTableRow({ tenant }: { tenant: TenantRecord }) {
  const roleLabel = useMemo(() => tenant.role.toLowerCase(), [tenant.role]);
  const createdAtLabel = useMemo(
    () => new Date(tenant.createdAt).toLocaleDateString(),
    [tenant.createdAt],
  );

  return (
    <tr className="bg-white">
      <td className="px-4 py-3 font-semibold text-slate-900">{tenant.name}</td>
      <td className="px-4 py-3 text-slate-600">{tenant.slug}</td>
      <td className="px-4 py-3 capitalize text-slate-600">{roleLabel}</td>
      <td className="px-4 py-3 text-right text-slate-500">{createdAtLabel}</td>
    </tr>
  );
}


/* eslint-enable react/jsx-no-leaked-render */

