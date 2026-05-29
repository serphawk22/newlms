import type { Metadata } from "next";
import "./globals.css";
import { LoadingBar } from "@/components/ui/loading-bar";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "SERP LMS",
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
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <LoadingBar />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
