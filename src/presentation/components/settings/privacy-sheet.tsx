'use client'

import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'

interface PrivacySheetProps {
  isOpen: boolean
  onClose: () => void
}

export function PrivacySheet({ isOpen, onClose }: PrivacySheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="개인정보처리방침" maxHeight="85vh">
      <div className="space-y-4 text-sm" style={{ color: 'var(--text-sub)', lineHeight: '1.7' }}>
        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>1. 수집하는 개인정보 항목</h3>
          <p>서비스는 회원가입 및 서비스 이용을 위해 다음 정보를 수집합니다:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li><strong>필수 항목:</strong> 이메일 주소, 닉네임, 프로필 사진(소셜 로그인 제공 시)</li>
            <li><strong>자동 수집:</strong> 서비스 이용 기록, 접속 로그, 기기 정보</li>
            <li><strong>선택 항목:</strong> 위치 정보(맛집 검색 시), 사진(기록 등록 시)</li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>2. 개인정보의 수집·이용 목적</h3>
          <ul className="list-disc space-y-1 pl-4">
            <li>회원 식별 및 서비스 제공</li>
            <li>맛집·와인 기록 저장 및 관리</li>
            <li>버블(커뮤니티) 기능 제공</li>
            <li>AI 기반 추천 및 분석 기능 제공</li>
            <li>서비스 개선 및 신규 기능 개발</li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>3. 개인정보의 보유 및 이용 기간</h3>
          <p>
            회원 탈퇴 시까지 보유하며, 탈퇴 시 지체 없이 파기합니다.
            단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>전자상거래 관련 기록: 5년</li>
            <li>접속 로그: 3개월</li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>4. 개인정보의 제3자 제공</h3>
          <p>
            서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
            단, 법령에 의한 요청이 있는 경우는 예외로 합니다.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>5. 개인정보의 파기</h3>
          <p>
            보유 기간이 경과하거나 처리 목적이 달성된 경우, 해당 개인정보를 지체 없이 파기합니다.
            전자적 파일은 복구 불가능한 방법으로 삭제하며, 종이 문서는 분쇄 또는 소각합니다.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>6. 이용자의 권리</h3>
          <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>개인정보 열람 요청</li>
            <li>개인정보 정정·삭제 요청</li>
            <li>개인정보 처리 정지 요청</li>
            <li>회원 탈퇴 (설정 &gt; 계정 관리)</li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>7. 개인정보의 안전성 확보 조치</h3>
          <ul className="list-disc space-y-1 pl-4">
            <li>개인정보의 암호화</li>
            <li>해킹 등에 대비한 기술적 대책</li>
            <li>개인정보 접근 권한 제한</li>
            <li>Row Level Security(RLS)를 통한 데이터 접근 제어</li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>8. 개인정보 보호책임자</h3>
          <p>
            개인정보 관련 문의는 아래로 연락해 주시기 바랍니다.
          </p>
          <p className="mt-1">
            이메일: jksung5000@gmail.com
          </p>
        </section>

        <p className="pt-2 text-xs" style={{ color: 'var(--text-hint)' }}>
          시행일: 2026년 4월 1일
        </p>
      </div>
    </BottomSheet>
  )
}
