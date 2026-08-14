'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useActivePersona } from '@/context/ActivePersonaContext'

export default function SeoBlogGeneratorUI({ bots }: { bots: any[] }) {
  const { activeBot, isPiloting } = useActivePersona()
  const [selectedBotId, setSelectedBotId] = useState(bots.length > 0 ? bots[0].id : '')
  const [keyword, setKeyword] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [content, setContent] = useState('')

  useEffect(() => {
    if (isPiloting && activeBot?.id) {
      setSelectedBotId(activeBot.id)
    }
  }, [isPiloting, activeBot])

  // SEO Checker Logic
  const seoScores = useMemo(() => {
    const scores = {
      h1: false,
      introKeyword: false,
      keywordDensity: false,
      length: false,
      h2h3: false,
      scannable: false,
      internalLink: false,
      externalLink: false,
      media: false,
      humanTouch: true, // true if NO robotic phrases
    }

    if (!content) return scores

    const lowerContent = content.toLowerCase()
    const lowerKeyword = keyword.trim().toLowerCase()

    // 1. H1
    scores.h1 = lowerKeyword ? /^# .*/m.test(content) && /^# .*/m.exec(content)?.[0].toLowerCase().includes(lowerKeyword) || false : false

    // 2. Intro Keyword (first 300 chars approx)
    const intro = lowerContent.slice(0, 300)
    scores.introKeyword = lowerKeyword ? intro.includes(lowerKeyword) : false

    // 3. Keyword Density (rough check: 3 to 15 times)
    if (lowerKeyword) {
      const regex = new RegExp(lowerKeyword, 'g')
      const count = (lowerContent.match(regex) || []).length
      scores.keywordDensity = count >= 3 && count <= 15
    }

    // 4. Length
    scores.length = content.length >= 1000 // Simplified from 1500 for demo

    // 5. H2/H3
    const h2Count = (content.match(/^## /gm) || []).length
    scores.h2h3 = h2Count >= 3

    // 6. Scannable (Lists or Bold)
    scores.scannable = /(\n- |\n\* |\*\*.*\*\*)/.test(content)

    // 7. Internal Link (Hashtags)
    scores.internalLink = /#[\w가-힣-]+/.test(content)

    // 8. External Link (http not nogoodnews) OR skipped
    scores.externalLink = /\]\(https?:\/\/(?!nogoodnews\.com)[^)]+\)/.test(content) || true // Always pass as it's optional

    // 9. Media (Images) - Should NOT have fake images
    scores.media = !/!\[.*?\]\(.*?\)/.test(content)

    // 10. Human Touch (Anti-spam words)
    const roboticWords = ['결론적으로', '요약하자면', '오늘은 ~알아보았습니다']
    scores.humanTouch = !roboticWords.some(w => content.includes(w))

    return scores
  }, [content, keyword])

  const totalScore = Object.values(seoScores).filter(Boolean).length * 10

  const handleGenerate = async () => {
    if (!selectedBotId) return toast.error('봇을 선택하세요.')
    if (!keyword.trim()) return toast.error('키워드를 입력하세요.')

    setIsGenerating(true)
    setContent('')
    const toastId = toast.loading('100점짜리 SEO 블로그 양산 중...')

    try {
      const res = await fetch('/api/ai-handmade-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: selectedBotId, keyword })
      })

      if (!res.ok) throw new Error('API 호출 실패')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let done = false
      let fullText = ''

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value, { stream: true })
        fullText += chunkValue
        setContent(prev => prev + chunkValue)
      }
      
      toast.success('발행 완료!', { id: toastId })
    } catch (e: any) {
      toast.error('오류 발생: ' + e.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePublish = async () => {
    if (!content || !selectedBotId || !keyword) return toast.error('발행할 콘텐츠가 없습니다.');
    
    setIsPublishing(true)
    const toastId = toast.loading('블로그 포스트 발행 중...')
    
    try {
      const { publishSeoBlog } = await import('@/app/[locale]/admin/content/actions')
      await publishSeoBlog(selectedBotId, keyword, content)
      
      toast.success('발행 완료! 사이트에 포스트가 등록되었습니다.', { id: toastId })
      setContent('') // Optional: clear after publish
      // setKeyword('')
    } catch (e: any) {
      toast.error('발행 실패: ' + e.message, { id: toastId })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* 왼쪽: 에디터 및 설정 */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <h2 className="text-lg font-bold mb-4">블로그(SEO) 양산소</h2>
          <div className="flex flex-col gap-3">
            {!isPiloting && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">담당 봇 (페르소나)</label>
                <select 
                  value={selectedBotId} 
                  onChange={(e) => setSelectedBotId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {bots.map(b => (
                    <option key={b.id} value={b.id}>{b.display_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">SEO 타겟 키워드</label>
              <input 
                type="text" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 오사카 3박4일 코스"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition"
            >
              {isGenerating ? 'AI가 블로그 작성 중...' : '🚀 수제 블로그 자동 생성'}
            </button>
          </div>
        </div>

        {/* 에디터 (뷰어) */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 min-h-[500px]">
          <h3 className="text-sm font-bold text-gray-700 mb-2">마크다운 본문 (Preview)</h3>
          {content ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400 text-sm">
              우측 상단의 버튼을 눌러 블로그 생성을 시작하세요.
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: SEO 점수 신호등 */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 sticky top-20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 text-lg">SEO 스코어</h3>
            <div className={`text-2xl font-black ${totalScore >= 80 ? 'text-green-600' : totalScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {totalScore}점
            </div>
          </div>
          
          <div className="flex flex-col gap-2.5 text-sm">
            <ScoreItem label="H1 제목 키워드 포함" passed={seoScores.h1} />
            <ScoreItem label="도입부 키워드 배치" passed={seoScores.introKeyword} />
            <ScoreItem label="키워드 반복 밀도 (3~15회)" passed={seoScores.keywordDensity} />
            <ScoreItem label="글자 수 1000자 이상" passed={seoScores.length} />
            <ScoreItem label="소제목(H2) 3개 이상" passed={seoScores.h2h3} />
            <ScoreItem label="리스트/강조 등 가독성" passed={seoScores.scannable} />
            <ScoreItem label="해시태그(#) 활용 (내부링크 대체)" passed={seoScores.internalLink} />
            <ScoreItem label="외부 링크 (선택사항)" passed={seoScores.externalLink} />
            <ScoreItem label="엑박 이미지 없음 (텍스트 집중)" passed={seoScores.media} />
            <ScoreItem label="AI 기계적 멘트 배제" passed={seoScores.humanTouch} />
          </div>
          
          <button 
            onClick={handlePublish}
            disabled={!content || isPublishing}
            className="w-full mt-6 bg-black text-white font-bold py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {isPublishing ? '발행 중...' : '(수동) 발행하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScoreItem({ label, passed }: { label: string, passed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {passed ? '✓' : '×'}
      </div>
      <span className={passed ? 'text-gray-900' : 'text-gray-500'}>{label}</span>
    </div>
  )
}
