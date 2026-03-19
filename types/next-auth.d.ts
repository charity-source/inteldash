import type { DashboardRole } from "@/config/viewConfig";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: DashboardRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: DashboardRole;
  }
}
