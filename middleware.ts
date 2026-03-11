import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    // Protect all routes except login, terms, privacy, api/auth, and static files
    "/((?!login|terms|privacy|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
