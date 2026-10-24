import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { APP_ROOT_ID } from './constants'
import { applyTheme, readStoredTheme } from './lib/theme'
import './styles.css'

// Before the first render, so a saved choice shows without a flash of the system theme.
applyTheme(readStoredTheme())

createRoot(document.getElementById(APP_ROOT_ID)!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
