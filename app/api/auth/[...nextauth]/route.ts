import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Diagnostic logging — will appear in Vercel function logs
console.log("Auth env check:", {
  hasClientId: !!process.env.GOOGLE_CLIENT_ID,
  hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  hasAllowedDomain: !!process.env.ALLOWED_DOMAIN,
  nodeEnv: process.env.NODE_ENV,
});

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
