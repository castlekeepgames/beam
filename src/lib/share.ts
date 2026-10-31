import { parseSingleUrl } from './links'

/**
 * Turn the title/text/url fields from Android's share sheet into what Beam
 * sends. Apps fill these inconsistently (Chrome usually puts the page URL in
 * `text` and the page title in `title`), so a lone URL wins and becomes a link;
 * the title is only used when there's nothing else. Null if there's no text.
 */
export function composeSharedText(fields: { title?: string; text?: string; url?: string }): string | null {
  const title = fields.title?.trim() ?? ''
  const text = fields.text?.trim() ?? ''
  const url = fields.url?.trim() ?? ''

  if (url) {
    if (!text || text === url || parseSingleUrl(text) === url) return url
    return text.includes(url) ? text : `${text}\n${url}`
  }
  if (text) return text
  return title || null
}
