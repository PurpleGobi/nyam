import type { Metadata, Viewport } from "next"
import { Comfortaa, Inter } from "next/font/google"
import { SWRProvider } from "@/presentation/providers/swr-provider"
import { AuthProvider } from "@/presentation/providers/auth-provider"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-logo",
  weight: "700",
  display: "swap",
})

export const metadata: Metadata = {
  title: "nyam",
  description: "AI-powered food diary",
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FFFFFF",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${comfortaa.variable}`}>
      <body>
        <SWRProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SWRProvider>
      </body>
    </html>
  )
}
