import { AuthGuard } from '@/presentation/guards/auth-guard'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-dvh flex-col bg-background">
        <main className="w-full flex-1">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}
