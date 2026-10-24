import { useRef } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CopyButton from './CopyButton'
import {
  FALLBACK_LABEL,
  RESET_MS,
  advance,
  clickAndSettle,
  stubClipboard,
  stubExecCommand,
} from '../test/clipboard'

// AC13: the button copies its text, reads "Copied" or "Copy it below", then
// goes back to its label after 1.4 s.

const TEXT = 'https://open.spotify.com/track/abc'

function Harness({ label = 'Copy', className }: { label?: string; className?: string }) {
  const fallbackRef = useRef<HTMLTextAreaElement>(null!)
  return (
    <>
      <CopyButton text={TEXT} label={label} className={className} fallbackRef={fallbackRef} />
      <textarea ref={fallbackRef} readOnly hidden aria-label={FALLBACK_LABEL} />
    </>
  )
}

const button = () => screen.getByRole('button')

beforeEach(() => {
  vi.useFakeTimers()
})

describe('CopyButton', () => {
  it('shows its label', () => {
    stubClipboard('ok')
    render(<Harness label="Copy share text" />)
    expect(button().textContent).toBe('Copy share text')
  })

  it('takes the given class name', () => {
    stubClipboard('ok')
    render(<Harness className="share" />)
    expect(button()).toHaveClass('share')
  })

  it('copies its text with navigator.clipboard when clicked', async () => {
    const writeText = stubClipboard('ok')
    render(<Harness />)
    await clickAndSettle(button())
    expect(writeText).toHaveBeenCalledWith(TEXT)
  })

  it('reads "Copied" after the clipboard copy', async () => {
    stubClipboard('ok')
    render(<Harness />)
    await clickAndSettle(button())
    expect(button().textContent).toBe('Copied')
  })

  it('still reads "Copied" just before 1.4 s', async () => {
    stubClipboard('ok')
    render(<Harness />)
    await clickAndSettle(button())
    await advance(RESET_MS - 1)
    expect(button().textContent).toBe('Copied')
  })

  it('goes back to its label after 1.4 s', async () => {
    stubClipboard('ok')
    render(<Harness label="Copy share text" />)
    await clickAndSettle(button())
    await advance(RESET_MS)
    expect(button().textContent).toBe('Copy share text')
  })

  it('reads "Copied" when the clipboard is blocked and execCommand copies', async () => {
    stubClipboard('blocked')
    stubExecCommand('ok')
    render(<Harness />)
    await clickAndSettle(button())
    expect(button().textContent).toBe('Copied')
  })

  it('reads "Copy it below" when the clipboard is blocked and execCommand fails', async () => {
    stubClipboard('blocked')
    stubExecCommand('refused')
    render(<Harness />)
    await clickAndSettle(button())
    expect(button().textContent).toBe('Copy it below')
  })

  it('goes back to its label 1.4 s after "Copy it below"', async () => {
    stubClipboard('blocked')
    stubExecCommand('refused')
    render(<Harness />)
    await clickAndSettle(button())
    await advance(RESET_MS)
    expect(button().textContent).toBe('Copy')
  })
})
