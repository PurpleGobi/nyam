import type { Metadata, Viewport } from "next"
import { Comfortaa, Inter } from "next/font/google"
import { Toaster } from "sonner"
import { SWRProvider } from "@/presentation/providers/swr-provider"
import { AuthProvider } from "@/presentation/providers/auth-provider"
import { ThemeProvider } from "@/presentation/providers/theme-provider"
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
    <html lang="ko" className={`${inter.variable} ${comfortaa.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('nyam-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()` }} />
      </head>
      <body>
        <ThemeProvider>
          <SWRProvider>
            <AuthProvider>
              {children}
              <Toaster position="top-center" richColors />
            </AuthProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
