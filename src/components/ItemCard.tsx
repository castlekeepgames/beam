import { useState } from 'react'
import { isSafeHttpUrl } from '../lib/links'
import type { Item } from '../lib/types'
import { buttonClass } from './styles'
import { Button } from './ui'

const LONG_TEXT_CHARS = 400
const LONG_TEXT_LINES = 6

interface Props {
  item: Item
  source: string
  time: string
  fresh: boolean
  onCopy: (text: string) => void
  onDelete: (id: string) => void
}

export function ItemCard({ item, source, time, fresh, onCopy, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const content = item.content ?? ''
  const isLink = item.kind === 'link' && isSafeHttpUrl(content)
  const isLong = content.length > LONG_TEXT_CHARS || content.split('\n').length > LONG_TEXT_LINES

  return (
    <li
      className={`rounded-2xl bg-white p-3.5 ring-1 transition-shadow duration-700 dark:bg-zinc-900 ${
        fresh ? 'ring-2 ring-indigo-500 shadow-md shadow-indigo-500/20' : 'ring-zinc-200 dark:ring-zinc-800'
      }`}
    >
      <p className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{source}</span> · {time}
      </p>

      {isLink ? (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-indigo-600 underline decoration-indigo-300 underline-offset-2 dark:text-indigo-400"
        >
          {content}
        </a>
      ) : item.kind === 'file' ? (
        <p className="text-sm text-zinc-500">File: {item.file_name} (file support arrives in Phase 2)</p>
      ) : (
        <p className={`break-words whitespace-pre-wrap ${isLong && !expanded ? 'line-clamp-6' : ''}`}>{content}</p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {isLink && (
          <a href={content} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'py-2')}>
            Open
          </a>
        )}
        {item.kind !== 'file' && (
          <Button variant={isLink ? 'secondary' : 'primary'} className="py-2" onClick={() => onCopy(content)}>
            Copy
          </Button>
        )}
        {isLong && !isLink && (
          <Button variant="ghost" className="py-2" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : 'Show more'}
          </Button>
        )}
        <Button variant="danger" className="ml-auto py-2" onClick={() => onDelete(item.id)} aria-label="Delete item">
          Delete
        </Button>
      </div>
    </li>
  )
}
