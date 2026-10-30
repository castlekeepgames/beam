export type ItemKind = 'text' | 'link' | 'file'

export interface Item {
  id: string
  kind: ItemKind
  content: string | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  source_device_id: string | null
  created_at: string
  expires_at: string
}

export const ITEM_COLUMNS =
  'id, kind, content, file_path, file_name, file_size, mime_type, source_device_id, created_at, expires_at'

export interface Device {
  id: string
  name: string
}

export const DEVICE_COLUMNS = 'id, name'
