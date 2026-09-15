import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import type { OperatorIdentity } from "@/lib/operatorIdentity";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Countdown CRM — Call Center Workspace",
  description: "Workspace-scoped CRM and operator console for a high-velocity sales pilot",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialIdentity: OperatorIdentity | null = null;
  try {
    const [user, workspaceContext] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceContext(),
    ]);
    const metadataName = "user_metadata" in user && typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "Operator";
    initialIdentity = {
      id: workspaceContext.userId,
      name: metadataName,
      email: user.email || "",
      role: workspaceContext.role,
      avatarUrl: null,
    };
  } catch {
    // The login page and unauthenticated states render without a shell identity.
  }

  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased dark`}>
      <body className="h-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
        <AppShell initialIdentity={initialIdentity}>{children}</AppShell>
      </body>
    </html>
  );
}
