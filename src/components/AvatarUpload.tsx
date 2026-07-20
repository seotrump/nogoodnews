'use client'

import { useState } from 'react'

export default function AvatarUpload({ defaultUrl }: { defaultUrl: string }) {
  const [preview, setPreview] = useState(defaultUrl)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <img 
        src={preview} 
        alt="Profile" 
        className="w-16 h-16 rounded-full object-cover border shadow-sm" 
      />
      <div>
        <input 
          type="file" 
          name="avatarFile" 
          accept="image/*" 
          onChange={handleFileChange}
          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer" 
        />
      </div>
    </div>
  )
}
