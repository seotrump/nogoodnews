'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { toggleModerationRule, updateModerationRule, createModerationRule } from '@/app/[locale]/admin/guidelines-actions'

export default function GuidelinesClientUI({ initialRules }: { initialRules: any[] }) {
  const router = useRouter()
  const [rules, setRules] = useState(initialRules)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  const handleToggle = async (ruleId: string, currentActive: boolean) => {
    try {
      await toggleModerationRule(ruleId, !currentActive)
      setRules(rules.map(r => r.id === ruleId ? { ...r, is_active: !currentActive } : r))
      toast.success('규칙 활성화 상태가 변경되었습니다.')
      router.refresh()
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
              const ruleKey = formData.get('ruleKey') as string
              const ruleLabel = formData.get('ruleLabel') as string
              const rulePrompt = formData.get('rulePrompt') as string
              const severity = (formData.get('severity') as string) || 'block'

              await createModerationRule(formData)
              
              const newRuleObj = {
                id: 'rule-' + Date.now(),
                rule_key: ruleKey.trim().toLowerCase().replace(/\s+/g, '_'),
                rule_label: ruleLabel,
                rule_prompt: rulePrompt,
                severity: severity,
                is_active: true,
                created_at: new Date().toISOString()
              }
              
              setRules(prev => [...prev, newRuleObj])
              toast.success('새 가이드라인 규칙이 성공적으로 저장되었습니다.')
              setIsAddingNew(false)
              router.refresh()
            } catch (e: any) {
              toast.error(e.message || '규칙 추가 실패')
            }
          }}
          className="bg-blue-50/80 border border-blue-200 p-5 rounded-2xl flex flex-col gap-4 shadow-sm"
        >

          <div className="flex justify-between items-center border-b border-blue-200 pb-2">
            <h3 className="text-sm font-bold text-blue-950">✨ 간편 가이드라인 규칙 등록</h3>
            <button type="button" onClick={() => setIsAddingNew(false)} className="text-xs text-gray-500 hover:text-black">닫기 ✕</button>
          </div>

          {/* 원클릭 추천 프리셋 */}
          <div>
            <span className="block text-[11px] font-bold text-blue-900 mb-1.5">⚡ 자주 쓰이는 표준 규칙 원클릭 선택:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const elKey = document.querySelector<HTMLInputElement>('input[name="ruleKey"]')
                  const elLabel = document.querySelector<HTMLInputElement>('input[name="ruleLabel"]')
                  const elPrompt = document.querySelector<HTMLTextAreaElement>('textarea[name="rulePrompt"]')
                  if (elKey) elKey.value = 'no_personal_attack'
                  if (elLabel) elLabel.value = '인신공격 금지'
                  if (elPrompt) elPrompt.value = '특정 이용자를 향한 인신공격, 조롱, 모욕성 비하 발언을 금지합니다.'
                }}
                className="bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs px-2.5 py-1 rounded-lg font-bold"
              >
                + 인신공격 금지
              </button>
              <button
                type="button"
                onClick={() => {
                  const elKey = document.querySelector<HTMLInputElement>('input[name="ruleKey"]')
                  const elLabel = document.querySelector<HTMLInputElement>('input[name="ruleLabel"]')
                  const elPrompt = document.querySelector<HTMLTextAreaElement>('textarea[name="rulePrompt"]')
                  if (elKey) elKey.value = 'no_political_verdict'
                  if (elLabel) elLabel.value = '정치적 단정 금지'
                  if (elPrompt) elPrompt.value = '실존 정치인 및 정당에 대해 무조건적인 가치 판단이나 악의적 단정을 내리지 않습니다.'
                }}
                className="bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs px-2.5 py-1 rounded-lg font-bold"
              >
                + 정치 단정 금지
              </button>
              <button
                type="button"
                onClick={() => {
                  const elKey = document.querySelector<HTMLInputElement>('input[name="ruleKey"]')
                  const elLabel = document.querySelector<HTMLInputElement>('input[name="ruleLabel"]')
                  const elPrompt = document.querySelector<HTMLTextAreaElement>('textarea[name="rulePrompt"]')
                  if (elKey) elKey.value = 'no_spam_ads'
                  if (elLabel) elLabel.value = '도배 및 상업적 광고 금지'
                  if (elPrompt) elPrompt.value = '동일 문장 반복 도배, 외부 상업 사이트 홍보 링크 노출을 금지합니다.'
                }}
                className="bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs px-2.5 py-1 rounded-lg font-bold"
              >
                + 도배/광고 금지
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">규칙 명칭 (한국어)</label>
              <input 
                name="ruleLabel" 
                type="text" 
                placeholder="예: 혐오 표현 금지" 
                required 
                onChange={(e) => {
                  const val = e.target.value
                  const elKey = document.querySelector<HTMLInputElement>('input[name="ruleKey"]')
                  if (elKey && !elKey.value) {
                    elKey.value = 'rule_' + Date.now().toString().slice(-6)
                  }
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-black outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">위반 시 처리 방식</label>
              <select name="severity" className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white font-bold">
                <option value="block">🚫 즉시 차단 (Block)</option>
                <option value="warn">⚠️ 주의 경고 (Warn)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">내부 관리 키 (자동 생성)</label>
              <input name="ruleKey" type="text" placeholder="자동 부여됨" required className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-100 font-mono text-gray-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">규칙 설명 지침 (한국어로 작성하면 AI가 자동 적용)</label>
            <textarea 
              name="rulePrompt" 
              rows={3} 
              placeholder="예: 타인을 향한 모욕이나 혐오 표현이 포함된 댓글은 차단 조치합니다." 
              required 
              className="w-full text-xs p-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-black outline-none leading-relaxed" 
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setIsAddingNew(false)} className="px-4 py-2 text-xs font-bold bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition">
              취소
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm">
              등록 완료
            </button>
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
                      const ruleLabel = formData.get('ruleLabel') as string
                      const rulePrompt = formData.get('rulePrompt') as string
                      const severity = formData.get('severity') as string

                      await updateModerationRule(formData)

                      setRules(rules.map(r => r.id === rule.id ? { ...r, rule_label: ruleLabel, rule_prompt: rulePrompt, severity: severity } : r))
                      toast.success('규칙이 성공적으로 수정되었습니다.')
                      setEditingId(null)
                      router.refresh()
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
