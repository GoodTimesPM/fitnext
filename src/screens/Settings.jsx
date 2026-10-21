import { useEffect, useRef, useState } from 'react'
import { Icon, NumInput, Top, back } from '../components/ui.jsx'
import { THEMES, customTheme, hsl, toHsl } from '../themes.js'
import { SOURCES, apiStatus } from '../lib/food.js'
import { onSyncStatus, sendCode, signOut, syncAvailable, syncNow, syncStatus, verifyCode } from '../lib/sync.js'
import { useStore } from '../store.js'

export default function Settings() {
  const { settings, setSetting, goals, setGoal } = useStore()
  const [status, setStatus] = useState(null)
  useEffect(() => { apiStatus().then(setStatus) }, [])
  const sources = [...Object.entries(SOURCES), ['spoonacular', { name: 'Spoonacular', note: 'Recipes' }], ['gemini', { name: 'Gemini', note: 'Photo logging, voice parsing' }]]

  return (
    <>
      <Top eyebrow="Account" title="Settings" onBack={() => back('today')} />

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Profile</h2>
        <div className="stack">
          <label className="small mu">Name<input value={settings.name} onChange={e => setSetting('name', e.target.value)} placeholder="What should we call you?" /></label>
          <div className="row">
            <div style={{ flex: 1 }}><div className="small mu" style={{ marginBottom: 4 }}>Units</div>
              <div className="seg">{['kg', 'lb'].map(u => <button key={u} className={settings.unit === u ? 'on' : ''} onClick={() => setSetting('unit', u)}>{u}</button>)}</div></div>
            <div style={{ flex: 1 }}><div className="small mu" style={{ marginBottom: 4 }}>Body map</div>
              <div className="seg">{['male', 'female'].map(f => <button key={f} className={settings.figure === f ? 'on' : ''} onClick={() => setSetting('figure', f)} style={{ textTransform: 'capitalize' }}>{f}</button>)}</div></div>
          </div>
          <label className="small mu">Rest timer (seconds)<NumInput value={settings.restSec} onValue={v => v > 0 && setSetting('restSec', v)} /></label>
        </div>
      </div>

      <ThemePicker />

      <CustomColors />

      <SyncCard />

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Daily goals</h2>
        <div className="grid2">
          {[['kcal', 'Calories'], ['p', 'Protein (g)'], ['c', 'Carbs (g)'], ['f', 'Fat (g)'], ['water', 'Water (glasses)']].map(([k, l]) => (
            <label key={k} className="small mu">{l}<NumInput value={goals[k]} onValue={v => setGoal(k, v)} /></label>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 4 }}>Data sources</h2>
        <p className="small mu" style={{ marginTop: 0 }}>Keys live in the server's .env, never in the app. A source without a key is hidden.</p>
        {sources.map(([id, s]) => {
          const on = id === 'off' || status?.[id]
          return (
            <div key={id} className="row sb" style={{ padding: '8px 0', borderTop: '1px solid var(--ln)' }}>
              <div><div>{s.name}</div><div className="small mu">{s.note}</div></div>
              <span className={'pill' + (on ? ' pr' : '')}>{status === null ? '…' : on ? 'On' : 'No key'}</span>
            </div>
          )
        })}
      </div>

      <p className="small mu" style={{ textAlign: 'center' }}>
        FitNext is free software under the AGPL-3.0. Exercise text: openGym and ExerciseDB. Animations: Open Exercise Figures (CC0).
        Body map: MuscleMap. Food data: Open Food Facts (ODbL), USDA FoodData Central.
      </p>
    </>
  )
}

// Presets and saved custom themes, two rows at a time. The dots on the right page through them;
// so do the arrows and the mouse wheel over the grid.
function ThemePicker() {
  const { settings, setSetting } = useStore()
  const custom = settings.custom
  const saved = settings.savedThemes || []
  const items = [
    ...saved.map(x => ({ ...customTheme(x), id: x.id, name: x.name, saved: x })),
    ...THEMES,
  ]
  const isOn = t => (t.saved ? custom?.on && custom.id === t.id : !custom?.on && settings.theme === t.id)
  const pick = t => {
    if (t.saved) setSetting('custom', { on: true, id: t.id, bg: t.saved.bg, ac: t.saved.ac })
    else { setSetting('theme', t.id); if (custom?.on) setSetting('custom', { ...custom, on: false }) }
  }
  const remove = id => setSetting('savedThemes', saved.filter(x => x.id !== id))

  // Columns follow the card's width (tiles are at least 140 px), so a page is always two full rows.
  const ref = useRef(null)
  const [cols, setCols] = useState(4)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setCols(Math.max(2, Math.floor((e.contentRect.width + 10) / 150))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  const per = cols * 2
  const pages = Math.max(1, Math.ceil(items.length / per))
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState(0)
  const at = Math.min(page, pages - 1)
  const turn = n => { const to = Math.max(0, Math.min(pages - 1, n)); if (to !== at) { setDir(to > at ? 1 : -1); setPage(to) } }
  // Open on the page holding the theme in use.
  useEffect(() => { const i = items.findIndex(isOn); if (i >= 0) setPage(Math.floor(i / per)) }, [per])
  const wheel = useRef(0)
  const onWheel = e => {
    if (pages < 2 || Date.now() - wheel.current < 350 || Math.abs(e.deltaY) < 20) return
    const to = at + (e.deltaY > 0 ? 1 : -1)
    if (to < 0 || to >= pages) return
    e.preventDefault?.()
    wheel.current = Date.now()
    turn(to)
  }

  return (
    <div className="card">
      <div className="card-h"><h2>Theme</h2><span className="small mu">{items.length} themes{saved.length ? `, ${saved.length} yours` : ''}</span></div>
      <div className="theme-pages">
        <div ref={ref} className="theme-page" onWheel={onWheel}>
          <div key={at} className={'themes page-in' + (dir > 0 ? ' from-below' : dir < 0 ? ' from-above' : '')} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {items.slice(at * per, at * per + per).map(t => (
              <div key={t.id} className="theme-wrap">
                <button className={'theme' + (isOn(t) ? ' on' : '')} onClick={() => pick(t)}
                  style={{ background: t.bg, color: t.fg, borderColor: isOn(t) ? t.ac : 'transparent' }}>
                  <div style={{ background: t.sf, borderRadius: 10, padding: '8px 10px', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
                    <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                    <div style={{ height: 6, borderRadius: 9, background: t.sf2, marginTop: 6 }}><div style={{ width: '62%', height: '100%', borderRadius: 9, background: t.ac }} /></div>
                  </div>
                  <div className="sw">{[t.ac, t.p, t.c, t.f].map((c, i) => <i key={i} style={{ background: c }} />)}</div>
                </button>
                {t.saved && <button className="theme-x" onClick={() => remove(t.id)} aria-label={'Delete ' + t.name}>×</button>}
              </div>
            ))}
          </div>
        </div>
        {pages > 1 && (
          <div className="pager" aria-label="Theme pages">
            <button onClick={() => turn(at - 1)} disabled={at === 0} aria-label="Previous themes"><span style={{ transform: 'rotate(-90deg)' }}><Icon name="next" size={18} /></span></button>
            {Array.from({ length: pages }, (_, i) => <button key={i} className={'dot' + (i === at ? ' on' : '')} onClick={() => turn(i)} aria-label={`Page ${i + 1}`} />)}
            <button onClick={() => turn(at + 1)} disabled={at === pages - 1} aria-label="More themes"><span style={{ transform: 'rotate(90deg)' }}><Icon name="next" size={18} /></span></button>
          </div>
        )}
      </div>
    </div>
  )
}

// Background and accent picked separately, each by hue, saturation and lightness or a color well.
// Starts from the current preset so the first slider move is a small change, not a jump.
function CustomColors() {
  const { settings, setSetting } = useStore()
  const base = THEMES.find(t => t.id === settings.theme) || THEMES[0]
  const c = settings.custom?.bg ? settings.custom : { on: false, bg: toHsl(base.bg), ac: toHsl(base.ac) }
  // Moving a slider makes an unsaved theme, so a saved one stays as it was until saved again.
  const set = (part, k, v) => setSetting('custom', { ...c, on: true, id: null, [part]: { ...c[part], [k]: +v } })
  const fromHex = (part, hex) => setSetting('custom', { ...c, on: true, id: null, [part]: toHsl(hex) })
  const [name, setName] = useState('')
  const saved = settings.savedThemes || []
  const save = e => {
    e.preventDefault()
    const id = 'my-' + Date.now().toString(36)
    setSetting('savedThemes', [{ id, name: name.trim() || `My theme ${saved.length + 1}`, bg: c.bg, ac: c.ac }, ...saved])
    setSetting('custom', { ...c, on: true, id })
    setName('')
  }
  const t = customTheme(c)
  const slider = ({ part, k, max, label, track }) => (
    <label className="slider" key={k}>
      <span className="small mu">{label}</span>
      <input type="range" min="0" max={max} value={c[part][k]} onChange={e => set(part, k, e.target.value)} style={{ background: track }} />
      <span className="num small">{c[part][k]}</span>
    </label>
  )
  const group = (part, title) => {
    const { h, s, l } = c[part]
    return (
      <div className="stack" style={{ gap: 6 }}>
        <div className="row sb"><b className="small">{title}</b><input type="color" value={hsl(h, s, l)} onChange={e => fromHex(part, e.target.value)} aria-label={title + ' color'} /></div>
        {slider({ part, k: 'h', max: 359, label: 'Hue', track: `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 359].map(x => hsl(x, Math.max(s, 50), 50)).join(',')})` })}
        {slider({ part, k: 's', max: 100, label: 'Color', track: `linear-gradient(90deg, ${hsl(h, 0, l)}, ${hsl(h, 100, l)})` })}
        {slider({ part, k: 'l', max: 100, label: 'Light', track: `linear-gradient(90deg, #000, ${hsl(h, s, 50)}, #fff)` })}
      </div>
    )
  }
  return (
    <div className="card">
      <div className="card-h">
        <h2>Custom colors</h2>
        <button className={'chip' + (c.on ? ' on' : '')} onClick={() => setSetting('custom', { ...c, on: !c.on })}>{c.on ? 'On' : 'Off'}</button>
      </div>
      <div className="custom-preview" style={{ background: t.bg, color: t.fg }}>
        <div style={{ background: t.sf, border: `1px solid ${t.ln}`, borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 600 }}>1,240 <span style={{ color: t.mu, fontWeight: 400 }}>kcal left</span></div>
          {[t.p, t.c, t.f].map((col, i) => <div key={i} style={{ height: 6, borderRadius: 9, background: t.sf2, marginTop: 8 }}><div style={{ width: [70, 45, 30][i] + '%', height: '100%', borderRadius: 9, background: col }} /></div>)}
          <div style={{ marginTop: 12, background: t.ac, color: t.acf, borderRadius: 10, padding: '6px 12px', display: 'inline-block', fontSize: 13, fontWeight: 600 }}>Start workout</div>
        </div>
      </div>
      <div className="grid2">{group('bg', 'Background')}{group('ac', 'Accent')}</div>
      <div className="small mu" style={{ marginTop: 10 }}>Cards, text and the protein, carb and fat colors follow from these two.</div>
      <form className="row" style={{ gap: 8, marginTop: 14 }} onSubmit={save}>
        <input className="grow" value={name} onChange={e => setName(e.target.value)} placeholder={`My theme ${saved.length + 1}`} aria-label="Theme name" />
        <button className="btn sm"><Icon name="bookmark" />Save theme</button>
      </form>
    </div>
  )
}

// Phone and PC on one log. Sign-in is by email (a link to paste, or a code), so there is no password.
function SyncCard() {
  const [st, setSt] = useState(syncStatus)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => onSyncStatus(setSt), [])
  const go = f => async e => { e.preventDefault(); setErr(null); try { await f() } catch (x) { setErr(x.message || String(x)) } }
  return (
    <div className="card">
      <div className="card-h"><h2>Sync</h2>{st.user && <span className="pill">{st.busy ? 'Syncing' : 'On'}</span>}</div>
      {!syncAvailable ? (
        <div className="small mu">Sync keeps your phone and PC on one log. It needs a free Supabase project: the steps are in the README under "Sync".</div>
      ) : st.user ? (
        <>
          <div className="small">Signed in as <b>{st.user.email}</b></div>
          <div className="small mu" style={{ marginTop: 4 }}>{st.at ? 'Last synced ' + new Date(st.at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'Not synced yet'}</div>
          {st.error && <div className="small" style={{ color: 'var(--warn)', marginTop: 6 }}>{st.error}</div>}
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn sm" disabled={st.busy} onClick={() => syncNow()}>Sync now</button>
            <button className="btn sm ghost" onClick={() => signOut()}>Sign out</button>
          </div>
        </>
      ) : !sent ? (
        <form onSubmit={go(async () => { await sendCode(email.trim()); setSent(true) })}>
          <div className="small mu" style={{ marginBottom: 10 }}>Sign in with the same email on each device. We email you a sign-in link; there is no password.</div>
          <div className="row" style={{ gap: 8 }}>
            <input className="grow" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btn sm">Send link</button>
          </div>
        </form>
      ) : (
        <form onSubmit={go(() => verifyCode(email.trim(), code.trim()))}>
          <div className="small mu" style={{ marginBottom: 10 }}>Check {email}. Copy the "Sign in" link from the newest email and paste it here (each new email voids the last one).</div>
          <div className="row" style={{ gap: 8 }}>
            <input className="grow" autoComplete="one-time-code" placeholder="Paste the link, or a 6-digit code" value={code} onChange={e => setCode(e.target.value)} />
            <button className="btn sm">Sign in</button>
          </div>
          <button type="button" className="small mu" style={{ marginTop: 8 }} onClick={() => setSent(false)}>Use a different email</button>
        </form>
      )}
      {err && <div className="small" style={{ color: 'var(--warn)', marginTop: 8 }}>{err}</div>}
    </div>
  )
}
