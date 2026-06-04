import type { Metadata } from "next";
import "./globals.css";
import { LoadingBar } from "@/components/ui/loading-bar";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Learning Management System",
  description: "Enterprise learning management system. Focus. Learn. Build.",
  keywords: ["LMS", "learning", "education", "courses", "online learning"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="font-sans h-full"
      data-theme="light"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider>
          <LoadingBar />
          <ToastProvider>{children}</ToastProvider>
          {/* Authenticated routes only (public pages return null) */}
          <div className="fixed top-5 right-5 z-[9999]">
            <ThemeToggle />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
