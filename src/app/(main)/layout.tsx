export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* 메인 콘텐츠 영역 — 헤더는 각 페이지 컨테이너에서 AppHeader 사용 */}
      <main className="mx-auto w-full max-w-[430px] flex-1 px-4 pb-6 pt-4">
        {children}
      </main>
    </div>
  )
}
