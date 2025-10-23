"use client";

import { useState, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export function ResetPasswordConfirmForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (password.length < 12) {
      setFormError("Password must be at least 12 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords must match.");
      return;
    }

    const supabase = getBrowserSupabaseClient();

    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError(error.message);
        return;
      }

      setFormSuccess("Password updated. Redirecting to sign in…");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={12}
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={12}
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>

      {errorAlert}
      {successAlert}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Updating password..." : "Update password"}
      </button>
    </form>
  );
}
