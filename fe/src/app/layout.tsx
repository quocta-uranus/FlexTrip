import type { Metadata } from "next";
import { Hanken_Grotesk, Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { AuthBootstrap } from "@/components/auth-bootstrap";
import { SiteHeader } from "@/components/layout/site-header";
import { AiChatLauncher } from "@/components/ai-chat-launcher";
import { MarketplaceAccessBoundary } from "@/components/marketplace-access-boundary";
import { TravelerFooterGate } from "@/components/layout/traveler-footer";
import { ModeSync } from "@/components/layout/mode-sync";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const headingFont = Manrope({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
});

// Large editorial headings (Wayfare-style); Clash Grotesk has no Vietnamese glyphs, Hanken Grotesk is the closest one that does.
const displayFont = Hanken_Grotesk({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FlexTrip",
  description: "Nền tảng du lịch linh hoạt",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${headingFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body
        className="has-travel-bg min-h-full flex flex-col bg-[#f1faff] text-slate-900"
      >
        {/* Wrapper giữ layout flex, không che background */}
        <div className="relative min-h-full flex flex-col">
          <Providers>
            <AuthBootstrap />
            <ModeSync />
            <SiteHeader isRoot />
            <MarketplaceAccessBoundary>{children}</MarketplaceAccessBoundary>
            <TravelerFooterGate />
            <AiChatLauncher />
          </Providers>
        </div>
      </body>
    </html>
  );
}
