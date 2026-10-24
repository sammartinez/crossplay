import { useId, useRef } from 'react'
import {
  APP_LINK_CLASS,
  ARTIST_PICKER_LABEL,
  CANDIDATE_SEPARATOR,
  COPY_LABEL,
  FALLBACK_TEXTAREA_LABEL,
  FALLBACK_TEXTAREA_ROWS,
  PLATFORMS,
  PLATFORM_SPOTIFY,
  SHARE_LABEL,
  SPOTIFY_APP_SEARCH_LABEL,
  TAG_EXACT,
  TAG_SEARCH,
} from '../constants'
import { shareText } from '../lib/share'
import type { ArtistCandidate, Conversion } from '../lib/types'
import CopyButton from './CopyButton'

type Props = { conversion: Conversion; onChooseArtist(candidate: ArtistCandidate): void }

export default function ResultCard({ conversion, onChooseArtist }: Props) {
  const { title, artist, art, links, exact, candidates, spotifyAppSearch } = conversion
  const pickerLabelId = useId()
  const fallbackRef = useRef<HTMLTextAreaElement>(null)

  return (
    <section className="card">
      <div className="track">
        {art && <img src={art} alt="" />}
        <div>
          <div className="title">{title}</div>
          <div className="artist">{artist}</div>
        </div>
      </div>
      <ul>
        {PLATFORMS.map(({ key, name }) => (
          <li key={key}>
            <a href={links[key]} target="_blank" rel="noopener">
              {name}
            </a>
            <span className={exact[key] ? 'tag exact' : 'tag'}>
              {exact[key] ? TAG_EXACT : TAG_SEARCH}
            </span>
            {key === PLATFORM_SPOTIFY && spotifyAppSearch && (
              <a href={spotifyAppSearch} className={APP_LINK_CLASS}>
                {SPOTIFY_APP_SEARCH_LABEL}
              </a>
            )}
            <CopyButton
              text={links[key]}
              label={COPY_LABEL}
              className="ghost"
              fallbackRef={fallbackRef}
            />
          </li>
        ))}
      </ul>
      {candidates?.length ? (
        <div className="candidates" role="group" aria-labelledby={pickerLabelId}>
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
        className="share"
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
