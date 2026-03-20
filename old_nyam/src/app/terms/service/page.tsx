import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/auth/login" className="text-neutral-500 hover:text-neutral-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-neutral-800">이용약관</h1>
      </div>
      <div className="prose prose-sm text-neutral-600">
        <p>nyam 서비스 이용약관입니다.</p>
        <p>본 서비스는 개인의 음식 경험을 기록하고 분석하는 서비스입니다.</p>
      </div>
    </div>
  )
}
