import { describe, expect, it } from 'vitest'
import { numberedName } from './download'

describe('numberedName', () => {
  it('numbers names the way Windows does when a file already exists', () => {
    expect(numberedName('photo.jpg', 0)).toBe('photo.jpg')
    expect(numberedName('photo.jpg', 1)).toBe('photo (1).jpg')
    expect(numberedName('archive.tar.gz', 2)).toBe('archive.tar (2).gz')
    expect(numberedName('README', 3)).toBe('README (3)')
    expect(numberedName('.env', 1)).toBe('.env (1)')
  })

  it('replaces characters a folder will not accept', () => {
    expect(numberedName('a:b?c*.txt', 0)).toBe('a_b_c_.txt')
    expect(numberedName('  ', 0)).toBe('download')
  })
})
