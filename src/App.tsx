import ThemeToggle from './components/ThemeToggle'
import { APP_NAME, APP_SUBTITLE } from './constants'

export default function App() {
  return (
    <main>
      <header>
        <div>
          <h1>{APP_NAME}</h1>
          <p className="sub">{APP_SUBTITLE}</p>
        </div>
        <ThemeToggle />
      </header>
      {/* T4 adds the convert form and status line here, and the result card below. */}
    </main>
  )
}
