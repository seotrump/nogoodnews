'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Volume2, Square } from 'lucide-react'

// TTS 감정 & 호흡 강제 주입 함수 (Gemini 3.1 Flash TTS Preview 오디오 태그 활용)
function applyTTSTuning(text: string) {
  if (!text) return "";

  // 1. 공식 오디오 태그 랜덤 추가 (문장 첫머리)
  const prefixes = ["[sighs]", "[laughs]", "[whispers]", ""];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];

  // 2. 마침표와 느낌표를 활용한 오디오 태그 지연 및 감정 주입
  let tunedText = text.replace(/\./g, " [short pause] ");
  tunedText = tunedText.replace(/!/g, " [anger]! ");
  
  return `${randomPrefix} ${tunedText}`.trim();
}

let currentAudio: HTMLAudioElement | null = null;

export default function PostTTSButton({ text, senderId, receiverId = 'all', variant = 'default' }: { text: string, senderId: string, receiverId?: string, variant?: 'default' | 'icon' }) {
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const handleStop = () => setIsPlaying(false)
    window.addEventListener('stop-all-tts', handleStop)
    return () => window.removeEventListener('stop-all-tts', handleStop)
  }, [])

  const handlePlayTTS = async () => {
    if (isPlaying) {
      // 멈춤 기능 구현
      window.dispatchEvent(new Event('stop-all-tts'))
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        currentAudio = null
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setIsPlaying(false)
      toast.success('재생 중지됨')
      return
    }

    if (!text) return

    // 다른 모든 TTS 중지
    window.dispatchEvent(new Event('stop-all-tts'))
    if (currentAudio) {
      currentAudio.pause()
      currentAudio = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    setIsPlaying(true)
    const toastId = toast.loading('음성 준비 중...')
    try {
      // 해시태그 제거
      const textWithoutHashtags = text.replace(/#[\w가-힣]+/g, '').trim()
      const tunedText = applyTTSTuning(textWithoutHashtags)

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tunedText, senderId, receiverId })
      })
      if (!res.ok) throw new Error('API 실패')
      const data = await res.json()
      
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`)
        currentAudio = audio
        audio.onended = () => {
          setIsPlaying(false)
          currentAudio = null
        }
        audio.play()
        toast.success('재생 시작', { id: toastId })
      } else {
        throw new Error('오디오 데이터 없음')
      }
    } catch (e: any) {
      console.warn('TTS API failed, falling back to browser TTS:', e)
      if ('speechSynthesis' in window) {
        const textWithoutHashtags = text.replace(/#[\w가-힣]+/g, '').trim()
        const utterance = new SpeechSynthesisUtterance(textWithoutHashtags) // 폴백은 원본 텍스트 사용
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
      className={
        variant === 'icon' 
          ? `flex items-center justify-center w-6 h-6 rounded-full transition ${isPlaying ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`
          : `flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${isPlaying ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
      }
      title={isPlaying ? "중지" : "음성으로 듣기 (TTS)"}
    >
      {isPlaying ? (
        <Square size={variant === 'icon' ? 12 : 14} fill="currentColor" />
      ) : (
        <Volume2 size={variant === 'icon' ? 12 : 14} />
      )}
      {variant !== 'icon' && (isPlaying ? '중지' : '듣기')}
    </button>
  )
}
