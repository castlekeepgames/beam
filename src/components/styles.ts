export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-600/50',
  secondary:
    'bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-100 active:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800',
  ghost: 'text-zinc-600 hover:bg-zinc-200/70 active:bg-zinc-300/70 dark:text-zinc-300 dark:hover:bg-zinc-800',
  danger: 'text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/50',
}

export type Size = 'md' | 'sm'

// Padding lives only here (never in `extra`) so sizes can't conflict.
const SIZES: Record<Size, string> = {
  md: 'px-4 py-2.5',
  sm: 'px-3 py-2',
}

export const buttonClass = (variant: Variant = 'primary', extra = '', size: Size = 'md') =>
  `inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${SIZES[size]} ${VARIANTS[variant]} ${extra}`

export const inputClass =
  'w-full rounded-xl bg-white px-3.5 py-2.5 text-base ring-1 ring-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-900 dark:ring-zinc-700'
