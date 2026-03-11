import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Validate required env vars at startup so we get clear errors
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const allowedDomain = process.env.ALLOWED_DOMAIN;

if (!googleClientId || !googleClientSecret) {
  console.error(
    "[NextAuth] ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set. " +
      "Current values — GOOGLE_CLIENT_ID:",
    googleClientId ? "(set)" : "(missing)",
    "GOOGLE_CLIENT_SECRET:",
    googleClientSecret ? "(set)" : "(missing)"
  );
}

if (!nextAuthSecret) {
  console.error("[NextAuth] ERROR: NEXTAUTH_SECRET must be set.");
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email;
        // If ALLOWED_DOMAIN is set, restrict to that domain
        if (allowedDomain) {
          return email ? email.endsWith(`@${allowedDomain}`) : false;
        }
        // If no domain restriction, allow all Google sign-ins
        return true;
      }
      return true;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login", // Redirect auth errors to login page instead of default error page
  },
  secret: nextAuthSecret,
  debug: process.env.NODE_ENV === "development",
};
