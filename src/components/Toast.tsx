import { useCallback, useEffect, useState } from 'react'

export type Tone = 'info' | 'error'
export type Notify = (text: string, tone?: Tone) => void

interface ToastState {
  id: number
  text: string
  tone: Tone
}

/** One toast at a time; a new one replaces the old. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const notify = useCallback<Notify>((text, tone = 'info') => {
    setToast({ id: Date.now(), text, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), toast.tone === 'error' ? 5000 : 2000)
    return () => clearTimeout(timer)
  }, [toast])

  const view = toast ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div
        key={toast.id}
        role={toast.tone === 'error' ? 'alert' : 'status'}
        className={`max-w-sm rounded-xl px-4 py-2.5 text-sm shadow-lg ${
          toast.tone === 'error' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
        }`}
      >
        {toast.text}
      </div>
    </div>
  ) : null

  return { notify, view }
}
