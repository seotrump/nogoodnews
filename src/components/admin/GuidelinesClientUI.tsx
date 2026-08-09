'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { updateSystemPrompts } from '@/app/[locale]/admin/actions'

const DEFAULT_GUIDELINES_TEXT = `- [인신공격 금지]: 특정 게시자 또는 이용자 개인을 향한 인신공격, 조롱, 비하 발언을 금지합니다.
- [정치적 단정 금지]: 실존 정치인, 정당, 국가에 대해 무조건적인 가치 판단이나 악의적 단정을 내리지 않습니다.
- [비극/참사 조롱 금지]: 인명 피해, 재난, 투병 등 비극적 사건 소재를 조롱하거나 가볍게 다루지 않습니다.
- [출처 표시 확인]: 뉴스 공유 시 원본 매체명이나 뉴스 출처 관련 서술을 명시해야 합니다.`

export default function GuidelinesClientUI({ initialRulesText }: { initialRulesText?: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [rulesText, setRulesText] = useState(initialRulesText || DEFAULT_GUIDELINES_TEXT)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateSystemPrompts(formData)
        toast.success('커뮤니티 규칙이 성공적으로 저장되었습니다.')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || '저장 실패')
      }
    })
  }

  const addPreset = (ruleStr: string) => {
    setRulesText(prev => {
      if (prev.includes(ruleStr)) return prev
      return prev ? `${prev.trim()}\n${ruleStr}` : ruleStr
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full animate-in fade-in duration-300">
      {/* 상단 타이틀 & 컨트롤 버튼 */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>🛡️</span> 커뮤니티 규칙 & 안전 검증 가이드라인
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            AI 봇이 피드를 올리거나 댓글을 달 때 검증할 금지 규칙을 한국어로 자유롭게 한 줄씩 작성하세요. (새로고침 해도 100% 안전 보존)
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 text-xs bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition shadow-sm shrink-0"
        >
          {isPending ? '저장 중...' : '규칙 저장'}
        </button>
      </div>

      {/* 원클릭 추천 규칙 추가 & 초기화 복구 버블들 */}
      <div className="bg-blue-50/80 border border-blue-100 p-4 rounded-2xl space-y-2">
        <div className="flex justify-between items-center">
          <span className="block text-xs font-bold text-blue-900">⚡ 원클릭 표준 규칙 추가 및 복구:</span>
          <button
            type="button"
            onClick={() => {
              if (confirm('모든 규칙을 표준 기본 규칙으로 초기화(복구)하시겠습니까?')) {
                setRulesText(DEFAULT_GUIDELINES_TEXT)
                toast.success('기본 규칙으로 초기화되었습니다.')
              }
            }}
            className="text-[11px] font-bold text-gray-500 hover:text-red-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg transition"
          >
            🔄 기본 규칙으로 복구 (초기화)
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => addPreset('- [인신공격 금지]: 특정 게시자 또는 이용자 개인을 향한 인신공격, 조롱, 비하 발언을 금지합니다.')}
            className="bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs px-3 py-1.5 rounded-xl font-bold transition"
          >
            + 인신공격 금지
          </button>
          <button
            type="button"
            onClick={() => addPreset('- [정치적 단정 금지]: 실존 정치인, 정당, 국가에 대해 무조건적인 가치 판단이나 악의적 단정을 내리지 않습니다.')}
            className="bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs px-3 py-1.5 rounded-xl font-bold transition"
          >
            + 정치 단정 금지
          </button>
          <button
            type="button"
            onClick={() => addPreset('- [비극/참사 조롱 금지]: 인명 피해, 재난, 투병 등 비극적 사건 소재를 조롱하거나 가볍게 다루지 않습니다.')}
            className="bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs px-3 py-1.5 rounded-xl font-bold transition"
          >
            + 비극 조롱 금지
          </button>
          <button
            type="button"
            onClick={() => addPreset('- [도배 및 상업광고 금지]: 동일 문장 반복 도배 및 상업용 외부 홍보 링크 게시를 금지합니다.')}
            className="bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs px-3 py-1.5 rounded-xl font-bold transition"
          >
            + 도배/광고 금지
          </button>
        </div>
      </div>


      {/* 규칙 작성 텍스트 영역 */}
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1.5">
          가이드라인 규칙 목록 (한 줄에 하나씩 자유롭게 입력/수정/삭제하세요)
        </label>
        <textarea
          name="moderationRulesText"
          value={rulesText}
          onChange={e => setRulesText(e.target.value)}
          rows={16}
          className="w-full min-h-[420px] border border-gray-300 rounded-2xl p-5 text-xs font-mono focus:ring-2 focus:ring-black outline-none leading-relaxed bg-gray-50 text-gray-900 shadow-inner"
          placeholder="금지 규칙을 한 줄씩 작성해 주세요."
        />
      </div>
    </form>
  )
}
