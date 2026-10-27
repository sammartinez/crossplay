import { GHOST_BUTTON_CLASS, THEME_TOGGLE_LABEL } from '../constants'
import { applyTheme, nextTheme, shownTheme } from '../lib/theme'

export default function ThemeToggle() {
  return (
    <button
      className={GHOST_BUTTON_CLASS}
      type="button"
      onClick={() => applyTheme(nextTheme(shownTheme()))}
    >
      {THEME_TOGGLE_LABEL}
    </button>
  )
}
