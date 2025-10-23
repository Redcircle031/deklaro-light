import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Deklaro | Reset password",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      heading="Reset your password"
      subheading="Enter the email associated with your account and we’ll send reset instructions."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
