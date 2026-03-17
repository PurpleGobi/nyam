"use client"

import Link from "next/link"
import { PartyPopper } from "lucide-react"
import { ROUTES } from "@/shared/constants/routes"

interface ReviewCompletionContainerProps {
  recordId: string
}

export function ReviewCompletionContainer({ recordId }: ReviewCompletionContainerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 pt-20 pb-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
        <PartyPopper className="h-10 w-10" />
      </div>

      <div>
        <h1 className="text-xl font-bold text-neutral-800">
          블로그 리뷰 완성!
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          AI와 함께 멋진 리뷰를 작성했어요
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href={ROUTES.recordDetail(recordId)}
          className="flex h-12 items-center justify-center rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] transition-all"
        >
          기록 보기
        </Link>
        <Link
          href={ROUTES.HOME}
          className="flex h-12 items-center justify-center rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-600 hover:bg-neutral-200 active:scale-[0.98] transition-all"
        >
          홈으로
        </Link>
      </div>
    </div>
  )
}
