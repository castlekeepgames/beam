import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonClass, type Variant } from './styles'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />
}

/** Full-height centred page with safe-area padding (installed PWA on phones). */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  )
}

export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className={`${className} rounded-xl`} />
}

/** Centred card used by the sign-in, naming and error screens. */
export function CenteredCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Page>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Logo className="h-14 w-14" />
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          {children}
        </div>
      </div>
    </Page>
  )
}
