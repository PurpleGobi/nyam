import type { Metadata, Viewport } from "next"
import { Inter, Comfortaa } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/presentation/providers/auth-provider"
import { SWRProvider } from "@/presentation/providers/swr-provider"
import { AppShell } from "@/presentation/components/layout/app-shell"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const comfortaa = Comfortaa({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["700"],
})

export const metadata: Metadata = {
  title: "nyam - 맛의 Second Brain",
  description:
    "당신의 미식 경험을 기록하고, 취향을 발견하고, 함께 나누는 맛의 Second Brain",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "nyam",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FF6038",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${inter.variable} ${comfortaa.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <SWRProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </SWRProvider>
      </body>
    </html>
  )
}
