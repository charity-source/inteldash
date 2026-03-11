import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "./AuthProvider";
import { RefreshProvider } from "./RefreshContext";
import AppShell from "./AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Intel Dash",
  description: "Macro Dashboard UI - Intelligence Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <AuthProvider>
          <RefreshProvider>
            <AppShell>{children}</AppShell>
          </RefreshProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
