import { ALT_SEPARATOR, PLATFORMS, TAG_EXACT, TAG_SEARCH, WRONG_MATCH_LABEL } from '../constants'
import type { AppleAlt, Conversion } from '../lib/types'

type Props = { conversion: Conversion; onChooseAlt(alt: AppleAlt): void }

export default function ResultCard({ conversion, onChooseAlt }: Props) {
  const { title, artist, art, links, exact } = conversion
  // The first alternate is the current Apple link.
  const otherAlts = (conversion.alts || []).slice(1)

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
    </section>
  )
}
