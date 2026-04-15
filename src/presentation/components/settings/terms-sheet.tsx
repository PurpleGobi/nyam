'use client'

import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'

interface TermsSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function TermsSheet({ isOpen, onClose }: TermsSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="이용약관" maxHeight="85vh">
      <div className="space-y-4 text-sm" style={{ color: 'var(--text-sub)', lineHeight: '1.7' }}>
        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>제1조 (목적)</h3>
          <p>
            이 약관은 Nyam(이하 &quot;서비스&quot;)이 제공하는 맛집·와인 기록 및 소셜 서비스의 이용 조건과 절차,
            이용자와 서비스 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>제2조 (정의)</h3>
          <ol className="list-decimal space-y-1 pl-4">
            <li>&quot;서비스&quot;란 Nyam이 제공하는 웹·모바일 애플리케이션 및 관련 서비스를 말합니다.</li>
            <li>&quot;이용자&quot;란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 회원을 말합니다.</li>
            <li>&quot;콘텐츠&quot;란 이용자가 서비스 내에 게시한 기록, 사진, 평가, 댓글 등을 말합니다.</li>
          </ol>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>제3조 (약관의 효력)</h3>
          <p>
            본 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.
            서비스 가입 시 본 약관에 동의한 것으로 간주합니다.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>제4조 (서비스의 제공)</h3>
          <p>서비스는 다음의 기능을 제공합니다:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>맛집 및 와인 기록·평가 기능</li>
            <li>버블(커뮤니티) 기반 소셜 기능</li>
            <li>AI 기반 사진 분석 및 추천 기능</li>
            <li>기타 서비스가 정하는 기능</li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>제5조 (이용자의 의무)</h3>
          <ol className="list-decimal space-y-1 pl-4">
            <li>타인의 개인정보를 무단으로 수집하거나 도용해서는 안 됩니다.</li>
            <li>서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.</li>
            <li>허위 정보를 등록하거나 타인을 사칭해서는 안 됩니다.</li>
            <li>관련 법령, 이 약관, 서비스 이용 안내 등을 준수해야 합니다.</li>
          </ol>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>제6조 (콘텐츠의 권리)</h3>
          <p>
            이용자가 서비스에 게시한 콘텐츠의 저작권은 해당 이용자에게 귀속됩니다.
            단, 서비스는 서비스 운영·개선·홍보 목적으로 이용자의 콘텐츠를 사용할 수 있습니다.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>제7조 (서비스 중단)</h3>
          <p>
            서비스는 천재지변, 시스템 장애 등 불가피한 사유가 발생한 경우 서비스 제공을 일시적으로 중단할 수 있으며,
            이 경우 사전 또는 사후에 이용자에게 공지합니다.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>제8조 (면책)</h3>
          <p>
            서비스는 이용자가 게시한 콘텐츠의 정확성·신뢰성에 대해 책임지지 않으며,
            이용자 간 또는 이용자와 제3자 간의 분쟁에 대해 개입하지 않습니다.
          </p>
        </section>

        <p className="pt-2 text-xs" style={{ color: 'var(--text-hint)' }}>
          시행일: 2026년 4월 1일
        </p>
      </div>
    </BottomSheet>
  )
}
