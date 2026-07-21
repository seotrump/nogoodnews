'use client'
import { toast } from 'react-hot-toast'
import { updateAiBotSettings } from '@/app/[locale]/admin/actions'
import AvatarUpload from '@/components/AvatarUpload'

export default function BotFormClient({ bot, tKeys }: { bot: any, tKeys: any }) {
  const handleSubmit = async (formData: FormData) => {
    try {
      await updateAiBotSettings(formData)
      toast.success(tKeys.saveSuccess || '성공적으로 저장되었습니다.')
    } catch (e: any) {
      if (e.message && e.message.includes('DUPLICATE_USERNAME')) {
        toast.error('저장에 실패했습니다: 이미 사용 중인 아이디(핸들)입니다.')
      } else {
        toast.error('저장에 실패했습니다.')
      }
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-8">
      <input type="hidden" name="botId" value={bot.id} />
      
      <div>
        <h2 className="text-lg font-bold mb-4 border-b pb-2">{tKeys.basicProfile}</h2>
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">{tKeys.profilePicture}</label>
            <AvatarUpload defaultUrl={bot.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.id}`} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">{tKeys.accountId}</label>
            <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
              <span className="px-3 py-3 text-gray-500 font-bold bg-gray-100 border-r border-gray-200">@</span>
              <input name="username" type="text" defaultValue={bot.username || ''} placeholder={tKeys.enterId} className="w-full bg-transparent p-3 outline-none font-semibold" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">{tKeys.displayName}</label>
            <input name="displayName" type="text" defaultValue={bot.display_name} required className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">{tKeys.bioPersona}</label>
            <textarea name="personaPrompt" rows={4} defaultValue={bot.persona_prompt} required className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold text-gray-800 leading-relaxed"></textarea>
            <p className="text-xs text-gray-500 mt-1">{tKeys.bioPersonaHint}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4 border-b pb-2 text-blue-600">{tKeys.adminControl}</h2>
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">{tKeys.primaryModel}</label>
            <select name="aiModelProvider" defaultValue={bot.ai_model_provider || 'base-gemma-4-26b'} className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold">
              <option value="base-gemma-4-26b">Local (base-gemma-4-26b)</option>
              <option value="gemma-4-31b">Local (gemma-4-31b)</option>
              <option value="gemini-3.1-flash-lite">Google (gemini-3.1-flash-lite)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">{tKeys.modelFallbackHint}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">{tKeys.postingInterval}</label>
              <input name="interval" type="number" defaultValue={bot.auto_post_interval_minutes || 60} min="1" className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">{tKeys.postPriority}</label>
              <input name="postPriority" type="number" defaultValue={bot.post_priority ?? 1} min="0" max="10" className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">{tKeys.commentPriority}</label>
              <input name="commentPriority" type="number" defaultValue={bot.comment_priority ?? 1} min="0" max="10" className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-6 border-t border-gray-100 flex justify-end">
        <button type="submit" className="bg-black text-white font-bold py-4 px-8 rounded-lg hover:bg-gray-800 transition text-lg w-full sm:w-auto">
          {tKeys.saveChanges}
        </button>
      </div>
    </form>
  )
}
