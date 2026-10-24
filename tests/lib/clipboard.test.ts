import { afterEach, describe, expect, it } from 'vitest'
import { copyText } from '../../src/lib/clipboard'
import { selectedText, stubClipboard, stubExecCommand } from '../support/clipboard'

// AC13: copy with navigator.clipboard, fall back to execCommand('copy') from
// the textarea, and leave the text selected for a manual copy when both fail.

const TEXT = 'Song — Artist\n\nApple Music: https://music.apple.com/us/album/x/1?i=2'

const boxes: HTMLTextAreaElement[] = []

function fallbackBox(): HTMLTextAreaElement {
  const box = document.createElement('textarea')
  box.readOnly = true
  box.hidden = true
  document.body.append(box)
  boxes.push(box)
  return box
}

afterEach(() => {
  boxes.splice(0).forEach((box) => box.remove())
})

describe('copyText', () => {
  it('writes the text to navigator.clipboard and returns "copied"', async () => {
    const writeText = stubClipboard('ok')
    stubExecCommand('ok')
    await expect(copyText(TEXT, fallbackBox())).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(TEXT)
  })

  it('does not fall back to execCommand when the clipboard write succeeds', async () => {
    stubClipboard('ok')
    const execCommand = stubExecCommand('ok')
    await copyText(TEXT, fallbackBox())
    expect(execCommand).not.toHaveBeenCalled()
  })

  it('runs execCommand("copy") on the text in the box when the clipboard is blocked', async () => {
    stubClipboard('blocked')
    const execCommand = stubExecCommand('ok')
    await copyText(TEXT, fallbackBox())
    expect(execCommand).toHaveBeenCalledTimes(1)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(execCommand.selected).toEqual([TEXT])
  })

  it('returns "copied" when the clipboard is blocked and execCommand copies', async () => {
    stubClipboard('blocked')
    stubExecCommand('ok')
    await expect(copyText(TEXT, fallbackBox())).resolves.toBe('copied')
  })

  it('falls back to execCommand when navigator.clipboard is missing', async () => {
    stubClipboard('missing')
    const execCommand = stubExecCommand('ok')
    await expect(copyText(TEXT, fallbackBox())).resolves.toBe('copied')
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(execCommand.selected).toEqual([TEXT])
  })

  it('returns "manual" when the clipboard is blocked and execCommand refuses', async () => {
    stubClipboard('blocked')
    stubExecCommand('refused')
    await expect(copyText(TEXT, fallbackBox())).resolves.toBe('manual')
  })

  it('returns "manual" when the clipboard is blocked and execCommand throws', async () => {
    stubClipboard('blocked')
    stubExecCommand('throws')
    await expect(copyText(TEXT, fallbackBox())).resolves.toBe('manual')
  })

  it('leaves the whole text selected in the box for a manual copy', async () => {
    stubClipboard('blocked')
    stubExecCommand('refused')
    const box = fallbackBox()
    await copyText(TEXT, box)
    expect(box).toHaveValue(TEXT)
    expect(selectedText(box)).toBe(TEXT)
  })

  it('replaces text left in the box by an earlier manual copy', async () => {
    stubClipboard('blocked')
    stubExecCommand('refused')
    const box = fallbackBox()
    await copyText('earlier text', box)
    await copyText(TEXT, box)
    expect(box).toHaveValue(TEXT)
    expect(selectedText(box)).toBe(TEXT)
  })
})
