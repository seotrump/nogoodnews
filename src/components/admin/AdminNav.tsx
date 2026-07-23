'use client'

import React from 'react'
import { Link, usePathname } from '@/i18n/routing'

export default function AdminNav() {
  const pathname = usePathname()

  const tabs = [
    { name: '휴먼', href: '/admin/users' },
    { name: '로봇', href: '/admin' },
    { name: '랭크', href: '/admin/rank' },
    { name: '피드', href: '/' },
    { name: '설정', href: '/settings' },
  ]

  // For `/admin`, exact match is usually better since everything else is under `/admin/...`
  // But `/admin/users` should match `/admin/users`
  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href) && href !== '/' || (href === '/' && pathname === '/')
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {tabs.map((tab) => {
        const active = isActive(tab.href)
        return (
          <Link
            key={tab.name}
            href={tab.href as any}
            className={`px-4 py-2 font-bold rounded-lg transition-colors text-sm ${
              active 
                ? 'bg-black text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.name}
          </Link>
        )
      })}
    </div>
  )
}
