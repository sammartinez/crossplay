import { type RefObject, useEffect, useRef, useState } from 'react'
import { COPIED_LABEL, COPY_MANUAL_LABEL, COPY_RESET_MS, COPY_RESULT_COPIED } from '../constants'
import { copyText } from '../lib/clipboard'

type Props = {
  text: string
  label: string
  className?: string
  fallbackRef: RefObject<HTMLTextAreaElement | null>
}

export default function CopyButton({ text, label, className, fallbackRef }: Props) {
  const [outcomeLabel, setOutcomeLabel] = useState<string | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(resetTimer.current), [])

  const copy = async () => {
    // The fallback textarea renders alongside the button, so the ref is set by any click.
    const result = await copyText(text, fallbackRef.current!)
    setOutcomeLabel(result === COPY_RESULT_COPIED ? COPIED_LABEL : COPY_MANUAL_LABEL)
    clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setOutcomeLabel(null), COPY_RESET_MS)
  }

  return (
    <button className={className} type="button" onClick={copy}>
      {outcomeLabel ?? label}
    </button>
  )
}
