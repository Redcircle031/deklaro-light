"use client";

import { useState, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const errorMessage = (formError ?? "").trim();
  const successMessage = (formSuccess ?? "").trim();
  const hasFormError = errorMessage.length > 0;
  const hasFormSuccess = successMessage.length > 0;

  let errorAlert: ReactNode = null;
  if (hasFormError) {
    errorAlert = (
      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {errorMessage}
      </p>
    );
  }

  let successAlert: ReactNode = null;
  if (hasFormSuccess) {
    successAlert = (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {successMessage}
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const supabase = getBrowserSupabaseClient();
    const redirectTo = `${window.location.origin}/reset/confirm`;

    startTransition(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      setFormSuccess(
        "If an account exists, we’ve sent password reset instructions to your email.",
      );
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {errorAlert}
      {successAlert}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending reset link..." : "Send reset instructions"}
      </button>
    </form>
  );
}
