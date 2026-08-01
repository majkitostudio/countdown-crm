import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Countdown CRM — AI Powered Call Center Workspace",
  description: "Next-gen AI Copilot & CRM for High Velocity Tele-sales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased dark`}>
      <body className="h-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
