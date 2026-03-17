"use client"

import { AlertTriangle } from "lucide-react"

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-neutral-800">문제가 발생했어요</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {error.message || "잠시 후 다시 시도해주세요"}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
      >
        다시 시도
      </button>
    </div>
  )
}
