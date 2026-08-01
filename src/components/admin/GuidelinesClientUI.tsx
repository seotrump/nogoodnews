'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { toggleModerationRule, updateModerationRule, createModerationRule } from '@/app/[locale]/admin/guidelines-actions'

export default function GuidelinesClientUI({ initialRules }: { initialRules: any[] }) {
  const [rules, setRules] = useState(initialRules)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  const handleToggle = async (ruleId: string, currentActive: boolean) => {
    try {
      await toggleModerationRule(ruleId, !currentActive)
      setRules(rules.map(r => r.id === ruleId ? { ...r, is_active: !currentActive } : r))
      toast.success('규칙 활성화 상태가 변경되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '업데이트 실패')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <span className="text-sm font-bold text-gray-700">등록된 가이드라인 규칙</span>
          <span className="ml-2 text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{rules.length}개</span>
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="bg-black text-white hover:bg-gray-800 text-xs font-bold px-4 py-2 rounded-lg transition"
        >
          + 새 규칙 추가
        </button>
      </div>

      {isAddingNew && (
        <form 
          action={async (formData) => {
            try {
              await createModerationRule(formData)
              toast.success('새 가이드라인 규칙이 추가되었습니다.')
              setIsAddingNew(false)
            } catch (e: any) {
              toast.error(e.message || '규칙 추가 실패')
            }
          }}
          className="bg-blue-50 border border-blue-200 p-5 rounded-xl flex flex-col gap-4"
        >
          <h3 className="text-sm font-bold text-blue-900">✨ 새로운 안전 가이드라인 규칙 등록</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">고유 식별 키 (rule_key)</label>
              <input name="ruleKey" type="text" placeholder="예: no_hate_speech" required className="w-full text-xs p-2.5 rounded border border-gray-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">규칙 명칭 (rule_label)</label>
              <input name="ruleLabel" type="text" placeholder="예: 혐오 표현 금지" required className="w-full text-xs p-2.5 rounded border border-gray-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">위반 처리 (severity)</label>
              <select name="severity" className="w-full text-xs p-2.5 rounded border border-gray-300 bg-white font-bold">
                <option value="block">BLOCK (위반 시 자동 비공개 / rejected)</option>
                <option value="warn">WARN (경고만 기록하고 통과)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">검증 AI 판단 기준 프롬프트 (rule_prompt)</label>
            <textarea name="rulePrompt" rows={3} placeholder="이 글이 인종, 성별, 지역, 정체성 등에 대한 혐오 표현이나 모욕을 포함하는가?" required className="w-full text-xs p-2.5 rounded border border-gray-300 bg-white resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAddingNew(false)} className="px-3 py-1.5 text-xs text-gray-600 bg-gray-200 rounded font-bold">취소</button>
            <button type="submit" className="px-4 py-1.5 text-xs text-white bg-blue-600 rounded font-bold hover:bg-blue-700">규칙 등록</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {rules.map((rule) => {
          const isEditing = editingId === rule.id
          return (
            <div key={rule.id} className={`p-5 rounded-xl border transition ${rule.is_active ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
              {!isEditing ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${rule.severity === 'block' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'}`}>
                        {rule.severity === 'block' ? 'BLOCK (비공개)' : 'WARN (경고)'}
                      </span>
                      <span className="font-bold text-gray-900 text-sm">{rule.rule_label}</span>
                      <span className="text-xs font-mono text-gray-400">({rule.rule_key})</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded border border-gray-100 font-mono">
                      "{rule.rule_prompt}"
                    </p>
                    {rule.updated_by && (
                      <p className="text-[10px] text-gray-400 mt-2">
                        최종 수정: {new Date(rule.updated_at).toLocaleString()} by {rule.updated_by}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleToggle(rule.id, rule.is_active)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${rule.is_active ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'}`}
                    >
                      {rule.is_active ? '● 활성화' : '○ 비활성화'}
                    </button>
                    <button
                      onClick={() => setEditingId(rule.id)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    >
                      수정
                    </button>
                  </div>
                </div>
              ) : (
                <form 
                  action={async (formData) => {
                    try {
                      await updateModerationRule(formData)
                      toast.success('규칙이 성공적으로 수정되었습니다.')
                      setEditingId(null)
                    } catch (e: any) {
                      toast.error(e.message || '수정 실패')
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">규칙 수정: {rule.rule_key}</span>
                    <select name="severity" defaultValue={rule.severity} className="text-xs p-1.5 rounded border border-gray-300 font-bold">
                      <option value="block">BLOCK (위반 시 자동 비공개)</option>
                      <option value="warn">WARN (경고만 기록)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">규칙 명칭</label>
                    <input name="ruleLabel" defaultValue={rule.rule_label} required className="w-full text-xs p-2 rounded border border-gray-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">판단 기준 프롬프트</label>
                    <textarea name="rulePrompt" defaultValue={rule.rule_prompt} rows={3} required className="w-full text-xs p-2 rounded border border-gray-300 resize-none" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-gray-600 bg-gray-200 rounded">취소</button>
                    <button type="submit" className="px-4 py-1 text-xs text-white bg-black rounded font-bold">저장</button>
                  </div>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
