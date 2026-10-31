export type ItemKind = 'text' | 'link' | 'file'

export interface Item {
  id: string
  kind: ItemKind
  content: string | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  thumb_path: string | null
  source_device_id: string | null
  created_at: string
  expires_at: string
  /** Exempt from the 24-hour expiry. */
  kept: boolean
  /** Sent by someone else through a Receive QR code. */
  from_guest: boolean
}

export const ITEM_COLUMNS =
  'id, kind, content, file_path, file_name, file_size, mime_type, thumb_path, source_device_id, created_at, expires_at, kept, from_guest'

export interface Device {
  id: string
  name: string
}

export const DEVICE_COLUMNS = 'id, name'
