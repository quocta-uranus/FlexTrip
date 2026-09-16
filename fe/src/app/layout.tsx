import type { Metadata } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { AuthBootstrap } from "@/components/auth-bootstrap";
import { UserMenu } from "@/components/user-menu";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const headingFont = Manrope({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FlexTrip",
  description: "Nền tảng du lịch linh hoạt",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body
        className="has-travel-bg min-h-full flex flex-col"
        style={{
          backgroundImage: "url('/travel-bg.svg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#7dd3fc",
        }}
      >
        {/* Wrapper giữ layout flex, không che background */}
        <div className="relative min-h-full flex flex-col">
          <Providers>
            <AuthBootstrap />
            {/* Floating header — chỉ chứa nút user, không che nội dung */}
            <header className="pointer-events-none absolute right-0 top-0 z-40 flex w-full justify-end gap-3 px-6 py-4">
              <div className="pointer-events-auto">
                <UserMenu />
              </div>
            </header>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}
