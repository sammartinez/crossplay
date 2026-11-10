import { useEffect, useRef, useState } from 'react'
import ConvertForm from './components/ConvertForm'
import ResultCard from './components/ResultCard'
import ThemeToggle from './components/ThemeToggle'
import {
  APP_NAME,
  APP_SUBTITLE,
  BUSY_CLASS,
  FADER_CLASS,
  MESSAGE_CLASS,
  MESSAGE_ERROR_CLASS,
  SHARE_URL_PARAM,
  STATUS_BUSY,
  SUBTITLE_CLASS,
} from './constants'
import { useConversion } from './hooks/useConversion'

export default function App() {
  const { status, conversion, message, isError, convert, chooseArtist } = useConversion()
  const busy = status === STATUS_BUSY
  const [sharedLink] = useState(
    () => new URLSearchParams(location.search).get(SHARE_URL_PARAM) ?? undefined,
  )
  // StrictMode runs effects twice on mount; the ref keeps it to one conversion.
  const sharedLinkConverted = useRef(false)

  useEffect(() => {
    if (!sharedLink || sharedLinkConverted.current) return
    sharedLinkConverted.current = true
    convert(sharedLink)
  }, [sharedLink, convert])

  return (
    <main className={busy ? BUSY_CLASS : undefined}>
      <header>
        <div>
          <h1>{APP_NAME}</h1>
          <p className={SUBTITLE_CLASS}>{APP_SUBTITLE}</p>
        </div>
        <ThemeToggle />
      </header>
      <ConvertForm busy={busy} initialValue={sharedLink} onConvert={convert} />
      <div className={FADER_CLASS} aria-hidden />
      <p className={isError ? MESSAGE_ERROR_CLASS : MESSAGE_CLASS} role="status">
        {message}
      </p>
      {conversion && <ResultCard conversion={conversion} onChooseArtist={chooseArtist} />}
    </main>
  )
}
