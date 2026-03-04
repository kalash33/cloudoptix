import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppShell } from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "CloudOptix | AI-Powered Multi-Cloud Cost Optimizer",
  description: "Analyze deployments, identify overprovisioned resources, and cut cloud bills by 30-60% without performance loss across AWS, GCP, and Azure.",
  keywords: ["cloud cost optimization", "FinOps", "AWS", "GCP", "Azure", "cost management", "cloud savings"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
