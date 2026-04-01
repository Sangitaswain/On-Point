import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
      <SignUp fallbackRedirectUrl="/onboarding" />
    </div>
  );
}
