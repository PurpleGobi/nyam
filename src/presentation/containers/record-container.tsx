"use client"

import { Camera, ImagePlus, PenLine } from "lucide-react"

export function RecordContainer() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* Header */}
      <h1 className="text-xl font-bold text-[var(--color-neutral-800)]">
        새 기록
      </h1>

      {/* Camera / Gallery Area */}
      <button className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-20 transition-colors hover:border-[#FF6038] hover:bg-[#FFF4F0]">
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6038]">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-[var(--color-neutral-600)]">
              촬영
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-neutral-200)]">
              <ImagePlus className="h-6 w-6 text-[var(--color-neutral-600)]" />
            </div>
            <span className="text-xs text-[var(--color-neutral-600)]">
              갤러리
            </span>
          </div>
        </div>
        <p className="mt-2 text-center text-sm text-[var(--color-neutral-500)]">
          사진을 촬영하면 AI가 자동으로 인식합니다
        </p>
      </button>

      {/* Manual Input Option */}
      <button className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3.5 text-sm text-[var(--color-neutral-600)] transition-colors hover:border-[#FF6038] hover:text-[#FF6038]">
        <PenLine className="h-4 w-4" />
        <span>직접 입력하기</span>
      </button>
    </div>
  )
}
