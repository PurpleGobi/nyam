export default function ServiceTermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">서비스 이용약관</h1>

      <div className="prose prose-sm text-[var(--color-neutral-700)]">
        <h2>제1조 (목적)</h2>
        <p>
          이 약관은 nyam(이하 &quot;서비스&quot;)이 제공하는 맛집 기록 및 추천 서비스의
          이용 조건 및 절차, 서비스와 이용자의 권리·의무 및 책임사항 등을 규정함을
          목적으로 합니다.
        </p>

        <h2>제2조 (정의)</h2>
        <p>
          &quot;이용자&quot;란 서비스에 접속하여 이 약관에 따라 서비스가 제공하는 서비스를
          이용하는 회원 및 비회원을 말합니다.
        </p>

        <h2>제3조 (약관의 효력 및 변경)</h2>
        <p>
          본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써
          효력이 발생합니다. 서비스는 필요한 경우 관련 법령을 위배하지 않는 범위에서
          이 약관을 변경할 수 있습니다.
        </p>

        <h2>제4조 (서비스의 제공)</h2>
        <p>서비스는 다음과 같은 기능을 제공합니다:</p>
        <ul>
          <li>맛집 방문 기록 및 평가</li>
          <li>AI 기반 음식 인식 및 리뷰 생성</li>
          <li>맛집 추천 및 비교</li>
          <li>소셜 기능 (버블, 공유)</li>
        </ul>

        <h2>제5조 (개인정보 보호)</h2>
        <p>
          서비스는 이용자의 개인정보를 개인정보 처리방침에 따라 수집·이용·관리합니다.
        </p>

        <p className="mt-8 text-xs text-neutral-400">시행일: 2026년 3월 17일</p>
      </div>
    </div>
  )
}
