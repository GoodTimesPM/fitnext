import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, PanelCtx, Top, go, useMedia, useRoute } from './components/ui.jsx'
import { ExerciseThumb } from './components/Exercise.jsx'
import { catalogue, loadCatalogue, searchExercises } from './lib/catalogue.js'
import { allDays, nextDay, programById } from './lib/programs.js'
import Today from './screens/Today.jsx'
import Train, { startRoutine } from './screens/Train.jsx'
import Exercises from './screens/Exercises.jsx'
import ExerciseDetail from './screens/ExerciseDetail.jsx'
import Workout from './screens/Workout.jsx'
import History, { WorkoutDetail } from './screens/History.jsx'
import Stats from './screens/Stats.jsx'
import Fuel, { AddFood, Diary, Nutrients, guessMeal } from './screens/Fuel.jsx'
import Kitchen, { Grocery } from './screens/Kitchen.jsx'
import Progress, { Body } from './screens/Progress.jsx'
import Settings from './screens/Settings.jsx'
import { useStore } from './store.js'

const TABS = [['today', 'Today'], ['train', 'Train'], ['fuel', 'Fuel'], ['kitchen', 'Kitchen'], ['progress', 'Progress']]

// What a route shows, as a key the desktop layout can match against its panels.
function routeKey(parts) {
  const [a = 'today', b] = parts
  if (a === 'train') return { exercises: 'exercises', history: 'history', stats: 'stats', workout: 'workout' }[b] || 'train'
  if (a === 'fuel') return b === 'add' ? 'fuel/add' : 'fuel'
  return a
}

function screenFor(parts, query, desk) {
  const [a = 'today', b, c] = parts
  if (a === 'train') {
    if (b === 'exercises') return <Exercises pick={query.get('pick') === '1'} muscle={query.get('muscle')} />
    if (b === 'history') return <History />
    if (b === 'stats') return <Stats />
    if (b === 'workout') return <Workout />
    return <Train />
  }
  if (a === 'exercise') return <ExerciseDetail id={b} />
  if (a === 'workout') return <WorkoutDetail id={b} />
  if (a === 'fuel') return <Fuel add={b === 'add' ? query.get('meal') || guessMeal() : null} mode={c} q={query.get('q')} />
  if (a === 'kitchen') return <Kitchen tab={query.get('tab')} open={query.get('r')} noGrocery={desk} />
  if (a === 'progress') return <Progress panel={desk} />
  if (a === 'settings') return <Settings />
  return <Today />
}

// ---------- desktop: sidebar, search bar and two or three panels per section (the concept layout) ----------
const DESK = {
  today: { panels: ['today', 'fuel', 'train'], cols: '1.25fr 1fr 1fr' },
  train: { panels: ['train', 'history', 'exercises'], cols: '1.15fr 1fr 1fr' },
  fuel: { panels: ['fuel', 'fuel/add', 'nutrients'], cols: '1.15fr 1fr .9fr' },
  kitchen: { panels: ['kitchen', 'grocery'], cols: '2fr 1fr', wide: 0 },
  progress: { panels: ['progress', 'body'], cols: '2fr 1fr', wide: 0 },
  settings: { panels: ['settings'], cols: 'minmax(0, 860px)' },
}
const COMPANION = {
  today: () => <Today />,
  train: () => <Train />,
  history: () => <History />,
  exercises: () => <Exercises />,
  fuel: () => <Diary />,
  'fuel/add': () => <AddFood meal={guessMeal()} mode="search" />,
  nutrients: () => <Nutrients panel />,
  grocery: () => <><Top eyebrow="Kitchen" title="Grocery" /><Grocery /></>,
  body: () => <><Top eyebrow="Body" title="Weight & goals" /><Body /></>,
}

function Desk({ parts, query, tab }) {
  const key = routeKey(parts)
  const layout = DESK[tab] || DESK.today
  // The route's own screen takes the panel it matches, or the first one.
  const at = Math.max(0, layout.panels.indexOf(key))
  const { active, workouts, settings } = useStore()
  const day = nextDay(programById(settings.program), workouts)
  return (
    <div className="desk">
      <aside className="side">
        <button className="brand" onClick={() => go('today')}><img src="/icon.svg" alt="" /><b>FitNext</b></button>
        <nav>
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => go(id)}><Icon name={id} /><span>{label}</span></button>
          ))}
          <button className={tab === 'settings' ? 'on' : ''} onClick={() => go('settings')}><Icon name="gear" /><span>Settings</span></button>
        </nav>
        <div className="side-actions">
          <button className="btn block" onClick={() => go(`fuel/add?meal=${guessMeal()}`)}><Icon name="plus" />Log food</button>
          {active
            ? <button className="btn ghost block" onClick={() => go('train/workout')}><Icon name="play" />Resume {active.name}</button>
            : <button className="btn ghost block" onClick={() => startRoutine(day)}><Icon name="play" />Start {day.name}</button>}
        </div>
      </aside>
      <div className="desk-main">
        <header className="desk-top">
          <Omni />
          <span className="mu small">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <button className="avatar" onClick={() => go('settings')} aria-label="Settings">{settings.name ? settings.name[0].toUpperCase() : <Icon name="gear" />}</button>
        </header>
        <div className="panels" style={{ gridTemplateColumns: layout.cols }}>
          {layout.panels.map((p, i) => (
            <section key={i === at ? 'route' : p} className={'panel' + (layout.wide === i ? ' span2' : '')}>
              {i === at
                ? <div className="screen" key={parts.join('/')}>{screenFor(parts, query, true)}</div>
                : <PanelCtx.Provider value={true}>{COMPANION[p]()}</PanelCtx.Provider>}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

// One search box for exercises, routines, recipes and foods. Ctrl+K (Cmd+K) focuses it.
function Omni() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(0)
  const ref = useRef(null)
  const recipes = useStore(s => s.recipes)
  useEffect(() => {
    const onKey = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const items = useMemo(() => {
    const t = q.trim()
    if (!t) return []
    const low = t.toLowerCase()
    return [
      { kind: 'Food', label: `Search foods for “${t}”`, icon: 'fuel', run: () => go(`fuel/add/search?meal=${guessMeal()}&q=${encodeURIComponent(t)}`) },
      ...searchExercises(catalogue(), t).slice(0, 5).map(e => ({ kind: 'Exercise', label: e.n, sub: `${e.tg} · ${e.eq}`, ex: e, run: () => go('exercise/' + e.id) })),
      ...allDays().filter(d => d.name.toLowerCase().includes(low) || d.program.toLowerCase().includes(low)).slice(0, 3)
        .map(d => ({ kind: 'Routine', label: d.name, sub: d.program, icon: 'play', run: () => startRoutine(d) })),
      ...recipes.filter(r => r.title.toLowerCase().includes(low)).slice(0, 4)
        .map(r => ({ kind: 'Recipe', label: r.title, sub: (r.tags || []).slice(0, 2).join(' · '), img: r.image, run: () => go('kitchen?r=' + r.id) })),
    ]
  }, [q, recipes])
  const pick = it => { it.run(); setOpen(false); setQ(''); ref.current?.blur() }
  return (
    <div className="omni">
      <div className="search" style={{ margin: 0 }}>
        <Icon name="search" />
        <input ref={ref} value={q} placeholder="Search foods, exercises, recipes" onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={e => { setQ(e.target.value); setSel(0); setOpen(true) }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(items.length - 1, s + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
            else if (e.key === 'Enter' && items[sel]) pick(items[sel])
            else if (e.key === 'Escape') ref.current.blur()
          }} />
        <kbd>Ctrl K</kbd>
      </div>
      {open && items.length > 0 && (
        <div className="omni-list">
          {items.map((it, i) => (
            <button key={it.kind + it.label} className={'li' + (i === sel ? ' sel' : '')} onMouseDown={e => e.preventDefault()} onClick={() => pick(it)} onMouseEnter={() => setSel(i)}>
              {it.ex ? <ExerciseThumb ex={it.ex} /> : it.img ? <div className="thumb"><img src={it.img} alt="" /></div> : <div className="thumb"><Icon name={it.icon || 'search'} /></div>}
              <div className="grow"><div className="t">{it.label}</div>{it.sub && <div className="s cap">{it.sub}</div>}</div>
              <span className="pill">{it.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { parts, query } = useRoute()
  const [ready, setReady] = useState(false)
  const desk = useMedia('(min-width: 1180px)')
  useEffect(() => { loadCatalogue().then(() => setReady(true)) }, [])
  useEffect(() => { if (!desk) window.scrollTo(0, 0) }, [parts.join('/')])
  const tab = { exercise: 'train', workout: 'train' }[parts[0]] || parts[0] || 'today'
  if (!ready) return <div className="empty" style={{ paddingTop: 80 }}>Loading…</div>
  if (desk) return <Desk parts={parts} query={query} tab={tab} />
  return (
    <div className="shell">
      <main className="main">
        <div className="screen" key={parts.join('/')}>{screenFor(parts, query, false)}</div>
      </main>
      <nav className="dock">
        {TABS.map(([id, label]) => (
          <button key={id} className={(tab === id || (tab === 'settings' && id === 'today')) ? 'on' : ''} onClick={() => go(id)} aria-label={label}>
            <Icon name={id} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
