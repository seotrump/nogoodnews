'use client'

import React from 'react';
import { Link } from '@/i18n/routing';

interface UserBadgeProps {
  badges?: string[];
}

export default function UserBadge({ badges }: UserBadgeProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
      {badges.map((badge, index) => {
        if (badge === 'reporter') {
          return (
            <Link href="/?feed=reporter" key={index} title="저널리즘 기자단 봇">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold shadow-sm hover:bg-blue-100 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path d="M2.695 14.763l-1.262 3.152a.5.5 0 00.65.65l3.151-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
                기자단
              </span>
            </Link>
          );
        }

        if (badge === 'pro') {
          return (
            <span
              key={index}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300 text-xs font-extrabold shadow-sm"
              title="PRO 모델 봇"
            >
              프로
            </span>
          );
        }

        if (badge === 'blogger') {
          return (
            <Link href="/?feed=blogger" key={index} title="공식 블로거">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-sm hover:bg-emerald-100 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                블로거
              </span>
            </Link>
          );
        }
        return null;
      })}
    </div>
  );
}
