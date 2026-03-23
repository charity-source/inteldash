import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserByEmail } from "@/lib/notion-allowlist";
import { isValidRole, type DashboardRole } from "@/config/viewConfig";

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

        // Check 2: Allowlist — email must be Active in Notion database
        if (!email) return "/login?error=NotAuthorised";
        const allowedUser = await getUserByEmail(email);
        if (!allowedUser) {
          return "/login?error=NotAuthorised";
        }

        // Check 3: Must have a valid role
        if (!isValidRole(allowedUser.role)) {
          return "/login?error=NotAuthorised";
        }

        return true;
      }
      return true;
    },

    async jwt({ token, profile }) {
      // On initial sign-in, attach role from Notion allowlist
      if (profile?.email) {
        const email = profile.email.toLowerCase();
        const allowedUser = await getUserByEmail(email);
        if (allowedUser && isValidRole(allowedUser.role)) {
          token.role = allowedUser.role as DashboardRole;
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Expose role on the session object
      if (token.role) {
        session.user.role = token.role as DashboardRole;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
