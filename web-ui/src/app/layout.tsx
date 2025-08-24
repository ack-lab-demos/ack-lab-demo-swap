import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "USDC to ETH Swap Demo | ACK Lab",
  description: "Educational demo showcasing agent-to-agent communication for cryptocurrency swaps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
