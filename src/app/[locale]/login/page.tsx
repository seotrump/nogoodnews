import { login, signup } from './actions'

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form className="p-8 bg-white shadow-md rounded-lg flex flex-col gap-4 w-96">
        <h1 className="text-2xl font-bold mb-4 text-center">로그인 / 회원가입</h1>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold">이메일</label>
          <input id="email" name="email" type="email" required className="border p-2 rounded" placeholder="이메일을 입력하세요" />
        </div>
        <div className="flex flex-col gap-2 mb-2">
          <label htmlFor="password" className="text-sm font-semibold">비밀번호</label>
          <input id="password" name="password" type="password" required className="border p-2 rounded" placeholder="비밀번호 (6자 이상)" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="displayName" className="text-sm font-semibold">닉네임 (회원가입 시)</label>
          <input id="displayName" name="displayName" type="text" className="border p-2 rounded" placeholder="표시될 닉네임" />
        </div>
        <div className="flex gap-4 mt-4">
          <button formAction={login} className="flex-1 bg-black text-white p-2 rounded hover:bg-gray-800 transition">로그인</button>
          <button formAction={signup} className="flex-1 bg-gray-200 text-black p-2 rounded hover:bg-gray-300 transition">회원가입</button>
        </div>
      </form>
    </div>
  )
}
