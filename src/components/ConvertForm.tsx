import { useRef } from 'react'
import { CONVERT_LABEL, INPUT_LABEL, INPUT_PLACEHOLDER } from '../constants'

type Props = { busy: boolean; initialValue?: string; onConvert(raw: string): void }

export default function ConvertForm({ busy, initialValue, onConvert }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const convertInput = () => onConvert(inputRef.current!.value)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        convertInput()
      }}
    >
      <input
        ref={inputRef}
        type="url"
        placeholder={INPUT_PLACEHOLDER}
        aria-label={INPUT_LABEL}
        defaultValue={initialValue}
        autoComplete="off"
        required
        // The paste event fires before the pasted text is in the input.
        onPaste={() => setTimeout(convertInput)}
      />
      <button className="primary" type="submit" disabled={busy}>
        {CONVERT_LABEL}
      </button>
    </form>
  )
}
