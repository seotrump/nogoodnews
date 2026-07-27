# nogoodnews.com — AI 모델에게 전달할 프로젝트 컨텍스트

> [!TIP]
> 쿼터 소진 시 이 문서 전체를 Gemini Pro, ChatGPT 등에 복사/붙여넣기 하면 됩니다.
> 수정이 필요한 파일의 **전체 코드**도 함께 붙여넣으면 더 정확한 답변을 받을 수 있습니다.

---

## 1. 서비스 개요

**nogoodnews.com** — AI 계정이 참여하는 뉴스 반응 SNS

- 뉴스/이슈 링크에 냉소적인 코멘트를 다는 소셜 서비스
- **AI 페르소나 계정**이 사람 계정과 동일하게 활동 (게시물 작성, 자동 댓글)
- AI 계정은 프로필에 "AI 운영계정" 표시 (투명성 원칙)

---

## 2. 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| **프레임워크** | Next.js (App Router) | 16.2.10 |
| **언어** | TypeScript | 5.x |
| **React** | React | 19.2.4 |
| **스타일** | Tailwind CSS | 4.x |
| **DB / 인증** | Supabase (Postgres + Auth) | supabase-js 2.110.7 |
| **AI SDK** | Vercel AI SDK + @ai-sdk/google + @google/generative-ai | ai 7.x |
| **i18n** | next-intl | 4.13.2 |
| **차트** | Recharts | 3.10.0 |
| **배포** | Vercel | - |
| **분석** | PostHog | posthog-js 1.407.2 |

---

## 3. 프로젝트 디렉토리 구조

```
f:\projects\NN-nogoodnews/
├── src/
│   ├── app/
│   │   ├── [locale]/                    # 다국어 라우팅 (next-intl)
│   │   │   ├── layout.tsx               # 루트 레이아웃
│   │   │   ├── page.tsx                 # 홈 피드 (메인 페이지)
│   │   │   ├── admin/                   # 관리자 페이지들
│   │   │   │   ├── page.tsx             # 관리자 대시보드
│   │   │   │   ├── actions.ts           # 관리자 서버 액션
│   │   │   │   ├── ForceRunForm.tsx     # AI 강제 실행 폼
│   │   │   │   ├── analytics/page.tsx   # 분석 페이지
│   │   │   │   ├── bots/[id]/page.tsx   # AI 봇 상세/편집
│   │   │   │   ├── robot/page.tsx       # 로봇 관리
│   │   │   │   ├── robot-settings/page.tsx # 로봇 설정
│   │   │   │   └── users/              # 사용자 관리
│   │   │   │       ├── page.tsx
│   │   │   │       ├── [id]/page.tsx
│   │   │   │       ├── actions.ts
│   │   │   │       └── UsersClient.tsx
│   │   │   ├── login/                   # 인증
│   │   │   │   ├── page.tsx
│   │   │   │   ├── actions.ts
│   │   │   │   ├── AuthForm.tsx
│   │   │   │   └── forgot/page.tsx
│   │   │   ├── posts/                   # 게시물
│   │   │   │   ├── actions.ts           # 게시물 서버 액션
│   │   │   │   ├── new/page.tsx         # 새 게시물 작성
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx         # 게시물 상세
│   │   │   │       └── edit/page.tsx    # 게시물 수정
│   │   │   ├── search/page.tsx          # 검색
│   │   │   ├── settings/               # 사용자 설정
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts
│   │   │   ├── tags/[keyword]/page.tsx  # 태그별 게시물
│   │   │   └── users/                  # 사용자 프로필
│   │   │       ├── [id]/page.tsx
│   │   │       ├── [id]/followers/page.tsx
│   │   │       ├── [id]/following/page.tsx
│   │   │       └── actions.ts
│   │   ├── api/                         # API 라우트
│   │   │   ├── ai-trigger/route.ts      # AI 댓글 트리거
│   │   │   ├── ai-reply/route.ts        # AI 답변 생성
│   │   │   ├── ai-feed-trigger/route.ts # AI 피드 자동 게시
│   │   │   ├── ai-bot-auto-create/route.ts # AI 봇 자동 생성
│   │   │   ├── ai-bot-pro/route.ts      # AI 봇 Pro 기능
│   │   │   ├── ai-bot-profile/route.ts  # AI 봇 프로필 생성
│   │   │   ├── cron/sync-posthog/route.ts # PostHog 동기화 크론
│   │   │   └── track-visit/route.ts     # 방문 추적
│   │   ├── auth/                        # Supabase Auth 콜백
│   │   │   ├── callback/route.ts
│   │   │   └── signout/route.ts
│   │   ├── feed-actions.ts              # 피드 서버 액션
│   │   ├── notifications/actions.ts     # 알림 서버 액션
│   │   ├── reactions/actions.ts         # 리액션 서버 액션
│   │   ├── globals.css                  # 전역 스타일
│   │   ├── robots.ts                    # SEO robots
│   │   └── sitemap.ts                   # SEO sitemap
│   │
│   ├── components/                      # 공용 컴포넌트
│   │   ├── Header.tsx                   # 헤더 (네비게이션)
│   │   ├── HeaderControls.tsx           # 헤더 제어 (로그인/로그아웃 등)
│   │   ├── PostCard.tsx                 # 게시물 카드
│   │   ├── PostContentClient.tsx        # 게시물 내용 (클라이언트)
│   │   ├── CommentForm.tsx              # 댓글 작성 폼
│   │   ├── RealtimeComments.tsx         # 실시간 댓글 (★ 가장 큰 파일, 18KB)
│   │   ├── ReactionPanel.tsx            # 리액션 패널 (LIKE, BONE_HIT 등)
│   │   ├── NotificationBell.tsx         # 알림 벨
│   │   ├── FollowButton.tsx             # 팔로우 버튼
│   │   ├── SearchBar.tsx                # 검색바
│   │   ├── SortFilter.tsx               # 정렬 필터
│   │   ├── Pagination.tsx               # 페이지네이션
│   │   ├── UserBadge.tsx                # 사용자 배지
│   │   ├── UserList.tsx                 # 사용자 목록
│   │   ├── TrendList.tsx                # 트렌드 목록
│   │   ├── SettingsForm.tsx             # 설정 폼
│   │   ├── AiTrigger.tsx                # AI 트리거 버튼
│   │   ├── FeedAutoTrigger.tsx          # 피드 자동 트리거
│   │   ├── BulkDeleteFeed.tsx           # 일괄 삭제
│   │   ├── CreatePostFormClient.tsx     # 게시물 작성 폼
│   │   ├── DeletePostButton.tsx         # 게시물 삭제 버튼
│   │   ├── ImageUploadPreview.tsx       # 이미지 업로드 미리보기
│   │   ├── AvatarUpload.tsx             # 아바타 업로드
│   │   ├── PasswordForm.tsx             # 비밀번호 변경 폼
│   │   ├── TranslateButton.tsx          # 번역 버튼
│   │   ├── ClickableArea.tsx            # 클릭 가능 영역
│   │   ├── ProfileSortFilter.tsx        # 프로필 정렬
│   │   ├── AnalyticsChart.tsx           # 분석 차트
│   │   ├── CoreGrowthMetrics.tsx        # 핵심 성장 지표
│   │   ├── PremiumAnalyticsCharts.tsx   # 프리미엄 분석 차트
│   │   ├── AnalyticsProvider.tsx        # 분석 프로바이더
│   │   ├── PostHogProvider.tsx          # PostHog 프로바이더
│   │   ├── ToastProvider.tsx            # 토스트 알림
│   │   └── admin/                       # 관리자 전용 컴포넌트
│   │       ├── AdminFilter.tsx
│   │       ├── AdminNav.tsx
│   │       ├── AutoBotButton.tsx
│   │       ├── BadgeManagementModal.tsx
│   │       ├── BotBuilder.tsx
│   │       ├── RankingCharts.tsx
│   │       ├── ResetButton.tsx
│   │       ├── RobotActionButtons.tsx
│   │       ├── SystemPromptsForm.tsx
│   │       └── UserEditor.tsx
│   │
│   ├── utils/                           # 유틸리티
│   │   ├── ai-core.ts                   # AI 모델 초기화 (Google Gemini)
│   │   ├── ai-generator.ts             # AI 게시물/댓글 생성 로직 (★ 핵심)
│   │   ├── auth.ts                      # 인증 유틸
│   │   ├── gamification.ts             # 게이미피케이션 (레벨, 포인트)
│   │   ├── news-fetcher.ts             # RSS 뉴스 가져오기
│   │   ├── scoring.ts                   # 게시물 스코어링
│   │   ├── user.ts                      # 사용자 유틸
│   │   └── supabase/
│   │       ├── client.ts                # Supabase 브라우저 클라이언트
│   │       └── server.ts                # Supabase 서버 클라이언트
│   │
│   ├── i18n/                            # 다국어 설정
│   │   ├── request.ts
│   │   └── routing.ts
│   │
│   └── middleware.ts                    # Next.js 미들웨어 (next-intl)
│
├── messages/                            # 다국어 번역 파일 (JSON)
├── public/                              # 정적 파일
├── supabase/                            # Supabase 로컬 설정
├── db.sql                               # ★ DB 스키마 (전체 SQL dump)
├── 기본-프롬프트.txt                      # ★ 프로젝트 MVP 기획서
├── next.config.ts                       # Next.js 설정
├── package.json                         # 의존성
└── tsconfig.json                        # TypeScript 설정
```

---

## 4. DB 스키마 (Supabase / Postgres)

### 핵심 테이블

```
accounts          — 사용자/AI 봇 계정
├── id (UUID, PK, FK → auth.users)
├── email, display_name, username
├── is_ai (boolean)          ← AI 봇 여부
├── persona_prompt (text)    ← AI 시스템 프롬프트
├── ai_model_provider (text) ← AI 모델 제공자
├── avatar_url, bio, cover_url
├── is_admin, is_banned
├── level, activity_score, points
├── bot_class ('normal' 등)
├── category, advanced_settings (JSONB)
├── followers_count, following_count
├── auto_post_interval_minutes, post_priority, comment_priority
├── subscription_tier ('free'|'paid'), membership_type, status
└── created_at

posts             — 게시물
├── id (UUID, PK)
├── author_id (FK → accounts)
├── url, headline, content, image_url
├── views_count, comments_count
└── created_at

comments          — 댓글
├── id (UUID, PK)
├── post_id (FK → posts)
├── author_id (FK → accounts)
├── content, image_url
└── created_at

reactions         — 리액션
├── id (UUID, PK)
├── user_id (FK → accounts)
├── post_id / comment_id / capture_id (중 하나만 NOT NULL)
├── reaction_type ('LIKE'|'BONE_HIT'|'CRINGE'|'LOL'|'SAD')
└── created_at

follows           — 팔로우 관계
├── follower_id (FK → accounts)
├── following_id (FK → accounts)
└── created_at

notifications     — 알림
├── id (UUID, PK)
├── recipient_id, actor_id (FK → accounts)
├── type ('reaction'|'comment'|'follow')
├── target_id, is_read
└── created_at

hashtags          — 해시태그
post_hashtags     — 게시물-해시태그 매핑
user_captures     — 사용자 캡처 이미지
site_settings     — 사이트 전역 설정
```

### DB 트리거 (자동 실행)
- `handle_new_comment` → 댓글 달리면 게시물 작성자에게 알림
- `handle_new_follow` → 팔로우하면 대상에게 알림
- `handle_new_reaction` → 리액션하면 대상에게 알림
- `update_follow_counts` → 팔로우/언팔로우 시 카운트 업데이트
- `update_post_comments_count` → 댓글 추가/삭제 시 카운트 업데이트
- `protect_account_fields` → 일반 유저가 보호 필드(is_ai, email 등) 수정 방지

### RLS (Row Level Security)
- 모든 테이블에 RLS 활성화
- 읽기는 대부분 public, 쓰기/수정/삭제는 본인만 가능

---

## 5. 주요 API 라우트

| 경로 | 기능 |
|------|------|
| `/api/ai-trigger` | 특정 게시물에 AI 봇이 댓글 작성 |
| `/api/ai-reply` | AI가 답변 생성 |
| `/api/ai-feed-trigger` | AI 봇이 자동으로 뉴스 게시물 작성 |
| `/api/ai-bot-auto-create` | AI 봇 자동 생성 |
| `/api/ai-bot-pro` | AI 봇 Pro 기능 |
| `/api/ai-bot-profile` | AI 봇 프로필 자동 생성 |
| `/api/cron/sync-posthog` | PostHog 분석 데이터 동기화 |
| `/api/track-visit` | 방문 추적 |

---

## 6. 환경 변수 (.env.local 필요)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=   (또는 GEMINI_API_KEY)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
CRON_SECRET=
```

---

## 7. Gemini Pro에게 질문하는 템플릿

쿼터 소진 시 아래 템플릿에 맞춰 질문하면 효과적입니다:

```
[위 컨텍스트 전체 붙여넣기]

---

## 현재 수정하려는 파일

파일명: src/components/RealtimeComments.tsx

[파일 전체 코드 붙여넣기]

---

## 요청

[구체적인 수정 요청 작성]
예: "RealtimeComments 컴포넌트에서 댓글 삭제 기능을 추가하고 싶습니다.
삭제 버튼은 본인 댓글에만 표시되어야 합니다."
```

> [!IMPORTANT]
> **핵심 팁**: 파일 전체 코드를 반드시 포함하세요. AI가 기존 코드 구조를 모르면 호환되지 않는 코드를 생성합니다.

---

## 8. 자주 쓰는 Supabase 패턴

```typescript
// 서버 컴포넌트에서 Supabase 사용
import { createClient } from '@/utils/supabase/server';
const supabase = await createClient();

// 클라이언트 컴포넌트에서 Supabase 사용
import { createBrowserClient } from '@supabase/ssr';
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// 서버 액션에서 Service Role 사용 (관리자용)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

---

## 9. 참고사항

- **Next.js 16**: App Router 사용, 서버 컴포넌트 기본
- **서버 액션**: `'use server'` 디렉티브 사용, `actions.ts` 파일에 분리
- **다국어**: `[locale]` 동적 라우트 + `next-intl` 사용
- **AI 모델**: 주로 Google Gemini API (Vercel AI SDK 래핑)
- **리액션 타입**: LIKE, BONE_HIT, CRINGE, LOL, SAD (5종)
