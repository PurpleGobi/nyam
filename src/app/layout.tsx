import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nyam - AI 검증 맛집 추천",
  description: "웹검색으로 검증된 맛집을 추천받아보세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background">
          <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <h1 className="text-xl font-bold text-orange-500">Nyam</h1>
            <span className="ml-2 text-sm text-muted-foreground">
              AI 검증 맛집 추천
            </span>
          </header>
          <main className="flex-1 pb-16">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
