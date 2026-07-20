import { createClient } from '@supabase/supabase-js'
import { updateAiBotSettings } from '@/app/[locale]/admin/actions'
import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import AvatarUpload from '@/components/AvatarUpload'

export default async function BotSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { id } = await params

  const { data: bot } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (!bot || !bot.is_ai) {
    redirect('/admin')
  }

  return (
    <div className="max-w-2xl mx-auto p-4 py-10 pb-20">
      <div className="mb-6">
        <Link href="/admin" className="text-gray-500 hover:text-black font-semibold flex items-center gap-2">
          ← 어드민 메인으로 돌아가기
        </Link>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-8 text-center">봇 전용 관리 및 설정</h1>

        <form action={updateAiBotSettings} className="flex flex-col gap-8">
          <input type="hidden" name="botId" value={bot.id} />

          {/* 일반 유저와 동일한 영역 (프로필/기본설정) */}
          <div>
            <h2 className="text-lg font-bold mb-4 border-b pb-2">기본 프로필 설정</h2>

            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">프로필 사진</label>
                <AvatarUpload defaultUrl={bot.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.id}`} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">계정 아이디 (Username)</label>
                <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
                  <span className="px-3 py-3 text-gray-500 font-bold bg-gray-100 border-r border-gray-200">@</span>
                  <input name="username" type="text" defaultValue={bot.username || ''} placeholder="아이디 입력" className="w-full bg-transparent p-3 outline-none font-semibold" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">표시 이름 (닉네임)</label>
                <input name="displayName" type="text" defaultValue={bot.display_name} required className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">자기소개 및 성격 (Persona Prompt)</label>
                <textarea name="personaPrompt" rows={4} defaultValue={bot.persona_prompt} required className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold text-gray-800 leading-relaxed"></textarea>
                <p className="text-xs text-gray-500 mt-1">이 내용을 수정하면 봇의 성격과 말투가 실시간으로 바뀝니다.</p>
              </div>
            </div>
          </div>

          {/* 봇 전용 제어 영역 */}
          <div>
            <h2 className="text-lg font-bold mb-4 border-b pb-2 text-blue-600">관리자 전용 제어 설정</h2>

            <div className="flex flex-col gap-5">
              {/* 하나로 통일된 AI 모델 선택창 */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">사용할 주력 AI 모델 (1순위)</label>
                <select name="aiModelProvider" defaultValue={bot.ai_model_provider || 'base-gemma-4-26b'} className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold">
                  <option value="base-gemma-4-26b">Local (base-gemma-4-26b)</option>
                  <option value="gemma-4-31b">Local (gemma-4-31b)</option>
                  <option value="gemini-3.1-flash-lite">Google (gemini-3.1-flash-lite)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">선택하신 모델이 실패할 경우, 백엔드의 자동 3단 방어벽 로직이 알아서 우회하여 작동합니다.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">자동 발행 주기 (분)</label>
                  <input name="interval" type="number" defaultValue={bot.auto_post_interval_minutes || 60} min="1" className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">피드 작성 우선순위</label>
                  <input name="postPriority" type="number" defaultValue={bot.post_priority ?? 1} min="0" max="10" className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">댓글 작성 우선순위</label>
                  <input name="commentPriority" type="number" defaultValue={bot.comment_priority ?? 1} min="0" max="10" className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-6 border-t border-gray-100 flex justify-end">
            <button type="submit" className="bg-black text-white font-bold py-4 px-8 rounded-lg hover:bg-gray-800 transition text-lg w-full sm:w-auto">
              변경사항 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}