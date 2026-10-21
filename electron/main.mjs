// FitNext desktop: one window, no browser. The built app (dist/) and the API (server/proxy.mjs)
// are both answered in-process under fitnext://app, so there is no server or port to start.
//
//   npm run app        build, then open the window from source
//   npm run desktop    build the exe and put a FitNext shortcut on the desktop

import { app, BrowserWindow, net, protocol, session, shell } from 'electron'
import updater from 'electron-updater'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(here, '..', 'dist')

// The origin must never change: localStorage (every workout and diary entry) is keyed to it.
protocol.registerSchemesAsPrivileged([{ scheme: 'fitnext', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }])

// API keys. First .env found wins: FITNEXT_ENV, beside the exe, the project folder this build
// came from (electron/home.json, written by scripts/build-desktop.mjs), then %APPDATA%\FitNext.
function envFile() {
  let home = path.join(here, '..')
  try { home = JSON.parse(fs.readFileSync(path.join(here, 'home.json'), 'utf8')).app } catch { /* running from source */ }
  const candidates = [process.env.FITNEXT_ENV, path.join(path.dirname(process.execPath), '.env'), path.join(home, '.env'), path.join(app.getPath('userData'), '.env')]
  return candidates.find(f => f && fs.existsSync(f))
}

// One data folder whether run from source (package name "fitnext") or as the exe ("FitNext").
app.setPath('userData', path.join(app.getPath('appData'), 'FitNext'))

if (!app.requestSingleInstanceLock()) app.quit()
app.setAppUserModelId('com.jordangaskins.fitnext')

let win
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })

app.whenReady().then(async () => {
  const env = envFile()
  if (env) process.loadEnvFile(env)
  const { api } = await import(pathToFileURL(path.join(here, '..', 'server', 'proxy.mjs')).href) // after the keys are loaded

  protocol.handle('fitnext', async req => {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/api/')) {
      const body = req.method === 'POST' ? await req.json().catch(() => ({})) : null
      const out = await api(req.method, url.pathname, url.searchParams, body)
      return new Response(JSON.stringify(out.body), { status: out.code, headers: { 'content-type': 'application/json' } })
    }
    let file = path.join(dist, decodeURIComponent(url.pathname))
    if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html')
    return net.fetch(pathToFileURL(file).href)
  })

  // Camera (barcode, meal photos) and microphone (voice logging).
  session.defaultSession.setPermissionRequestHandler((_, permission, done) => done(permission === 'media'))

  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 560,
    title: 'FitNext', backgroundColor: '#edf2f8', autoHideMenuBar: true, show: false,
    icon: path.join(here, 'icon.png'),
  })
  win.once('ready-to-show', () => win.show())
  // Links to other sites (food source credits, recipes) open in the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('fitnext:')) { e.preventDefault(); shell.openExternal(url) } })
  win.loadURL('fitnext://app/')

  // Installed copies (npm run installer) check the GitHub releases and update on the next quit.
  // The unpacked dev build has no app-update.yml, so it skips this.
  if (app.isPackaged && fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'))) {
    updater.autoUpdater.checkForUpdatesAndNotify().catch(e => console.error('update check:', e.message))
  }
})

app.on('window-all-closed', () => app.quit())
