import { COPY_COMMAND, COPY_RESULT_COPIED, COPY_RESULT_MANUAL } from '../constants'

export type CopyResult = typeof COPY_RESULT_COPIED | typeof COPY_RESULT_MANUAL

// A throw means the browser can't copy this way, the same as returning false.
function execCopy(): boolean {
  try {
    return document.execCommand(COPY_COMMAND)
  } catch {
    return false
  }
}

// The box stays shown, focused and selected on 'manual' so the user can copy by hand.
export async function copyText(text: string, fallbackBox: HTMLTextAreaElement): Promise<CopyResult> {
  fallbackBox.hidden = true
  try {
    // Rejects when permission is denied; throws a TypeError when
    // navigator.clipboard is undefined outside a secure context.
    await navigator.clipboard.writeText(text)
    return COPY_RESULT_COPIED
  } catch {
    fallbackBox.value = text
    fallbackBox.hidden = false
    fallbackBox.select()
    if (execCopy()) {
      fallbackBox.hidden = true
      return COPY_RESULT_COPIED
    }
    fallbackBox.focus()
    return COPY_RESULT_MANUAL
  }
}
