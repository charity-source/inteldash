import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
        const allowedDomain = process.env.ALLOWED_DOMAIN;
        const email = profile?.email;
        if (allowedDomain) {
          return email ? email.endsWith(`@${allowedDomain}`) : false;
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
