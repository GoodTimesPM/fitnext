import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { applyTheme } from './themes.js'
import { useStore } from './store.js'
import { startSync } from './lib/sync.js'
import './styles.css'

const { theme, custom } = useStore.getState().settings
applyTheme(theme, custom)
useStore.subscribe((s, prev) => {
  if (s.settings.theme !== prev.settings.theme || s.settings.custom !== prev.settings.custom) applyTheme(s.settings.theme, s.settings.custom)
})

createRoot(document.getElementById('root')).render(<App />)
startSync()

// The hosted web app works offline once installed. Not in the desktop app (fitnext: scheme),
// the phone apps (they ship the files already) or the dev server.
if (import.meta.env.PROD && location.protocol === 'https:' && !window.Capacitor?.isNativePlatform?.() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
