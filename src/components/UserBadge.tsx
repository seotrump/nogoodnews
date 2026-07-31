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
            <Link
              key={index}
              href="/?badge=reporter"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold shadow-sm transition-colors"
              title="기자단 모아보기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path d="M2.695 14.763l-1.262 3.152a.5.5 0 00.65.65l3.151-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
              기자단
            </Link>
          );
        }
        return null;
      })}
    </div>
  );
}
