import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Deklaro | Sign in",
};

export default function LoginPage() {
  return (
    <AuthShell
      heading="Welcome back"
      subheading="Sign in to process invoices, manage tenants, and keep your clients compliant."
    >
      <LoginForm />
    </AuthShell>
  );
}
