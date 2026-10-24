import { useRef } from 'react'
import {
  ALT_SEPARATOR,
  COPY_LABEL,
  FALLBACK_TEXTAREA_LABEL,
  FALLBACK_TEXTAREA_ROWS,
  PLATFORMS,
  SHARE_LABEL,
  TAG_EXACT,
  TAG_SEARCH,
  WRONG_MATCH_LABEL,
} from '../constants'
import { shareText } from '../lib/share'
import type { AppleAlt, Conversion } from '../lib/types'
import CopyButton from './CopyButton'

type Props = { conversion: Conversion; onChooseAlt(alt: AppleAlt): void }

export default function ResultCard({ conversion, onChooseAlt }: Props) {
  const { title, artist, art, links, exact } = conversion
  // The first alternate is the current Apple link.
  const otherAlts = (conversion.alts || []).slice(1)
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
            <CopyButton
              text={links[key]}
              label={COPY_LABEL}
              className="ghost"
              fallbackRef={fallbackRef}
            />
          </li>
        ))}
      </ul>
      {otherAlts.length > 0 && (
        <div className="alts">
          <span>{WRONG_MATCH_LABEL}</span>
          {otherAlts.map((alt) => (
            <button key={alt.url} type="button" onClick={() => onChooseAlt(alt)}>
              {`${alt.title}${ALT_SEPARATOR}${alt.artist}`}
            </button>
          ))}
        </div>
      )}
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
