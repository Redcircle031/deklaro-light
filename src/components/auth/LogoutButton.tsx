"use client";

import { useTransition } from "react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    startTransition(async () => {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });

      if (!response.ok) {
        console.error("Failed to sign out");
        return;
      }

      window.location.href = "/login";
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
