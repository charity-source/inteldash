import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function middleware(req: NextRequest) {
  // Bypass auth in development
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }
  return (withAuth({
    pages: { signIn: "/login" },
    secret: process.env.NEXTAUTH_SECRET,
  }) as any)(req);
}

export default middleware;

export const config = {
  matcher: [
    // Protect all routes except login, terms, privacy, api/auth, and static files
    "/((?!login|terms|privacy|api/auth|api/simpro/test|_next/static|_next/image|favicon.ico).*)",
  ],
};
