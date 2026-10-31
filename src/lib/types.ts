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
  /** Meant for one device only (null = all devices). */
  target_device_id: string | null
}

export const ITEM_COLUMNS =
  'id, kind, content, file_path, file_name, file_size, mime_type, thumb_path, source_device_id, created_at, expires_at, kept, from_guest, target_device_id'

export interface Device {
  id: string
  name: string
}

/** A device as shown in the devices list. */
export interface DeviceInfo extends Device {
  last_seen: string
  /** Notifications are on for this device. */
  has_push: boolean
}

export const DEVICE_COLUMNS = 'id, name'
