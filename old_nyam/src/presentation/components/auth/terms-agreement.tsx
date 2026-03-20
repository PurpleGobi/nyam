"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import { ROUTES } from "@/shared/constants/routes"

interface TermsAgreementProps {
  onAllAgreed: (agreed: boolean) => void
}

export function TermsAgreement({ onAllAgreed }: TermsAgreementProps) {
  const [serviceAgreed, setServiceAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)

  const allAgreed = serviceAgreed && privacyAgreed

  const toggleAll = () => {
    const newValue = !allAgreed
    setServiceAgreed(newValue)
    setPrivacyAgreed(newValue)
    onAllAgreed(newValue)
  }

  const toggleService = () => {
    const newValue = !serviceAgreed
    setServiceAgreed(newValue)
    onAllAgreed(newValue && privacyAgreed)
  }

  const togglePrivacy = () => {
    const newValue = !privacyAgreed
    setPrivacyAgreed(newValue)
    onAllAgreed(serviceAgreed && newValue)
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={toggleAll}
        className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-card dark:bg-neutral-100 p-4"
      >
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
            allAgreed
              ? "border-primary-500 bg-primary-500 text-white"
              : "border-neutral-300",
          )}
        >
          {allAgreed && <Check className="h-3 w-3" />}
        </div>
        <span className="text-sm font-semibold text-neutral-800">전체 동의</span>
      </button>

      <div className="space-y-2 pl-2">
        <TermItem
          checked={serviceAgreed}
          onToggle={toggleService}
          label="이용약관 동의 (필수)"
          href={ROUTES.TERMS_SERVICE}
        />
        <TermItem
          checked={privacyAgreed}
          onToggle={togglePrivacy}
          label="개인정보처리방침 동의 (필수)"
          href={ROUTES.TERMS_PRIVACY}
        />
      </div>
    </div>
  )
}

function TermItem({
  checked,
  onToggle,
  label,
  href,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  href: string
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2"
      >
        <div
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded border transition-colors",
            checked
              ? "border-primary-500 bg-primary-500 text-white"
              : "border-neutral-300",
          )}
        >
          {checked && <Check className="h-2.5 w-2.5" />}
        </div>
        <span className="text-sm text-neutral-600">{label}</span>
      </button>
      <Link
        href={href}
        className="text-xs text-neutral-400 underline"
      >
        보기
      </Link>
    </div>
  )
}
