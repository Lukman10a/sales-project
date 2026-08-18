import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "../index.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ClientProviders from "./providers";
import LayoutWrapper from "./layout-wrapper";
import LoadingBar from "@/components/LoadingBar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "PrimeStock - Inventory Management Dashboard",
  description: "Modern sales management system",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>
        <ClientProviders>
          <TooltipProvider>
            <LoadingBar />
            <Toaster />
            <Sonner />
            <LayoutWrapper>{children}</LayoutWrapper>
          </TooltipProvider>
        </ClientProviders>
      </body>
    </html>
  );
}


