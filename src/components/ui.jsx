import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

// ---------- hash routing: #/train/exercises -> ['train', 'exercises'] ----------
const subscribe = cb => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }
export const useRoute = () => {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(query) }
}
export const go = path => { location.hash = '#/' + path.replace(/^\//, '') }
export const back = fallback => (history.length > 1 ? history.back() : go(fallback))

// ---------- icons (24px stroke) ----------
const P = {
  today: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  train: 'M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11',
  fuel: 'M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17 3c-1.5 1-2 3-2 6s1 4 2 4v8',
  kitchen: 'M4 10h16l-1.5 9.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5zM8 10V7a4 4 0 0 1 8 0v3',
  progress: 'M4 19V5M4 19h16M8 15l4-4 3 3 5-6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  body: 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM6 9h12M12 9v6M9 21l3-6 3 6',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 9v6M10 9v6M13 9v6M17 9v6',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
  drop: 'M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z',
  chart: 'M5 20V10M12 20V4M19 20v-7',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  play: 'M7 4.5v15l12-7.5z',
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11',
  next: 'M9 5l7 7-7 7',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  flame: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z',
  scale: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 9a5 5 0 0 1 7 0L12 12z',
  ruler: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  cloud: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z',
  palette: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8zM7.5 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM10.5 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  calendar: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4',
  bookmark: 'M7 4h10v17l-5-4-5 4z',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
}
export const Icon = ({ name, size }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={size ? { width: size, height: size } : undefined}>
    <path d={P[name]} />
  </svg>
)

// ---------- rings and bars ----------
export function Ring({ value, max, size = 150, stroke = 12, color = 'var(--ac)', track = 'var(--sf2)', children }) {
  const [shown, setShown] = useState(0)
  useEffect(() => { const id = requestAnimationFrame(() => setShown(value)); return () => cancelAnimationFrame(id) }, [value])
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  const pct = max ? Math.min(1, shown / max) : 0
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
      </svg>
      <div className="in">{children}</div>
    </div>
  )
}

export function Bar({ value, max, color = 'var(--ac)' }) {
  const [w, setW] = useState(0)
  useEffect(() => { const id = requestAnimationFrame(() => setW(max ? Math.min(100, (value / max) * 100) : 0)); return () => cancelAnimationFrame(id) }, [value, max])
  return <div className="bar"><i style={{ width: w + '%', background: value > max ? 'var(--warn)' : color }} /></div>
}

export function Macro({ label, value, goal, color }) {
  return (
    <div className="macro">
      <div className="row"><span>{label}</span><span className="mu num">{Math.round(value)}/{goal}g</span></div>
      <Bar value={value} max={goal} color={color} />
    </div>
  )
}

// A number box you can clear while typing: it keeps the text as typed and saves only real numbers.
// Left empty, it shows the saved value again once you click away.
export function NumInput({ value, onValue, ...rest }) {
  const [text, setText] = useState(null)
  return (
    <input type="number" {...rest} value={text ?? value} onFocus={() => setText(String(value ?? ''))} onBlur={() => setText(null)}
      onChange={e => { setText(e.target.value); if (e.target.value !== '') onValue(+e.target.value) }} />
  )
}

// ---------- layout ----------
// True inside a desktop panel: screens drop their back buttons and use a smaller heading there.
export const PanelCtx = createContext(false)

export function Top({ eyebrow, title, onBack, right }) {
  const panel = useContext(PanelCtx)
  if (panel) onBack = null
  return (
    <div className="topbar">
      <div className="row" style={{ minWidth: 0 }}>
        {onBack && <button className="back" onClick={onBack} aria-label="Back"><Icon name="back" /></button>}
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className={onBack ? 'cap' : ''} style={onBack ? { fontSize: 26 } : undefined}>{title}</h1>
        </div>
      </div>
      {right}
    </div>
  )
}

export function Sheet({ onClose, children }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog"><div className="grab" />{children}</div>
    </>,
    document.body,
  )
}

export const fmtDate = (ts, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(ts).toLocaleDateString(undefined, opts)
export const fmtDur = ms => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min` }

export function useMedia(query) {
  const [on, setOn] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const m = matchMedia(query)
    const f = () => setOn(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [query])
  return on
}

// Drag sideways to go to the previous or next item (a day, a week). The content follows the
// finger, and new content slides in from the side it came from (dir: 1 from the right, -1 from the left).
export function Swipe({ k, dir, onPrev, onNext, children }) {
  const ref = useRef(null)
  const drag = useRef(null)
  const dragged = useRef(false)
  const down = e => { if (e.button) return; drag.current = { x: e.clientX, y: e.clientY, dx: 0, lock: null, id: e.pointerId } }
  const move = e => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (!d.lock && Math.hypot(dx, dy) > 10) {
      d.lock = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y'
      if (d.lock === 'x') e.currentTarget.setPointerCapture(d.id)
    }
    if (d.lock === 'x') { d.dx = dx; ref.current.style.transition = 'none'; ref.current.style.transform = `translateX(${dx * 0.85}px)`; ref.current.style.opacity = 1 - Math.min(0.5, Math.abs(dx) / 600) }
  }
  const up = () => {
    const d = drag.current
    drag.current = null
    if (!d || d.lock !== 'x') return
    dragged.current = true
    setTimeout(() => { dragged.current = false })
    const el = ref.current
    el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''
    if (d.dx > 80) onPrev?.(); else if (d.dx < -80) onNext?.()
  }
  // A drag that changed the day must not also click whatever it started on.
  const click = e => { if (dragged.current) e.stopPropagation() }
  return (
    <div className="swipe" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClickCapture={click}>
      <div ref={ref} key={k} className={'swipe-in' + (dir > 0 ? ' from-right' : dir < 0 ? ' from-left' : '')}>{children}</div>
    </div>
  )
}

// A small line chart: points [{ x, y }], with a soft fill and an optional dashed goal line.
export function Line({ points, height = 120, goal, color = 'var(--ac)', fmt = v => Math.round(v) }) {
  if (points.length < 2) return <div className="empty small" style={{ height, display: 'grid', placeItems: 'center' }}>Log two entries to see the trend.</div>
  const W = 300, H = height, pad = 8
  const ys = points.map(p => p.y).concat(goal != null ? [goal] : [])
  const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1
  const x0 = points[0].x, xs = points[points.length - 1].x - x0 || 1
  const X = x => pad + ((x - x0) / xs) * (W - pad * 2)
  const Y = y => pad + (1 - (y - lo) / span) * (H - pad * 2 - 14)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const id = 'g' + Math.random().toString(36).slice(2, 7)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="line-chart" style={{ width: '100%', height }}>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3].map(i => <line key={i} x1="0" x2={W} y1={pad + i * ((H - pad * 2 - 14) / 3)} y2={pad + i * ((H - pad * 2 - 14) / 3)} stroke="var(--ln)" strokeWidth="1" />)}
      {goal != null && <line x1="0" x2={W} y1={Y(goal)} y2={Y(goal)} stroke="var(--ok)" strokeDasharray="4 4" strokeWidth="1.5" />}
      <path d={`${d} L${X(last.x)} ${H - 14} L${X(x0)} ${H - 14}Z`} fill={`url(#${id})`} />
      <path className="draw" d={d} pathLength="1" fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(last.x)} cy={Y(last.y)} r="4.5" fill={color} stroke="var(--sf)" strokeWidth="2" />
      <text x={pad} y={H - 2} fontSize="10" fill="var(--mu)">{new Date(x0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
      <text x={W - pad} y={H - 2} fontSize="10" fill="var(--mu)" textAnchor="end">{fmt(last.y)}</text>
    </svg>
  )
}

export const Seg = ({ value, options, onChange, style }) => (
  <div className="seg" style={style}>
    {options.map(([id, label]) => <button key={id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}>{label}</button>)}
  </div>
)
