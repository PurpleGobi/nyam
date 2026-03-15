import type { Metadata } from "next";
import { Geist, Geist_Mono, Comfortaa } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { BottomNavWrapper } from "@/presentation/components/layout/bottom-nav-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const comfortaa = Comfortaa({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "nyam - AI 검증 맛집 추천",
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
        className={`${geistSans.variable} ${geistMono.variable} ${comfortaa.variable} antialiased`}
      >
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background">
          <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background/95 px-5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Link href="/">
              <h1
                className="text-2xl tracking-tight text-orange-500"
                style={{ fontFamily: "var(--font-logo)" }}
              >
                nyam
              </h1>
            </Link>
            <span className="ml-2 text-sm text-muted-foreground">
              AI 검증 맛집 추천
            </span>
          </header>
          <main className="flex-1 pt-4 pb-16">{children}</main>
          <BottomNavWrapper />
        </div>
      </body>
    </html>
  );
}
