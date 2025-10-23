import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Deklaro | Create account",
};

export default function SignupPage() {
  return (
    <AuthShell
      heading="Create your Deklaro account"
      subheading="Bring your accounting team onto the AI-first invoice automation platform."
    >
      <SignupForm />
    </AuthShell>
  );
}
