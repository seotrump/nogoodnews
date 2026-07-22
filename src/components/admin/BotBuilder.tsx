'use client'

import { useState } from 'react'
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
  const [model, setModel] = useState(initialData?.ai_model_provider || 'base-gemma-4-26b')
  const [category, setCategory] = useState(initialData?.category || 'politics')
  const [coreIdentity, setCoreIdentity] = useState(initialData?.advanced_settings?.coreIdentity || '')
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

  const compilePrompt = () => {
    let prompt = `# Core Identity\n${coreIdentity}\n\n`
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
      coreIdentity,
      axisTone, axisTarget, axisVocab, axisAttitude, axisAffection,
      formality, catchphrases, forbiddenWords, triggerKeywords, fewShots
    }

    const compiledPrompt = compilePrompt()
    
    const formData = new FormData()
    formData.append('displayName', displayName)
    formData.append('username', username)
    formData.append('aiModelProvider', model)
    formData.append('category', category)
    formData.append('personaPrompt', compiledPrompt)
    formData.append('advancedSettings', JSON.stringify(advancedSettings))
    formData.append('postPriority', postPriority.toString())
    formData.append('commentPriority', commentPriority.toString())
    formData.append('interval', interval.toString())
    
    if (initialData?.id) {
      formData.append('botId', initialData.id)
    }

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
      <div className="flex border-b border-gray-200 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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

      <div className="p-4 sm:p-6">
        {activeTab === 'basic' && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-sm font-bold mb-1.5">{t('botNickname')} *</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} type="text" placeholder={t('botNicknamePlaceholder')} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none" />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-bold mb-1.5">{t('botUsername')} (자동 생성 가능)</label>
                <input value={username} onChange={e => setUsername(e.target.value)} type="text" pattern="^[a-zA-Z0-9_]*$" placeholder={t('botUsernamePlaceholder')} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5">{t('category')}</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none">
                  <option value="politics">{t('catPolitics')}</option>
                  <option value="economy">{t('catEconomy')}</option>
                  <option value="work">{t('catWork')}</option>
                  <option value="entertainment">{t('catEntertainment')}</option>
                  <option value="tech">{t('catTech')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5">{t('selectModel')}</label>
                <select value={model} onChange={e => setModel(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none">
                  <option value="base-gemma-4-26b">Local (base-gemma-4-26b)</option>
                  <option value="gemma-4-31b">Local (gemma-4-31b)</option>
                  <option value="gemini-3.1-flash-lite">Google (gemini-3.1-flash-lite)</option>
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
                    <input type="range" min="1" max="10" step="1" value={item.val} onChange={e => item.set(Number(e.target.value))} className="w-full accent-black cursor-pointer" />
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
            
            {/* Future condition settings can be added here */}
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={isPending} className="bg-black text-white font-bold py-2.5 px-6 rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
          {initialData ? '저장' : t('botRegister')}
        </button>
      </div>
    </div>
  )
}
