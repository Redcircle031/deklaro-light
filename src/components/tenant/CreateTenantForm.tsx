"use client";

import { useState } from "react";
import { ensureTenantSlug } from "@/lib/utils/slugify";
import { useTenant } from "./TenantProvider";

type CreateTenantFormProps = {
  onComplete?: () => void;
};

export function CreateTenantForm({ onComplete }: CreateTenantFormProps) {
  const { createTenant, tenants } = useTenant();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorMessage = (error ?? "").trim();
  const errorAlert =
    errorMessage.length > 0 ? (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {errorMessage}
      </p>
    ) : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 3) {
      setError("Name must be at least 3 characters.");
      return;
    }

    const finalSlug = slug.trim().length
      ? ensureTenantSlug(slug, tenants.map((tenant) => tenant.slug))
      : ensureTenantSlug(name, tenants.map((tenant) => tenant.slug));

    try {
      setIsSubmitting(true);
      const created = await createTenant({ name: name.trim(), slug: finalSlug });
      if (!created) {
        setError("Unable to create tenant. Try again.");
        return;
      }
      setName("");
      setSlug("");
      onComplete?.();
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "Unable to create tenant.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="tenant-name" className="mb-2 block text-sm font-semibold text-slate-700">
          Tenant name
        </label>
        <input
          id="tenant-name"
          name="tenant-name"
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          placeholder="E.g., Warsaw Accounting Group"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={3}
        />
      </div>
      <div>
        <label htmlFor="tenant-slug" className="mb-2 block text-sm font-semibold text-slate-700">
          Tenant slug (optional)
        </label>
        <input
          id="tenant-slug"
          name="tenant-slug"
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          placeholder="warsaw-accounting"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
        />
        <p className="mt-2 text-xs text-slate-500">
          Slugs create human-friendly URLs for reporting dashboards. Leave empty to auto-generate.
        </p>
      </div>
      {errorAlert}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-xl bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating..." : "Create tenant"}
      </button>
    </form>
  );
}
