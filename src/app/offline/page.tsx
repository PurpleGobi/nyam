"use client"

import { WifiOff, RefreshCw } from "lucide-react"

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">
          현재 오프라인 상태입니다
        </h1>
        <p className="text-sm text-muted-foreground">
          최근에 방문한 페이지는 오프라인에서도 볼 수 있습니다
        </p>
      </div>

      <button
        type="button"
        onClick={handleRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <RefreshCw className="h-4 w-4" />
        다시 시도
      </button>
    </div>
  )
}
