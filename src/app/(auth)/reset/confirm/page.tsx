import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordConfirmForm } from "@/components/auth/ResetPasswordConfirmForm";

export const metadata: Metadata = {
  title: "Deklaro | Set new password",
};

export default function ResetPasswordConfirmPage() {
  return (
    <AuthShell
      heading="Set a new password"
      subheading="Choose a strong password to continue protecting your tenants’ financial data."
    >
      <ResetPasswordConfirmForm />
    </AuthShell>
  );
}
