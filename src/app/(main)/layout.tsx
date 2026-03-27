export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* 임시 헤더 — S5에서 앱 셸로 교체 */}
      <header className="sticky top-0 z-40 flex h-[52px] items-center justify-center border-b border-border bg-background/95 backdrop-blur-sm">
        <h1 className="logo-gradient text-[22px] font-bold leading-none tracking-[-0.5px]">
          nyam
        </h1>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="mx-auto w-full max-w-[430px] flex-1 px-4 pb-6 pt-4">
        {children}
      </main>
    </div>
  )
}
