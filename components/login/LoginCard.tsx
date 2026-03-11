"use client";

import LoginInfoBanner from "./LoginInfoBanner";
import LoginErrorBanner from "./LoginErrorBanner";
import GoogleSignInButton from "./GoogleSignInButton";

interface LoginCardProps {
  isLoading: boolean;
  hasError: boolean;
  hasConfigError?: boolean;
  onSignIn: () => void;
}

export default function LoginCard({
  isLoading,
  hasError,
  hasConfigError,
  onSignIn,
}: LoginCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-6 py-10 md:min-h-screen md:px-12">
      <div className="w-full max-w-md">
        {/* Heading */}
        <h2 className="text-center text-3xl font-bold text-[#111827]">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-base text-[#6B7280]">
          Sign in to access your dashboard
        </p>

        {/* Divider */}
        <div className="my-8 h-px bg-[#E5E7EB]" />

        {/* Info banner */}
        <LoginInfoBanner />

        {/* Sign in button */}
        <div className="mt-6">
          <GoogleSignInButton isLoading={isLoading} onClick={onSignIn} />
        </div>

        {/* Loading status text */}
        {isLoading && (
          <p className="mt-3 text-center text-sm italic text-[#6B7280]">
            Connecting to Google...
          </p>
        )}

        {/* Access denied error banner */}
        {hasError && !isLoading && (
          <div className="mt-4">
            <LoginErrorBanner />
          </div>
        )}

        {/* Configuration error banner */}
        {hasConfigError && !isLoading && (
          <div className="mt-4 rounded-lg border-2 border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-[#92400E]">
                <p className="font-semibold">Server configuration error</p>
                <p className="mt-1">Authentication is not properly configured. Please contact your administrator.</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer / ToS */}
        <p className="mt-8 text-center text-xs text-[#6B7280]">
          By signing in, you agree to our{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] underline"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
