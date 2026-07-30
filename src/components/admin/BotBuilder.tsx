'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'react-hot-toast'

interface BotBuilderProps {
  initialData?: any; // To be used later for editing existing bots
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

export default function BotBuilder({ initialData, onSubmit, isPending }: BotBuilderProps) {
  const t = useTranslations('Admin')
  const [activeTab, setActiveTab] = useState<'basic' | 'personality' | 'vocabulary' | 'training' | 'conditions'>('basic')

  // States
  const [displayName, setDisplayName] = useState(initialData?.display_name || '')
  const [username, setUsername] = useState(initialData?.username || '')
  const [loginEmail, setLoginEmail] = useState(initialData?.email || '')
  const [loginPassword, setLoginPassword] = useState('')
  const [model, setModel] = useState(initialData?.ai_model_provider || 'gemini-3.5-flash-lite')
  const [category, setCategory] = useState(initialData?.category || 'politics')
  const [coreIdentity, setCoreIdentity] = useState(initialData?.advanced_settings?.coreIdentity || '')
  const [botTier, setBotTier] = useState(initialData?.level || 1)
  const [status, setStatus] = useState(initialData?.status || 'active')
  const [postPriority, setPostPriority] = useState(initialData?.post_priority ?? 1)
  const [commentPriority, setCommentPriority] = useState(initialData?.comment_priority ?? 1)
  const [interval, setIntervalVal] = useState(initialData?.auto_post_interval_minutes ?? 60)

  // Personality Sliders (1 to 10)
  const [axisTone, setAxisTone] = useState(initialData?.advanced_settings?.axisTone ?? 5)
  const [axisTarget, setAxisTarget] = useState(initialData?.advanced_settings?.axisTarget ?? 5)
  const [axisVocab, setAxisVocab] = useState(initialData?.advanced_settings?.axisVocab ?? 5)
  const [axisAttitude, setAxisAttitude] = useState(initialData?.advanced_settings?.axisAttitude ?? 5)
  const [axisAffection, setAxisAffection] = useState(initialData?.advanced_settings?.axisAffection ?? 5)
  const [formality, setFormality] = useState(initialData?.advanced_settings?.formality || 'informal')

  // Arrays for Tags
  const [catchphrases, setCatchphrases] = useState<string[]>(initialData?.advanced_settings?.catchphrases || [])
  const [forbiddenWords, setForbiddenWords] = useState<string[]>(initialData?.advanced_settings?.forbiddenWords || [])
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>(initialData?.advanced_settings?.triggerKeywords || [])
  
  // Few Shots
  const [fewShots, setFewShots] = useState<{id: number, situation: string, response: string}[]>(
    initialData?.advanced_settings?.fewShots || [{ id: Date.now(), situation: '', response: '' }]
  )
  const [isAutoTuning, setIsAutoTuning] = useState(false)
  const [isBasicMode, setIsBasicMode] = useState(false)

  const [language, setLanguage] = useState(initialData?.advanced_settings?.language || 'default')

  const triggerAutoTune = async (identityString: string) => {
    setIsAutoTuning(true)
    try {
      const res = await fetch('/api/ai-bot-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreIdentity: identityString })
      })
      if (!res.ok) throw new Error('자동 튜닝에 실패했습니다.')
      const data = await res.json()
      
      if (data.category && ['politics', 'economy', 'society', 'tech', 'world', 'entertainment', 'sports', 'culture', 'opinion'].includes(data.category)) {
        setCategory(data.category)
      }
      if (data.axisTone) setAxisTone(data.axisTone)
      if (data.axisTarget) setAxisTarget(data.axisTarget)
      if (data.axisVocab) setAxisVocab(data.axisVocab)
      if (data.axisAttitude) setAxisAttitude(data.axisAttitude)
      if (data.axisAffection) setAxisAffection(data.axisAffection)
      if (data.formality) setFormality(data.formality)
      if (data.catchphrases) setCatchphrases(data.catchphrases)
      if (data.forbiddenWords) setForbiddenWords(data.forbiddenWords)
      if (data.triggerKeywords) setTriggerKeywords(data.triggerKeywords)
      
      setModel('gemma-4-31b')
      toast.success('AI 자동 튜닝이 완료되었습니다!', { icon: '✨' })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsAutoTuning(false)
    }
  }

  const handleAutoTune = () => {
    if (!coreIdentity) {
      toast.error('핵심 정체성을 먼저 입력해주세요.')
      return
    }
    triggerAutoTune(coreIdentity)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = e.currentTarget.value.trim()
      if (val) {
        setter(prev => [...prev, val])
        e.currentTarget.value = ''
      }
    }
  }

  const removeTag = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.filter((_, i) => i !== index))
  }

  const handleResetTuning = () => {
    setAxisTone(5)
    setAxisTarget(5)
    setAxisVocab(5)
    setAxisAttitude(5)
    setAxisAffection(5)
    setFormality('informal')
    setCatchphrases([])
    setForbiddenWords([])
    setFewShots([])
    setIsBasicMode(true)
    toast.success('튜닝이 초기화되었습니다. 순수 코어 정체성만 적용됩니다.', { icon: '🔄' })
  }

  const compilePrompt = () => {
    let prompt = `# Core Identity\n${coreIdentity}\n\n`
    if (isBasicMode) return prompt.trim()

    prompt += `# Personality Axes (Scale 1-10)\n`
    prompt += `- Tone (1: ${t('axisToneLeft')}, 10: ${t('axisToneRight')}): ${axisTone}\n`
    prompt += `- Target (1: ${t('axisTargetLeft')}, 10: ${t('axisTargetRight')}): ${axisTarget}\n`
    prompt += `- Vocabulary (1: ${t('axisVocabLeft')}, 10: ${t('axisVocabRight')}): ${axisVocab}\n`
    prompt += `- Attitude (1: ${t('axisAttitudeLeft')}, 10: ${t('axisAttitudeRight')}): ${axisAttitude}\n`
    prompt += `- Affection (1: ${t('axisAffectionLeft')}, 10: ${t('axisAffectionRight')}): ${axisAffection}\n\n`
    
    prompt += `# Rules\n`
    prompt += `- Formality: ${formality === 'informal' ? t('formalityInformal') : formality === 'formal' ? t('formalityFormal') : t('formalitySarcastic')}\n`
    if (catchphrases.length > 0) prompt += `- Catchphrases: ${catchphrases.join(', ')}\n`
    if (forbiddenWords.length > 0) prompt += `- Forbidden Words: ${forbiddenWords.join(', ')}\n`
    
    if (fewShots.some(s => s.situation || s.response)) {
      prompt += `\n# Few-Shot Examples\n`
      fewShots.forEach((shot, i) => {
        if (shot.situation && shot.response) {
          prompt += `[Situation ${i+1}]: ${shot.situation}\n[Response ${i+1}]: ${shot.response}\n\n`
        }
      })
    }
    return prompt.trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName || !coreIdentity) {
      toast.error('로봇 빌더 필수 조건(닉네임, 핵심 정체성)을 모두 입력해주세요.')
      return
    }

    const advancedSettings = {
      coreIdentity, language,
      axisTone, axisTarget, axisVocab, axisAttitude, axisAffection,
      formality, catchphrases, forbiddenWords, triggerKeywords, fewShots
    }

    const compiledPrompt = compilePrompt()
    
    const formData = new FormData()
    formData.append('displayName', displayName)
    formData.append('username', username)
    formData.append('aiModelProvider', model)
    formData.append('category', category)
    formData.append('botTier', botTier.toString())
    formData.append('status', status)
    formData.append('personaPrompt', compiledPrompt)
    formData.append('advancedSettings', JSON.stringify(advancedSettings))
    formData.append('postPriority', postPriority.toString())
    formData.append('commentPriority', commentPriority.toString())
    formData.append('interval', interval.toString())
    
    if (initialData) {
      formData.append('botId', initialData.id)
    }

    if (loginEmail) formData.append('loginEmail', loginEmail)
    if (loginPassword) formData.append('loginPassword', loginPassword)

    try {
      await onSubmit(formData)
      toast.success(initialData ? '성공적으로 저장되었습니다.' : '성공적으로 등록되었습니다.')
    } catch (error: any) {
      toast.error(error.message || '오류가 발생했습니다.')
    }
  }

  const tabs = [
    { id: 'basic', label: t('tabBasic') },
    { id: 'personality', label: t('tabPersonality') },
    { id: 'vocabulary', label: t('tabVocabulary') },
    { id: 'training', label: t('tabTraining') },
    { id: 'conditions', label: t('tabConditions') }
  ] as const

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition ${activeTab === tab.id ? 'border-b-2 border-black text-black bg-gray-50' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="px-3 shrink-0 flex items-center gap-2">
          <button type="button" onClick={handleResetTuning} className="text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold py-1.5 px-3 rounded transition">
            튜닝리셋
          </button>
          <button type="button" onClick={handleAutoTune} disabled={isAutoTuning} className="text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold py-1.5 px-3 rounded disabled:opacity-50 transition">
            {isAutoTuning ? '튜닝 중...' : '자동튜닝'}
          </button>
          <button type="button" onClick={handleSubmit} disabled={isPending} className="text-xs bg-black text-white hover:bg-gray-800 font-bold py-1.5 px-4 rounded disabled:opacity-50 transition ml-2">
            {initialData ? '저장' : t('botRegister')}
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {activeTab === 'basic' && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-1">
                <label className="block text-sm font-bold mb-1.5 text-gray-800">{t('botNickname')} *</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} type="text" placeholder={t('botNicknamePlaceholder')} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none transition-shadow bg-white" />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-bold mb-1.5 text-gray-800">{t('botUsername')} <span className="text-gray-400 font-normal text-xs ml-1">(자동 생성 가능)</span></label>
                <input value={username} onChange={e => setUsername(e.target.value)} type="text" pattern="^[a-zA-Z0-9_]*$" placeholder={t('botUsernamePlaceholder')} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none transition-shadow bg-white" />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mt-1 mb-2 shadow-sm">
              <p className="text-sm font-bold text-gray-800 mb-3">봇 로그인 계정 관리 <span className="text-gray-500 font-normal text-xs ml-1">(수동 지정)</span></p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">이메일 (ID)</label>
                  <input 
                    value={loginEmail} 
                    onChange={e => setLoginEmail(e.target.value)} 
                    type="email" 
                    placeholder={username ? `${username.toLowerCase()}@nogoodnews.com` : '미입력 시 [아이디]@nogoodnews.com'} 
                    className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm bg-white" 
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">비밀번호</label>
                  <input 
                    value={loginPassword} 
                    onChange={e => setLoginPassword(e.target.value)} 
                    type="text" 
                    placeholder={initialData ? "새 비밀번호 (변경 시 입력)" : "초기 비밀번호 (기본: aa1111)"} 
                    className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm bg-white" 
                  />
                </div>
              </div>
              {!initialData && (
                <p className="text-xs text-gray-500 mt-2.5 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  미입력 시 기본값으로 자동 생성됩니다.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5">{t('category')}</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none font-medium">
                  <option value="politics">정치 (Politics)</option>
                  <option value="economy">경제 (Economy)</option>
                  <option value="society">사회 (Society)</option>
                  <option value="tech">IT/기술 (Tech)</option>
                  <option value="world">세계 (World)</option>
                  <option value="entertainment">연예 (Entertainment)</option>
                  <option value="sports">스포츠 (Sports)</option>
                  <option value="culture">생활/문화 (Culture)</option>
                  <option value="opinion">오피니언 (Opinion)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold mb-1.5">로봇 등급 (Bot Tier)</label>
                  <select value={botTier} onChange={e => setBotTier(Number(e.target.value))} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none font-medium">
                    {[1,2,3,4,5,6,7,8,9,10].map(tier => (
                      <option key={tier} value={tier}>Level {tier}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">계정 상태 (Status)</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none font-medium">
                    <option value="active">활성 (Active)</option>
                    <option value="banned">일시 정지 (Banned)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5">{t('selectModel')}</label>
                <select value={model} onChange={e => setModel(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none font-medium">
                  <option value="gemini-3.5-flash-lite">Google (gemini-3.5-flash-lite) [Pro 최신]</option>
                  <option value="gemini-3.1-flash-lite">Google (gemini-3.1-flash-lite) [Lite 경량]</option>
                  <option value="gemini-2.5-flash">Google (gemini-2.5-flash) [Flash 빠른응답]</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5">언어 (Language)</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none font-medium">
                  <option value="default">관리자 언어 따름 (Default)</option>
                  <option value="ko">한국어 (Korean)</option>
                  <option value="en">영어 (English)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5">{t('coreIdentity')} *</label>
              <textarea value={coreIdentity} onChange={e => setCoreIdentity(e.target.value)} rows={2} placeholder={t('coreIdentityPlaceholder')} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none resize-none"></textarea>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5">{t('postPriority')}</label>
                <input value={postPriority} onChange={e => setPostPriority(Number(e.target.value))} type="number" min="0" max="10" className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5">{t('commentPriority')}</label>
                <input value={commentPriority} onChange={e => setCommentPriority(Number(e.target.value))} type="number" min="0" max="10" className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5">{t('postingInterval')}</label>
                <input value={interval} onChange={e => setIntervalVal(Number(e.target.value))} type="number" min="1" className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'personality' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-4 flex items-center justify-between">
                <span>10단계 슬라이더로 봇의 성격을 튜닝하세요.</span>
              </p>
              
              <div className="flex flex-col gap-5">
                {[
                  { label: t('axisTone'), val: axisTone, set: setAxisTone, left: t('axisToneLeft'), right: t('axisToneRight') },
                  { label: t('axisTarget'), val: axisTarget, set: setAxisTarget, left: t('axisTargetLeft'), right: t('axisTargetRight') },
                  { label: t('axisVocab'), val: axisVocab, set: setAxisVocab, left: t('axisVocabLeft'), right: t('axisVocabRight') },
                  { label: t('axisAttitude'), val: axisAttitude, set: setAxisAttitude, left: t('axisAttitudeLeft'), right: t('axisAttitudeRight') },
                  { label: t('axisAffection'), val: axisAffection, set: setAxisAffection, left: t('axisAffectionLeft'), right: t('axisAffectionRight') }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm font-bold text-gray-700">
                      <span>{item.label}</span>
                      <span className="text-black bg-gray-200 px-2 py-0.5 rounded text-xs">{item.val} / 10</span>
                    </div>
                    <input type="range" min="1" max="10" step="1" value={item.val} onChange={e => { item.set(Number(e.target.value)); setIsBasicMode(false); }} className="w-full accent-black cursor-pointer" />
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>{item.left}</span>
                      <span>{item.right}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vocabulary' && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <label className="block text-sm font-bold mb-1.5">{t('formality')}</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="formality" value="informal" checked={formality === 'informal'} onChange={() => setFormality('informal')} className="accent-black" /> {t('formalityInformal')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="formality" value="formal" checked={formality === 'formal'} onChange={() => setFormality('formal')} className="accent-black" /> {t('formalityFormal')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="formality" value="sarcastic" checked={formality === 'sarcastic'} onChange={() => setFormality('sarcastic')} className="accent-black" /> {t('formalitySarcastic')}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5">{t('catchphrases')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {catchphrases.map((tag, i) => (
                  <span key={i} className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                    {tag} <button type="button" onClick={() => removeTag(i, setCatchphrases)} className="hover:text-black">×</button>
                  </span>
                ))}
              </div>
              <input type="text" placeholder={t('catchphrasesHint')} onKeyDown={e => handleKeyDown(e, setCatchphrases)} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm" />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5 text-red-600">{t('forbiddenWords')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {forbiddenWords.map((tag, i) => (
                  <span key={i} className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                    {tag} <button type="button" onClick={() => removeTag(i, setForbiddenWords)} className="hover:text-black">×</button>
                  </span>
                ))}
              </div>
              <input type="text" placeholder={t('catchphrasesHint')} onKeyDown={e => handleKeyDown(e, setForbiddenWords)} className="w-full border border-red-200 p-2.5 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {fewShots.map((shot, index) => (
              <div key={shot.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 relative group">
                <button type="button" onClick={() => {
                  setFewShots(prev => prev.filter(s => s.id !== shot.id))
                  toast(t('exampleRemoved'), { icon: '🗑️' })
                }} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hidden group-hover:block transition p-1">
                  ✕
                </button>
                <div className="mb-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">#{index + 1} {t('situation')}</label>
                  <input type="text" value={shot.situation} onChange={e => {
                    const newShots = [...fewShots]
                    newShots[index].situation = e.target.value
                    setFewShots(newShots)
                  }} className="w-full border border-gray-200 p-2 rounded focus:ring-1 focus:ring-black outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-600 mb-1">#{index + 1} {t('botResponse')}</label>
                  <textarea rows={2} value={shot.response} onChange={e => {
                    const newShots = [...fewShots]
                    newShots[index].response = e.target.value
                    setFewShots(newShots)
                  }} className="w-full border border-purple-200 p-2 rounded focus:ring-1 focus:ring-purple-500 outline-none text-sm resize-none"></textarea>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setFewShots(prev => [...prev, { id: Date.now(), situation: '', response: '' }])} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-black hover:text-black transition text-sm flex items-center justify-center gap-2">
              <span>+</span> {t('addExample')}
            </button>
          </div>
        )}

        {activeTab === 'conditions' && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <label className="block text-sm font-bold mb-1.5">{t('triggerKeywords')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {triggerKeywords.map((tag, i) => (
                  <span key={i} className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium border border-yellow-200">
                    {tag} <button type="button" onClick={() => removeTag(i, setTriggerKeywords)} className="hover:text-black">×</button>
                  </span>
                ))}
              </div>
              <input type="text" placeholder={t('catchphrasesHint')} onKeyDown={e => handleKeyDown(e, setTriggerKeywords)} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm" />
            </div>
            {/* 규칙 가이드 */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-2">
              <details className="group cursor-pointer">
                <summary className="font-bold text-sm text-blue-800 flex items-center justify-between outline-none">
                  <span>💡 규칙 가이드 (공통 규칙 & 예외 처리)</span>
                  <span className="transition group-open:rotate-180">▼</span>
                </summary>
                <div className="mt-3 text-xs text-blue-900 space-y-2 leading-relaxed">
                  <p><strong>[공통 앵무새 방지 규칙]</strong><br/>
                  서버에는 기본적으로 모든 봇이 <strong>"똑같은 문장이나 유행어를 매번 똑같이 반복하지 말고 문맥에 맞게 다르게 변형하라"</strong>는 공통 규칙이 적용되어 있습니다.</p>
                  
                  <p><strong>[특정 유행어 반복 등 예외 적용 방법]</strong><br/>
                  개그맨 봇처럼 특정 유행어를 매번 똑같이 쓰게 만들고 싶다면, <strong>'기본 설정' 탭의 [핵심 정체성(Core Identity)]</strong> 란 하단에 아래와 같이 명시적인 <strong>예외 규칙</strong>을 적어주세요.</p>
                  
                  <div className="bg-white p-2 rounded border border-blue-200 font-mono mt-1 mb-2">
                    예시) [예외 규칙: 유행어 "ㅇㅇㅇ"는 매 댓글마다 토씨 하나 틀리지 말고 무조건 포함할 것. 공통 규칙보다 이 지시를 우선할 것.]
                  </div>
                  
                  <p>이러한 명시적 지시가 있으면 봇은 공통 앵무새 방지 규칙을 무시하고 해당 유행어를 강력하게 유지합니다.</p>
                </div>
              </details>
            </div>
            
            {/* Future condition settings can be added here */}
          </div>
        )}
      </div>
    </div>
  )
}
