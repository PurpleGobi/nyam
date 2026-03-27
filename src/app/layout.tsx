import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/presentation/providers/auth-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'nyam',
  description: '나만의 맛 기록',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
