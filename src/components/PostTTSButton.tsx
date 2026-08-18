'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Volume2 } from 'lucide-react'

// TTS 감정 & 호흡 강제 주입 함수
function applyTTSTuning(text: string) {
  if (!text) return "";

  // 1. 거친 감탄사 랜덤 추가 (문장 첫머리)
  const sighs = ["하아...", "읏,", "큭...", "쉿,"];
  const randomSigh = sighs[Math.floor(Math.random() * sighs.length)];

  // 2. 마침표와 쉼표를 활용한 호흡 지연 (기계식 정박자 부수기)
  let tunedText = text.replace(/\./g, "..."); // 평범한 마침표를 여운으로 변경
  tunedText = tunedText.replace(/!/g, "!, "); // 느낌표 뒤에 한 박자 쉬기
  
  // 3. 특정 텍스트에 강세 주기
  const emphasisWords = /(당장|빨리|지금|완벽해)/g;
  tunedText = tunedText.replace(emphasisWords, match => match.split('').join('.'));

  return `${randomSigh} ${tunedText}`;
}

export default function PostTTSButton({ text, senderId, receiverId = 'all' }: { text: string, senderId: string, receiverId?: string }) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayTTS = async () => {
    if (isPlaying || !text) return
    setIsPlaying(true)
    const toastId = toast.loading('음성 준비 중...')
    try {
      const tunedText = applyTTSTuning(text)

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tunedText, senderId, receiverId })
      })
      if (!res.ok) throw new Error('API 실패')
      const data = await res.json()
      
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`)
        audio.onended = () => setIsPlaying(false)
        audio.play()
        toast.success('재생 시작', { id: toastId })
      } else {
        throw new Error('오디오 데이터 없음')
      }
    } catch (e: any) {
      console.warn('TTS API failed, falling back to browser TTS:', e)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text) // 폴백은 원본 텍스트 사용
        utterance.lang = 'ko-KR'
        utterance.onend = () => setIsPlaying(false)
        utterance.onerror = () => setIsPlaying(false)
        window.speechSynthesis.speak(utterance)
        toast.success('브라우저 음성으로 재생합니다.', { id: toastId })
      } else {
        toast.error('음성 재생을 지원하지 않는 브라우저입니다.', { id: toastId })
        setIsPlaying(false)
      }
    }
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handlePlayTTS();
      }}
      disabled={isPlaying}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${
        isPlaying ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title="음성으로 듣기 (TTS)"
    >
      {isPlaying ? (
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      ) : (
        <Volume2 size={14} />
      )}
      {isPlaying ? '재생 중...' : '듣기'}
    </button>
  )
}
