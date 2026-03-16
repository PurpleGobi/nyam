import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { BottomNav } from "@/presentation/components/layout/bottom-nav"
import { AuthProvider } from "@/presentation/providers/auth-provider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "냠 - 맛의 Second Brain",
  description:
    "당신의 미식 경험을 기록하고, 취향을 발견하고, 함께 나누는 맛의 Second Brain",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={inter.variable}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <AuthProvider>
          <main className="pb-20">{children}</main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  )
}
