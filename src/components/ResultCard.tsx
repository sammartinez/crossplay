import { useId, useRef } from 'react'
import {
  APP_LINK_CLASS,
  ARTIST_CLASS,
  ARTIST_PICKER_LABEL,
  CANDIDATES_CLASS,
  CANDIDATE_SEPARATOR,
  CARD_CLASS,
  COPY_LABEL,
  FALLBACK_TEXTAREA_LABEL,
  FALLBACK_TEXTAREA_ROWS,
  GHOST_BUTTON_CLASS,
  PLATFORMS,
  PLATFORM_SPOTIFY,
  SHARE_BUTTON_CLASS,
  SHARE_LABEL,
  SPOTIFY_APP_SEARCH_LABEL,
  TAG_CLASS,
  TAG_EXACT,
  TAG_EXACT_CLASS,
  TAG_LIKELY,
  TAG_LIKELY_CLASS,
  TAG_SEARCH,
  TITLE_CLASS,
  TRACK_CLASS,
} from '../constants'
import { shareText } from '../lib/share'
import type { ArtistCandidate, Conversion, Platform } from '../lib/types'
import CopyButton from './CopyButton'

type Props = { conversion: Conversion; onChooseArtist(candidate: ArtistCandidate): void }

function rowTag({ exact, likely }: Conversion, key: Platform) {
  const [className, text] = exact[key]
    ? [TAG_EXACT_CLASS, TAG_EXACT]
    : likely[key]
      ? [TAG_LIKELY_CLASS, TAG_LIKELY]
      : [TAG_CLASS, TAG_SEARCH]
  return <span className={className}>{text}</span>
}

export default function ResultCard({ conversion, onChooseArtist }: Props) {
  const { title, artist, art, links, candidates, spotifyAppSearch } = conversion
  const pickerLabelId = useId()
  const fallbackRef = useRef<HTMLTextAreaElement>(null)

  return (
    <section className={CARD_CLASS}>
      <div className={TRACK_CLASS}>
        {art && <img src={art} alt="" />}
        <div>
          <div className={TITLE_CLASS}>{title}</div>
          <div className={ARTIST_CLASS}>{artist}</div>
        </div>
      </div>
      <ul>
        {PLATFORMS.map(({ key, name }) => (
          <li key={key}>
            <a href={links[key]} target="_blank" rel="noopener">
              {name}
            </a>
            {rowTag(conversion, key)}
            {key === PLATFORM_SPOTIFY && spotifyAppSearch && (
              <a href={spotifyAppSearch} className={APP_LINK_CLASS}>
                {SPOTIFY_APP_SEARCH_LABEL}
              </a>
            )}
            <CopyButton
              text={links[key]}
              label={COPY_LABEL}
              className={GHOST_BUTTON_CLASS}
              fallbackRef={fallbackRef}
            />
          </li>
        ))}
      </ul>
      {candidates?.length ? (
        <div className={CANDIDATES_CLASS} role="group" aria-labelledby={pickerLabelId}>
          <span id={pickerLabelId}>{ARTIST_PICKER_LABEL}</span>
          {candidates.map((candidate) => (
            <button
              key={candidate.artist}
              type="button"
              aria-pressed={candidate.artist === artist}
              onClick={() => onChooseArtist(candidate)}
            >
              {`${candidate.artist}${CANDIDATE_SEPARATOR}${candidate.title}`}
            </button>
          ))}
        </div>
      ) : null}
      <CopyButton
        text={shareText(conversion)}
        label={SHARE_LABEL}
        className={SHARE_BUTTON_CLASS}
        fallbackRef={fallbackRef}
      />
      <textarea
        ref={fallbackRef}
        rows={FALLBACK_TEXTAREA_ROWS}
        readOnly
        hidden
        aria-label={FALLBACK_TEXTAREA_LABEL}
      />
    </section>
  )
}
