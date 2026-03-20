import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/auth/login" className="text-neutral-500 hover:text-neutral-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-neutral-800">개인정보처리방침</h1>
      </div>
      <div className="prose prose-sm text-neutral-600">
        <p>nyam 개인정보처리방침입니다.</p>
        <p>수집하는 개인정보: 이메일, 프로필 사진, 소셜 로그인 정보</p>
      </div>
    </div>
  )
}
