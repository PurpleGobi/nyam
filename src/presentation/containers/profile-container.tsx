"use client"

import { User, Settings, ChevronRight } from "lucide-react"
import Link from "next/link"

export function ProfileContainer() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-neutral-100)]">
          <User className="h-8 w-8 text-[var(--color-neutral-400)]" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-[var(--color-neutral-800)]">
            게스트
          </h1>
          <span className="text-sm text-[#FF6038]">냠 Lv.1</span>
        </div>
      </div>

      {/* Taste DNA */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          취향 DNA
        </h2>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-10">
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            기록이 5개 이상이면 취향 DNA가 생성됩니다
          </p>
        </div>
      </section>

      {/* Experience Atlas */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          경험 Atlas
        </h2>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-10">
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            기록하면 자동으로 영역이 쌓입니다
          </p>
        </div>
      </section>

      {/* Record Timeline */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          기록 타임라인
        </h2>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-10">
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            아직 기록이 없습니다
          </p>
        </div>
      </section>

      {/* Settings Link */}
      <Link
        href="#"
        className="flex items-center justify-between rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3.5"
      >
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-[var(--color-neutral-500)]" />
          <span className="text-sm text-[var(--color-neutral-700)]">설정</span>
        </div>
        <ChevronRight className="h-4 w-4 text-[var(--color-neutral-400)]" />
      </Link>
    </div>
  )
}
