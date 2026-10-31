import { describe, expect, it } from 'vitest'
import {
  canThumbnail,
  extensionLabel,
  fileSizeProblem,
  formatBytes,
  MAX_FILE_BYTES,
  objectPaths,
  safeObjectName,
} from './files'

describe('formatBytes', () => {
  it('formats each unit', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(12 * 1024)).toBe('12 KB')
    expect(formatBytes(3.44 * 1024 * 1024)).toBe('3.4 MB')
    expect(formatBytes(MAX_FILE_BYTES)).toBe('50 MB')
    expect(formatBytes(2 * 1024 ** 3)).toBe('2 GB')
  })
})

describe('fileSizeProblem', () => {
  it('accepts files up to exactly 50 MB', () => {
    expect(fileSizeProblem({ name: 'a.zip', size: MAX_FILE_BYTES })).toBeNull()
    expect(fileSizeProblem({ name: 'empty.txt', size: 0 })).toBeNull()
  })

  it('explains why a bigger file is rejected', () => {
    expect(fileSizeProblem({ name: 'big.mp4', size: 72 * 1024 * 1024 })).toBe(
      '"big.mp4" is 72 MB. Beam\'s limit is 50 MB per file.',
    )
  })
})

describe('safeObjectName', () => {
  it('keeps simple names as they are', () => {
    expect(safeObjectName('report-2026_v2.pdf')).toBe('report-2026_v2.pdf')
  })

  it('replaces spaces and symbols and strips accents', () => {
    expect(safeObjectName('Café menu (final) #2.jpg')).toBe('Cafe_menu_final_2.jpg')
  })

  it('handles names with no usable characters', () => {
    expect(safeObjectName('照片.png')).toBe('file.png')
    expect(safeObjectName('')).toBe('file')
  })

  it('does not allow hidden files or path tricks', () => {
    expect(safeObjectName('../../etc/passwd')).toBe('etc_passwd')
    expect(safeObjectName('.env')).toBe('file.env')
  })

  it('caps the length but keeps the extension', () => {
    const name = safeObjectName(`${'a'.repeat(300)}.docx`)
    expect(name).toHaveLength(100)
    expect(name.endsWith('.docx')).toBe(true)
  })
})

describe('objectPaths', () => {
  it('nests everything under the user and item folders', () => {
    expect(objectPaths('user-1', 'item-9', 'My photo.jpg')).toEqual({
      filePath: 'user-1/item-9/My_photo.jpg',
      thumbPath: 'user-1/item-9/thumb.jpg',
    })
  })
})

describe('canThumbnail / extensionLabel', () => {
  it('only thumbnails common decodable images', () => {
    expect(canThumbnail('image/jpeg')).toBe(true)
    expect(canThumbnail('image/png')).toBe(true)
    expect(canThumbnail('image/heic')).toBe(false)
    expect(canThumbnail('image/svg+xml')).toBe(false)
    expect(canThumbnail('application/pdf')).toBe(false)
    expect(canThumbnail('')).toBe(false)
  })

  it('labels files by short extension', () => {
    expect(extensionLabel('notes.pdf')).toBe('PDF')
    expect(extensionLabel('archive.tar.gz')).toBe('GZ')
    expect(extensionLabel('README')).toBe('FILE')
    expect(extensionLabel('weird.extension')).toBe('FILE')
  })
})
