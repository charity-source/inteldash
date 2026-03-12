import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import allowlistData from "@/data/allowlist.json";

// Shared authOptions — reads env vars at call time, not module load time
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email?.toLowerCase();

        // Check 1: Domain restriction
        const allowedDomain = process.env.ALLOWED_DOMAIN;
        if (allowedDomain) {
          if (!email || !email.endsWith(`@${allowedDomain}`)) {
            return "/login?error=AccessDenied";
          }
        }

        // Check 2: Allowlist — email must be in the list with Active status
        const allowedUser = allowlistData.users.find(
          (u) => u.email.toLowerCase() === email && u.status === "Active"
        );
        if (!allowedUser) {
          return "/login?error=NotAuthorised";
        }

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
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
