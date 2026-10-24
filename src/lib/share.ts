import { LINE_BREAK, PLATFORMS, SHARE_LABEL_SEPARATOR, TITLE_ARTIST_SEPARATOR } from '../constants'
import type { Conversion } from './types'

export function shareText({
  title,
  artist,
  links,
}: Pick<Conversion, 'title' | 'artist' | 'links'>): string {
  const head = artist ? `${title}${TITLE_ARTIST_SEPARATOR}${artist}` : title
  const lines = PLATFORMS.map(({ key, name }) => `${name}${SHARE_LABEL_SEPARATOR}${links[key]}`)
  return [head, '', ...lines].join(LINE_BREAK)
}
