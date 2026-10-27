import { act, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

// Stand-ins for the two copy APIs jsdom lacks: navigator.clipboard and
// document.execCommand. setup.ts removes both after each test.

// How long a copy button shows "Copied" or "Copy it below" (AC13: 1.4 s).
// A literal on purpose, so the tests check the value rather than echo it.
export const RESET_MS = 1400

// The fallback textarea's accessible name.
export const FALLBACK_LABEL = 'Text to copy'

// The text the user would copy from a textarea right now.
export const selectedText = (box: HTMLTextAreaElement): string =>
  box.value.slice(box.selectionStart, box.selectionEnd)

// The AC7 share text, written out so tests state the format themselves.
export const expectedShareText = (
  head: string,
  links: { apple: string; spotify: string; ytm: string },
): string =>
  [
    head,
    '',
    `Apple Music: ${links.apple}`,
    `Spotify: ${links.spotify}`,
    `YouTube Music: ${links.ytm}`,
  ].join('\n')

// 'ok' resolves, 'blocked' rejects as a denied permission does, 'missing'
// leaves navigator.clipboard undefined as an insecure context does.
export type ClipboardOutcome = 'ok' | 'blocked' | 'missing'

export function stubClipboard(outcome: ClipboardOutcome) {
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {
    if (outcome === 'blocked') throw new DOMException('Write permission denied.', 'NotAllowedError')
  })
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: outcome === 'missing' ? undefined : { writeText },
  })
  return writeText
}

// execCommand('copy') returns true when it copied, false when the browser
// refused, or throws. The stand-in records the focused textarea's selected
// text at call time (the focused textarea, else the one with a selection),
// which is what the real command would copy.
export type ExecCommandOutcome = 'ok' | 'refused' | 'throws'

export function stubExecCommand(outcome: ExecCommandOutcome) {
  const selected: string[] = []
  const execCommand = vi.fn<(command: string) => boolean>(() => {
    const active = document.activeElement
    const box =
      active instanceof HTMLTextAreaElement
        ? active
        : Array.from(document.querySelectorAll('textarea')).find(
            (el) => el.selectionEnd > el.selectionStart,
          )
    selected.push(box ? selectedText(box) : '')
    if (outcome === 'throws') throw new Error('execCommand unsupported')
    return outcome === 'ok'
  })
  Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
  return Object.assign(execCommand, { selected })
}

export function resetClipboardStubs(): void {
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(document, 'execCommand')
}

// Clicks under fake timers and lets the copy promise chain finish without
// firing the label reset timer.
export async function clickAndSettle(el: Element): Promise<void> {
  await act(async () => {
    fireEvent.click(el)
    await vi.advanceTimersByTimeAsync(0)
  })
}

export async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}
