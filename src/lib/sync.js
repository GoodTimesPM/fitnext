// Phone and PC share one log through Supabase: one row per user holding the whole store as JSON.
// Each device pulls the row, merges it with what it has, keeps the result and pushes it back.
//
// Merging, so nothing logged on either device is lost:
//   lists with ids (workouts, recipes, foods...)  union by id, minus anything in `gone`
//   diary                                          per day, union of entries by id
//   body, water                                    per day; body fields combine, water takes the higher count
//   settings and goals                             whichever device changed them last
//
// Off until .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see supabase/schema.sql).
import { useStore } from '../store.js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const syncAvailable = !!(URL && KEY)

let client
const db = async () => {
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'fitnext-auth' } })
  }
  return client
}

// Sign in from an email, so there is no password to remember on either device. Supabase's stock
// email (the template can't be edited without your own mail server) holds a link, not a code:
// pasting the link works on any device, since its token signs in wherever it is pasted. Opening
// it instead lands on the hosted app (Supabase's Site URL), which signs that browser in from the
// tokens in the address. A 6-digit code works too, for a project whose template shows {{ .Token }}.
// A link works once, and each new email voids the one before.
const web = location.protocol === 'https:' && !window.Capacitor?.isNativePlatform?.()
export const sendCode = async email => {
  const { error } = await (await db()).auth.signInWithOtp({ email, options: { shouldCreateUser: true, ...(web && { emailRedirectTo: location.origin }) } })
  if (error) throw error
}
export const linkToken = text => {
  try {
    const u = new globalThis.URL(text)
    const token = u.searchParams.get('token') || u.searchParams.get('token_hash')
    return token ? { token_hash: token, type: 'email' } : null // 'email' covers magic link and sign-up alike
  } catch { return null }
}
export const verifyCode = async (email, input) => {
  const link = linkToken(input)
  const { error } = await (await db()).auth.verifyOtp(link || { email, token: input, type: 'email' })
  if (error) throw error
  return syncNow()
}
export const signOut = async () => { await (await db()).auth.signOut(); setStatus({ user: null }) }
const currentUser = async () => (syncAvailable ? (await (await db()).auth.getUser()).data.user : null)

// ---- the status the Settings card shows ----
const listeners = new Set()
let status = { user: null, at: +localStorage.getItem('fitnext-synced') || null, busy: false, error: null }
const setStatus = patch => { status = { ...status, ...patch }; listeners.forEach(f => f(status)) }
export const syncStatus = () => status
export const onSyncStatus = f => { listeners.add(f); return () => listeners.delete(f) }

// When this device last changed its settings or goals, so the newer side wins.
const STAMP = 'fitnext-prefs-at'
const prefsAt = () => +localStorage.getItem(STAMP) || 0
let applying = false
useStore.subscribe((s, prev) => {
  if (!applying && (s.settings !== prev.settings || s.goals !== prev.goals)) localStorage.setItem(STAMP, Date.now())
})

const SYNCED = ['settings', 'goals', 'workouts', 'routines', 'myPrograms', 'diary', 'water', 'savedFoods', 'grocery', 'lists', 'recipes', 'body', 'gone']
const idOf = x => x.id ?? x.key

function byId(a = [], b = [], gone) {
  const seen = new Map()
  for (const x of [...a, ...b]) if (!gone[idOf(x)] && !seen.has(idOf(x))) seen.set(idOf(x), x)
  return [...seen.values()]
}
function perDay(a = {}, b = {}, join) {
  const out = {}
  for (const d of new Set([...Object.keys(a), ...Object.keys(b)])) out[d] = d in a && d in b ? join(a[d], b[d]) : a[d] ?? b[d]
  return out
}

// local and remote: { settings, goals, workouts, ... }. Where both have the same item, this device's copy wins.
export function merge(local, remote, remotePrefsAt = 0) {
  if (!remote) return local
  const gone = { ...remote.gone, ...local.gone }
  const mine = prefsAt() >= remotePrefsAt
  const out = {
    gone,
    settings: mine ? local.settings : { ...local.settings, ...remote.settings },
    goals: mine ? local.goals : { ...local.goals, ...remote.goals },
    diary: perDay(local.diary, remote.diary, (x, y) => byId(x, y, gone)),
    body: perDay(local.body, remote.body, (x, y) => ({ ...y, ...x })),
    water: perDay(local.water, remote.water, (x, y) => Math.max(x, y)),
  }
  for (const k of ['workouts', 'routines', 'myPrograms', 'savedFoods', 'grocery', 'lists', 'recipes']) out[k] = byId(local[k], remote[k], gone)
  out.workouts.sort((x, y) => y.start - x.start)
  for (const d in out.diary) out.diary[d] = out.diary[d].filter(e => !gone[e.id])
  return out
}

let running = null
export function syncNow() {
  return (running ||= (async () => {
    setStatus({ busy: true, error: null })
    try {
      const sb = await db()
      const user = (await sb.auth.getUser()).data.user
      if (!user) { setStatus({ user: null }); return }
      const { data: row, error } = await sb.from('fitnext_state').select('data').eq('user_id', user.id).maybeSingle()
      if (error) throw error
      const s = useStore.getState()
      const remotePrefs = row?.data?.prefsAt || 0
      const merged = merge(Object.fromEntries(SYNCED.map(k => [k, s[k]])), row?.data, remotePrefs)
      applying = true
      useStore.setState(merged)
      applying = false
      if (remotePrefs > prefsAt()) localStorage.setItem(STAMP, remotePrefs)
      const { error: e2 } = await sb.from('fitnext_state').upsert({ user_id: user.id, data: { ...merged, prefsAt: prefsAt() }, updated_at: new Date().toISOString() })
      if (e2) throw e2
      const at = Date.now()
      localStorage.setItem('fitnext-synced', at)
      setStatus({ user: { email: user.email }, at })
    } catch (e) {
      setStatus({ error: e.message || String(e) })
    } finally {
      applying = false
      running = null
      setStatus({ busy: false })
    }
  })())
}

// Signed in: sync on start, when the app comes back into view, and a few seconds after a change.
let timer
export function startSync() {
  if (!syncAvailable) return
  currentUser().then(u => { if (u) { setStatus({ user: { email: u.email } }); syncNow() } }).catch(() => {})
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && status.user) syncNow() })
  useStore.subscribe((s, prev) => {
    if (applying || !status.user || !SYNCED.some(k => s[k] !== prev[k])) return
    clearTimeout(timer)
    timer = setTimeout(syncNow, 4000)
  })
}
