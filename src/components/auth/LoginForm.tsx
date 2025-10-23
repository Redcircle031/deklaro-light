"use client";

import { useState, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type LoginFormState = {
  email: string;
  password: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formState, setFormState] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const errorMessage = (formError ?? "").trim();
  const hasFormError = errorMessage.length > 0;

  let errorAlert: ReactNode = null;
  if (hasFormError) {
    errorAlert = (
      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {errorMessage}
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    setFormError(null);

    const supabase = getBrowserSupabaseClient();

    startTransition(async () => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: formState.email,
          password: formState.password,
        });

        if (error) {
          setFormError(error.message);
          return;
        }

        router.push(redirectTo);
        router.refresh();
      } catch (err) {
        console.error('Login error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to authentication service';
        setFormError(`Network error: ${errorMessage}`);
      }
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} method="post" action="#">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={formState.email}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, email: event.target.value }))
          }
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <a href="/reset" className="text-xs font-semibold text-brand-600 hover:text-brand-500">
            Forgot password?
          </a>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={formState.password}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, password: event.target.value }))
          }
        />
      </div>

      {errorAlert}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="font-semibold text-brand-600 hover:text-brand-500">
          Create one now
        </a>
      </p>
    </form>
  );
}
