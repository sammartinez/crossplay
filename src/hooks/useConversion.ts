import { useCallback, useEffect, useRef, useState } from 'react'
import {
  INVALID_LINK_MESSAGE,
  LOOKING_UP_MESSAGE,
  NOT_FOUND_MESSAGE,
  PLATFORM_SPOTIFY,
  SHARE_URL_PARAM,
  SHORT_LINK_MESSAGE,
  STATUS_BUSY,
  STATUS_DONE,
  STATUS_ERROR,
  STATUS_IDLE,
} from '../constants'
import { lookupLink } from '../lib/api'
import { withArtistChoice } from '../lib/links'
import { parseLink } from '../lib/parse'
import type { ArtistCandidate, Conversion, ParsedLink } from '../lib/types'
import { withParams } from '../lib/url'

type Status = typeof STATUS_IDLE | typeof STATUS_BUSY | typeof STATUS_DONE | typeof STATUS_ERROR

// isError is separate from status: invalid input during a lookup shows its
// error while the lookup stays busy.
type ConversionState = {
  status: Status
  conversion: Conversion | null
  message: string
  isError: boolean
}

const failed = (message: string): ConversionState => ({
  status: STATUS_ERROR,
  conversion: null,
  message,
  isError: true,
})

const failureMessage = (parsed: ParsedLink): string =>
  parsed.src === PLATFORM_SPOTIFY && !parsed.kind ? SHORT_LINK_MESSAGE : NOT_FOUND_MESSAGE

export function useConversion() {
  const [state, setState] = useState<ConversionState>({
    status: STATUS_IDLE,
    conversion: null,
    message: '',
    isError: false,
  })
  // busyLink is set while the latest lookup runs, so a paste followed by
  // Convert on the same link doesn't start a second one.
  // mounted drops results that land after unmount, so they don't rewrite the page URL.
  const latest = useRef<{ runId: number; busyLink: string | null; mounted: boolean }>({
    runId: 0,
    busyLink: null,
    mounted: false,
  })

  useEffect(() => {
    const run = latest.current
    run.mounted = true
    return () => {
      run.mounted = false
    }
  }, [])

  const convert = useCallback((raw: string) => {
    const parsed = parseLink(raw)
    if (!parsed) {
      const running = latest.current.busyLink !== null
      setState((s) => ({
        ...failed(INVALID_LINK_MESSAGE),
        status: running ? s.status : STATUS_ERROR,
      }))
      return
    }
    if (parsed.link === latest.current.busyLink) return
    const runId = ++latest.current.runId
    latest.current.busyLink = parsed.link
    setState((s) => ({ ...s, status: STATUS_BUSY, message: LOOKING_UP_MESSAGE, isError: false }))
    lookupLink(parsed).then(({ conversion, parsed: looked }) => {
      if (runId !== latest.current.runId || !latest.current.mounted) return
      latest.current.busyLink = null
      if (!conversion) {
        setState(failed(failureMessage(looked)))
        return
      }
      setState({ status: STATUS_DONE, conversion, message: '', isError: false })
      const shareUrl = withParams(location.pathname, { [SHARE_URL_PARAM]: looked.link })
      history.replaceState(null, '', shareUrl)
    })
  }, [])

  const chooseArtist = useCallback((candidate: ArtistCandidate) => {
    setState((s) =>
      s.conversion ? { ...s, conversion: withArtistChoice(s.conversion, candidate) } : s,
    )
  }, [])

  return { ...state, convert, chooseArtist }
}
