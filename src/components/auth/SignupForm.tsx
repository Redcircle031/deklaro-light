"use client";

import { useState, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type SignupFormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

export function SignupForm() {
  const router = useRouter();
  const [formState, setFormState] = useState<SignupFormState>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

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

    if (formState.password !== formState.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    const supabase = getBrowserSupabaseClient();

    startTransition(async () => {
      try {
        const { error } = await supabase.auth.signUp({
          email: formState.email,
          password: formState.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) {
          setFormError(error.message);
          return;
        }

        setFormSuccess("Account created! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } catch (err) {
        console.error('Signup error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to authentication service';
        setFormError(
          `Network error: ${errorMessage}. ` +
          'This might be a CORS or network issue. Try: 1) Check your internet connection, ' +
          '2) Disable browser extensions, 3) Try a different browser, or ' +
          '4) Contact support if the issue persists.'
        );
      }
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={formState.email}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, email: event.target.value }))
          }
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={12}
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            value={formState.password}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, password: event.target.value }))
            }
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            value={formState.confirmPassword}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }
          />
        </div>
      </div>

      {errorAlert}
      {successAlert}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <a href="/login" className="font-semibold text-brand-600 hover:text-brand-500">
          Sign in instead
        </a>
      </p>
    </form>
  );
}
