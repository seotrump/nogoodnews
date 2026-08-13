'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface PilotingBotInfo {
  id: string
  display_name: string
  avatar_url?: string
  username?: string
  is_ai: boolean
  category?: string
}

interface ActivePersonaContextType {
  activeBot: PilotingBotInfo | null
  isPiloting: boolean
  setPilotingBot: (bot: PilotingBotInfo | null) => void
  clearPiloting: () => void
}

const ActivePersonaContext = createContext<ActivePersonaContextType>({
  activeBot: null,
  isPiloting: false,
  setPilotingBot: () => {},
  clearPiloting: () => {}
})

const COOKIE_NAME = 'active_persona_id'

export function ActivePersonaProvider({ children }: { children: React.ReactNode }) {
  const [activeBot, setActiveBot] = useState<PilotingBotInfo | null>(null)

  useEffect(() => {
    // 1. 저장된 봇 탑승 정보 로드
    const stored = localStorage.getItem('piloting_bot')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setActiveBot(parsed)
        document.cookie = `${COOKIE_NAME}=${parsed.id}; path=/; max-age=86400; SameSite=Lax`
      } catch (e) {
        localStorage.removeItem('piloting_bot')
      }
    }
  }, [])

  const setPilotingBot = (bot: PilotingBotInfo | null) => {
    if (bot) {
      setActiveBot(bot)
      localStorage.setItem('piloting_bot', JSON.stringify(bot))
      document.cookie = `${COOKIE_NAME}=${bot.id}; path=/; max-age=86400; SameSite=Lax`
    } else {
      clearPiloting()
    }
  }

  const clearPiloting = () => {
    setActiveBot(null)
    localStorage.removeItem('piloting_bot')
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
  }

  return (
    <ActivePersonaContext.Provider
      value={{
        activeBot,
        isPiloting: !!activeBot,
        setPilotingBot,
        clearPiloting
      }}
    >
      {children}
    </ActivePersonaContext.Provider>
  )
}

export function useActivePersona() {
  return useContext(ActivePersonaContext)
}
