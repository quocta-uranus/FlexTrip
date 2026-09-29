import type { Metadata } from "next";
import { Inter, Manrope, Plus_Jakarta_Sans, DM_Sans, DM_Serif_Display } from "next/font/google";
import { Providers } from "./providers";
import { AuthBootstrap } from "@/components/auth-bootstrap";
import { Navbar } from "@/components/navbar";
import { AiChatLauncher } from "@/components/ai-chat-launcher";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

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

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
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
      className={`${inter.variable} ${bodyFont.variable} ${headingFont.variable} ${dmSans.variable} ${dmSerif.variable} h-full antialiased`}
    >
      <body
        className="has-travel-bg min-h-full flex flex-col bg-[#f1faff] text-slate-900"
      >
        {/* Wrapper giữ layout flex, không che background */}
        <div className="relative min-h-full flex flex-col">
          <Providers>
            <AuthBootstrap />
            <Navbar />
            {children}
            <AiChatLauncher />
          </Providers>
        </div>
      </body>
    </html>
  );
}
