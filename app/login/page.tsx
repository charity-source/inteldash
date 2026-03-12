"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import LoginBrandingPanel from "@/components/login/LoginBrandingPanel";
import LoginCard from "@/components/login/LoginCard";

function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const errorParam = searchParams.get("error");
  const hasError = errorParam === "AccessDenied";
  const hasConfigError = errorParam === "Configuration";
  const hasNotAuthorised = errorParam === "NotAuthorised";

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  // Reset loading state when returning with any error
  useEffect(() => {
    if (errorParam) {
      setIsLoading(false);
    }
  }, [errorParam]);

  function handleSignIn() {
    setIsLoading(true);
    signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left panel (desktop) / Header (mobile) */}
      <div className="md:w-1/2">
        <LoginBrandingPanel />
      </div>

      {/* Right panel — login card */}
      <div className="flex-1 bg-white">
        <LoginCard
          isLoading={isLoading}
          hasError={hasError}
          hasConfigError={hasConfigError}
          hasNotAuthorised={hasNotAuthorised}
          onSignIn={handleSignIn}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
