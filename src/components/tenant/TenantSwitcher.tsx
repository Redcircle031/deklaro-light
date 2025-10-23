"use client";

import { useState } from "react";
import Link from "next/link";

import { useTenant } from "./TenantProvider";

export function TenantSwitcher() {
  const { activeTenant, tenants, switchTenant } = useTenant();
  const [isSwitching, setIsSwitching] = useState(false);

  if (!activeTenant) {
    return (
      <Link
        href="/dashboard/tenants"
        className="rounded-lg border border-dashed border-brand-300 px-3 py-1 text-xs font-semibold text-brand-700 hover:border-brand-400 hover:text-brand-600"
      >
        Select tenant
      </Link>
    );
  }

  async function handleSwitch(event: React.ChangeEvent<HTMLSelectElement>) {
    const tenantId = event.target.value;
    if (!tenantId || !activeTenant || tenantId === activeTenant.id) {
      return;
    }
    try {
      setIsSwitching(true);
      await switchTenant(tenantId);
    } finally {
      setIsSwitching(false);
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-500">
      Tenant
      <select
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        value={activeTenant.id}
        onChange={handleSwitch}
        disabled={isSwitching}
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name} ({tenant.role})
          </option>
        ))}
      </select>
    </label>
  );
}
