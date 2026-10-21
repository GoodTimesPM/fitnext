import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, Sheet, Swipe, Top, fmtDate, fmtDur, go } from '../components/ui.jsx'
import BodyMap from '../components/BodyMap.jsx'
import { ExerciseThumb } from '../components/Exercise.jsx'
import { catalogue, exById, searchExercises } from '../lib/catalogue.js'
import { muscleLoad } from '../lib/muscles.js'
import { computePRs, prCount, workoutVolume } from '../lib/pr.js'
import { PROGRAMS, nextDay, programById } from '../lib/programs.js'
import { shiftDay, todayKey, useStore } from '../store.js'

// Start a program day or saved routine and open the logger.
export const startRoutine = r => { useStore.getState().startWorkout(r.name, r.exIds.filter(exById), r.sets && { sets: r.sets, reps: r.reps }); go('train/workout') }

// Mon..Sun of this week with how many workouts each day had.
export function useWeek() {
  const workouts = useStore(s => s.workouts)
  return useMemo(() => {
    const t = todayKey()
    const monday = shiftDay(t, -((new Date().getDay() + 6) % 7))
    const days = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i))
    const by = {}
    for (const w of workouts) { const k = todayKey(new Date(w.start)); if (k >= monday) by[k] = (by[k] || 0) + 1 }
    return { days, by, today: t, count: Object.values(by).reduce((a, b) => a + b, 0) }
  }, [workouts])
}

// With onPick, each day is a button and the ring marks the picked day instead of today.
export function WeekStrip({ sel, onPick }) {
  const { days, by, today } = useWeek()
  const Day = onPick ? 'button' : 'div'
  return (
    <div className="week-strip plain">
      {days.map(k => (
        <Day key={k} className={(by[k] ? 'done' : '') + (k === today ? ' today' : '') + (k === (sel || today) ? ' sel' : '')}
          onClick={onPick && (() => onPick(k))} aria-label={onPick && new Date(k + 'T12:00').toLocaleDateString(undefined, { weekday: 'long' })}>
          <span>{new Date(k + 'T12:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
          <b className="num">{by[k] ? <Icon name="check" size={16} /> : +k.slice(8)}</b>
        </Day>
      ))}
    </div>
  )
}

const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5)

// Write one edited day back into the user's copy of a program.
const saveDay = (program, i, day) => useStore.getState().saveProgram(program.id, program.days.map((d, j) => (j === i ? day : d)).concat(i >= program.days.length ? [day] : []))

// The program day due on a date (today by default) with its exercises and a Start button. A past
// date shows what was logged on it instead. Tapping an exercise opens the day in the editor.
// Shared by Today and Train.
export function NextSession({ compact, date }) {
  const { workouts, active, settings } = useStore()
  useStore(s => s.myPrograms)
  const [edit, setEdit] = useState(null)
  const today = todayKey()
  date ||= today
  const program = programById(settings.program)
  const next = program.days.indexOf(nextDay(program, workouts))
  const ahead = daysBetween(today, date)
  if (ahead < 0) return <LoggedDay date={date} workouts={workouts.filter(w => todayKey(new Date(w.start)) === date)} unit={settings.unit} />
  const idx = (Math.max(0, next) + ahead) % program.days.length
  const day = program.days[idx]
  const exs = day.exIds.map(exById).filter(Boolean)
  const when = ahead === 0 ? 'Next up' : ahead === 1 ? 'Tomorrow' : new Date(date + 'T12:00').toLocaleDateString(undefined, { weekday: 'long' })
  if (active && ahead === 0) {
    return (
      <button className="card session live" onClick={() => go('train/workout')}>
        <div className="row sb">
          <div><div className="small" style={{ opacity: .8 }}>In progress · {fmtDur(Date.now() - active.start)}</div><h2>{active.name}</h2></div>
          <span className="play"><Icon name="play" /></span>
        </div>
        <div className="small" style={{ opacity: .85, marginTop: 6 }}>
          {active.exercises.filter(x => x.sets.every(s => s.done)).length} of {active.exercises.length} exercises done
        </div>
      </button>
    )
  }
  return (
    <div className="card session">
      <div className="row sb wrap" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 160px' }}>
          <div className="small mu">{when} · {program.name}</div>
          <h2 style={{ fontSize: 22 }}>{day.name}</h2>
          <div className="small mu">Day {idx + 1} of {program.days.length} · {exs.length} exercises · about {exs.length * 9} min</div>
        </div>
        <button className="btn" disabled={!!active} onClick={() => startRoutine(day)}><Icon name="play" />Start</button>
      </div>
      <div className="session-ex">
        {exs.slice(0, compact ? 3 : 6).map(e => (
          <button key={e.id} className="row" onClick={() => setEdit(e.id)}>
            <ExerciseThumb ex={e} />
            <div className="grow" style={{ textAlign: 'left' }}>
              <div className="cap" style={{ fontWeight: 500 }}>{e.n}</div>
              <div className="small mu cap">{day.sets ? `${day.sets} × ${day.reps}` : '3 sets'} · {e.tg}</div>
            </div>
          </button>
        ))}
        {compact && exs.length > 3 && <div className="small mu" style={{ paddingLeft: 4 }}>+ {exs.length - 3} more</div>}
      </div>
      {edit && (
        <DayEditor eyebrow={program.name} day={day} focus={edit} onClose={() => setEdit(null)}
          onSave={d => saveDay(program, idx, d)} />
      )}
    </div>
  )
}

function LoggedDay({ date, workouts, unit }) {
  const name = new Date(date + 'T12:00').toLocaleDateString(undefined, { weekday: 'long' })
  if (!workouts.length) {
    return (
      <div className="card session">
        <div className="small mu">{name}</div>
        <h2 style={{ fontSize: 22 }}>Rest day</h2>
        <div className="small mu">Nothing logged.</div>
      </div>
    )
  }
  return workouts.map(w => (
    <div key={w.id} className="card session">
      <div className="row sb wrap" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 160px' }}>
          <div className="small mu">{name} · done</div>
          <h2 style={{ fontSize: 22 }}>{w.name}</h2>
          <div className="small mu">{fmtDur(w.end - w.start)} · {w.exercises.length} exercises · {Math.round(workoutVolume(w)).toLocaleString()} {unit}</div>
        </div>
        <button className="btn ghost" onClick={() => go('workout/' + w.id)}>View</button>
      </div>
      <div className="session-ex">
        {w.exercises.map(x => ({ x, e: exById(x.exId) })).filter(o => o.e).map(({ x, e }) => (
          <button key={x.exId} className="row" onClick={() => go('exercise/' + e.id)}>
            <ExerciseThumb ex={e} />
            <div className="grow" style={{ textAlign: 'left' }}>
              <div className="cap" style={{ fontWeight: 500 }}>{e.n}</div>
              <div className="small mu">{x.sets.map(s => `${s.w || 0}×${s.r || 0}`).join(', ')}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  ))
}

// Edit a routine or a program day: name, sets and reps, and the exercises (reorder, swap, remove, add).
// Nothing changes until Save. focus: an exercise id to scroll to and highlight.
export function DayEditor({ eyebrow, day, focus, onSave, onDelete, deleteLabel = 'Delete', onClose }) {
  const [name, setName] = useState(day.name)
  const [exIds, setExIds] = useState(() => day.exIds.filter(exById))
  const [sets, setSets] = useState(day.sets ? String(day.sets) : '')
  const [reps, setReps] = useState(day.reps ? String(day.reps) : '')
  const [pick, setPick] = useState(null) // null, 'add', or the index of the exercise to swap
  const [q, setQ] = useState('')
  const focusRef = useRef(null)
  useEffect(() => { focusRef.current?.scrollIntoView({ block: 'center' }) }, [])
  const results = useMemo(() => (pick === null ? [] : searchExercises(catalogue(), q).slice(0, 40)), [pick, q])
  const move = (i, d) => setExIds(a => { const b = [...a]; [b[i], b[i + d]] = [b[i + d], b[i]]; return b })
  const choose = id => { setExIds(a => (pick === 'add' ? [...a, id] : a.map((x, i) => (i === pick ? id : x)))); setPick(null); setQ('') }
  const save = () => {
    const out = { name: name.trim() || day.name, exIds }
    if (+sets > 0) Object.assign(out, { sets: +sets, reps: +reps > 0 ? +reps : 10 })
    onSave(out)
    onClose()
  }

  if (pick !== null) {
    return (
      <Sheet onClose={() => setPick(null)}>
        <div className="row" style={{ gap: 10, marginBottom: 12 }}>
          <button className="icon-btn" onClick={() => setPick(null)} aria-label="Back"><Icon name="back" /></button>
          <h2 className="cap">{pick === 'add' ? 'Add exercise' : `Swap ${exById(exIds[pick])?.n}`}</h2>
        </div>
        <label className="search">
          <Icon name="search" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search: bench, rdl, db curl…" />
        </label>
        <div className="list">
          {results.map(e => (
            <button key={e.id} className="li ed-pick" onClick={() => choose(e.id)}>
              <ExerciseThumb ex={e} />
              <div className="grow"><div className="t cap">{e.n}</div><div className="s cap">{e.tg} · {e.eq}</div></div>
            </button>
          ))}
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose}>
      <div className="small mu">{eyebrow}</div>
      <input className="title-input" value={name} onChange={e => setName(e.target.value)} aria-label="Name" />
      <div className="row" style={{ gap: 10, margin: '10px 0 14px' }}>
        <label className="small mu grow">Sets<input type="number" inputMode="numeric" value={sets} onChange={e => setSets(e.target.value)} placeholder="From history" /></label>
        <label className="small mu grow">Reps<input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} placeholder="10" /></label>
      </div>
      <div className="ed-list">
        {exIds.map((id, i) => {
          const e = exById(id)
          return (
            <div key={id + i} ref={id === focus ? focusRef : null} className={'ed-row' + (id === focus ? ' focus' : '')}>
              <ExerciseThumb ex={e} />
              <div className="grow"><div className="t cap">{e.n}</div><div className="small mu cap">{e.tg} · {e.eq}</div></div>
              <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><Icon name="up" /></button>
              <button className="icon-btn" disabled={i === exIds.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><Icon name="down" /></button>
              <button className="icon-btn" onClick={() => setPick(i)} aria-label="Swap exercise"><Icon name="swap" /></button>
              <button className="icon-btn" onClick={() => setExIds(a => a.filter((_, j) => j !== i))} aria-label="Remove exercise"><Icon name="x" /></button>
            </div>
          )
        })}
        {!exIds.length && <div className="empty">No exercises yet.</div>}
      </div>
      <button className="btn ghost block" style={{ margin: '12px 0' }} onClick={() => setPick('add')}><Icon name="plus" />Add exercise</button>
      <div className="row wrap" style={{ gap: 8 }}>
        {onDelete && <button className="btn ghost danger" onClick={() => { onDelete(); onClose() }}><Icon name="trash" />{deleteLabel}</button>}
        <div className="grow" />
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={!exIds.length} onClick={save}>Save</button>
      </div>
    </Sheet>
  )
}

// A sideways row with arrow buttons at either end, shown while there is more to scroll to that way.
function Rail({ className, children }) {
  const ref = useRef(null)
  const [edge, setEdge] = useState({ l: false, r: false })
  const check = () => { const el = ref.current; if (el) setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }) }
  useEffect(() => { check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check) }, [])
  const by = d => ref.current.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <div className="rail">
      <div ref={ref} className={'chips ' + className} onScroll={check}>{children}</div>
      {edge.l && <button className="rail-arrow l" onClick={() => by(-1)} aria-label="Scroll left"><Icon name="back" /></button>}
      {edge.r && <button className="rail-arrow r" onClick={() => by(1)} aria-label="Scroll right"><Icon name="next" /></button>}
    </div>
  )
}

export default function Train() {
  const { workouts, active, routines, startWorkout, deleteRoutine, updateRoutine, resetProgram, settings, setSetting } = useStore()
  useStore(s => s.myPrograms)
  const [browse, setBrowse] = useState(null) // a program id
  const [edit, setEdit] = useState(null) // { routine } or { program, index, fresh? }
  const [sel, setSel] = useState(todayKey)
  const [dir, setDir] = useState(0)
  const { marks } = useMemo(() => computePRs(workouts), [workouts])
  const week = useWeek()
  const heat = useMemo(() => {
    const recent = workouts.filter(w => w.start >= Date.now() - 7 * 864e5)
    const load = muscleLoad(recent.flatMap(w => w.exercises), exById)
    const max = Math.max(1, ...Object.values(load))
    return Object.fromEntries(Object.entries(load).map(([m, v]) => [m, v / max]))
  }, [workouts])
  const program = programById(settings.program)
  const view = settings.routineView
  const list = [...routines.map(r => ({ ...r, mine: true })), ...program.days.map((d, i) => ({ ...d, program: program.name, index: i }))]
  const shown = browse && programById(browse)
  const pickDay = k => { if (k === sel) return; setDir(k > sel ? 1 : -1); setSel(k) }
  const stepDay = d => { const k = week.days[week.days.indexOf(sel) + d]; if (k) pickDay(k) }
  const editRoutine = r => setEdit(r.mine ? { routine: r } : { program, index: r.index })

  return (
    <>
      <Top eyebrow={`${week.count} workout${week.count === 1 ? '' : 's'} this week`} title="Train"
        right={<button className="avatar" onClick={() => go('settings')} aria-label="Settings"><Icon name="gear" /></button>} />

      <WeekStrip sel={sel} onPick={pickDay} />
      <Swipe k={sel} dir={dir} onPrev={() => stepDay(-1)} onNext={() => stepDay(1)}>
        <NextSession date={sel} />
      </Swipe>
      {!active && (
        <button className="btn ghost block" style={{ marginBottom: 14 }} onClick={() => { startWorkout('Workout'); go('train/exercises?pick=1') }}>
          <Icon name="plus" />Start empty workout
        </button>
      )}

      <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 14 }}>
        {[['list', 'Exercises', `${catalogue().length.toLocaleString()}`, 'train/exercises'], ['clock', 'History', `${workouts.length} logged`, 'train/history'], ['chart', 'Stats', 'Volume, PRs', 'train/stats']].map(([icon, t, s, to]) => (
          <button key={t} className="card tight" style={{ textAlign: 'left' }} onClick={() => go(to)}>
            <Icon name={icon} /><h3 style={{ marginTop: 8 }}>{t}</h3><div className="small mu">{s}</div>
          </button>
        ))}
      </div>

      <div className="card-h" style={{ margin: '20px 2px 10px' }}>
        <h2>Programs</h2>
        <span className="small mu">{PROGRAMS.length} built in</span>
      </div>
      <Rail className="programs">
        {PROGRAMS.map(base => programById(base.id)).map(p => (
          <button key={p.id} className={'prog' + (p.id === program.id ? ' on' : '')} onClick={() => setBrowse(p.id)}>
            <div className="small" style={{ opacity: .75 }}>{p.perWeek}× / week · {p.level}{p.edited ? ' · edited' : ''}</div>
            <b>{p.name}</b>
            <div className="small" style={{ opacity: .75 }}>{p.days.map(d => d.name).join(' · ')}</div>
          </button>
        ))}
      </Rail>

      <div className="card-h" style={{ margin: '20px 2px 10px' }}>
        <h2>Routines</h2>
        <button className="icon-btn" onClick={() => setSetting('routineView', view === 'grid' ? 'list' : 'grid')} aria-label={view === 'grid' ? 'List view' : 'Grid view'}>
          <Icon name={view === 'grid' ? 'list' : 'grid'} />
        </button>
      </div>
      {view === 'grid' ? (
        <div className="tiles routines">
          {list.map(r => <RoutineTile key={r.id || r.name} r={r} disabled={!!active} onEdit={() => editRoutine(r)} />)}
        </div>
      ) : (
        <div className="list">
          {list.map(r => (
            <div key={r.id || r.name} className="li" role="button" tabIndex={0} onClick={() => editRoutine(r)}>
              <div className="grow">
                <div className="t">{r.name} {r.mine ? <span className="pill ac">mine</span> : <span className="pill">{r.program}</span>}</div>
                <div className="s cap">{r.exIds.map(id => exById(id)?.n).filter(Boolean).join(', ')}</div>
              </div>
              <button className="btn sm" disabled={!!active} onClick={e => { e.stopPropagation(); startRoutine(r) }}>Start</button>
            </div>
          ))}
        </div>
      )}

      <button className="card" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('train/stats')}>
        <div className="card-h"><h2>Muscle balance</h2><span className="small mu">Last 7 days ›</span></div>
        <BodyMap heat={heat} figure={settings.figure} height={200} />
      </button>

      {workouts.length > 0 && (
        <>
          <div className="card-h" style={{ margin: '20px 2px 10px' }}><h2>Recent</h2><button className="small" style={{ color: 'var(--ac)' }} onClick={() => go('train/history')}>All</button></div>
          <div className="list">
            {workouts.slice(0, 3).map(w => (
              <button key={w.id} className="li" onClick={() => go('workout/' + w.id)}>
                <div className="grow"><div className="t">{w.name}</div><div className="s">{fmtDate(w.start)} · {w.exercises.length} exercises · {Math.round(workoutVolume(w)).toLocaleString()} {settings.unit}</div></div>
                {prCount(marks, w.id) > 0 && <span className="pill pr">{prCount(marks, w.id)} PR</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {shown && !edit && (
        <Sheet onClose={() => setBrowse(null)}>
          <div className="small mu">{shown.perWeek}× a week · {shown.level}{shown.edited ? ' · edited' : ''}</div>
          <h2>{shown.name}</h2>
          <p className="mu" style={{ marginTop: 6 }}>{shown.blurb}</p>
          {shown.days.map((d, i) => (
            <div key={i} className="card tight prog-day" style={{ background: 'var(--sf)' }} role="button" tabIndex={0} onClick={() => setEdit({ program: shown, index: i })}>
              <div className="row sb">
                <h3>{d.name}</h3>
                <div className="row" style={{ gap: 6 }}>
                  <span className="x" aria-hidden><Icon name="edit" size={16} /></span>
                  <button className="btn sm ghost" disabled={!!active} onClick={e => { e.stopPropagation(); setBrowse(null); startRoutine(d) }}>Start</button>
                </div>
              </div>
              <div className="small mu cap" style={{ marginTop: 4 }}>{d.exIds.map(id => exById(id)?.n).filter(Boolean).join(' · ')}{d.sets && ` · ${d.sets}×${d.reps}`}</div>
            </div>
          ))}
          <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
            <button className="btn ghost sm" onClick={() => setEdit({ program: shown, index: shown.days.length, fresh: true })}><Icon name="plus" />Add day</button>
            {shown.edited && <button className="btn ghost sm" onClick={() => resetProgram(shown.id)}>Reset to default</button>}
          </div>
          <button className="btn block" disabled={shown.id === program.id} onClick={() => { setSetting('program', shown.id); setBrowse(null) }}>
            {shown.id === program.id ? 'Your current program' : 'Follow this program'}
          </button>
        </Sheet>
      )}

      {edit?.routine && (
        <DayEditor eyebrow="My routine" day={edit.routine} onClose={() => setEdit(null)}
          onSave={d => updateRoutine(edit.routine.id, { sets: undefined, reps: undefined, ...d })}
          onDelete={() => deleteRoutine(edit.routine.id)} deleteLabel="Delete routine" />
      )}
      {edit?.program && (
        <DayEditor eyebrow={edit.program.name} onClose={() => setEdit(null)}
          day={edit.fresh ? { name: `Day ${edit.index + 1}`, exIds: [] } : edit.program.days[edit.index]}
          onSave={d => saveDay(edit.program, edit.index, d)}
          onDelete={!edit.fresh && edit.program.days.length > 1 && (() => useStore.getState().saveProgram(edit.program.id, edit.program.days.filter((_, j) => j !== edit.index)))}
          deleteLabel="Remove day" />
      )}
    </>
  )
}

// Tap the tile to edit the routine; Start starts it.
function RoutineTile({ r, disabled, onEdit }) {
  const exs = r.exIds.map(exById).filter(Boolean)
  return (
    <div className="tile routine" role="button" tabIndex={0} onClick={onEdit} onKeyDown={e => e.key === 'Enter' && e.target === e.currentTarget && onEdit()}>
      <div className="row sb" style={{ alignItems: 'flex-start' }}>
        <div className="small mu">{r.mine ? 'My routine' : r.program}</div>
        <span className="x" aria-hidden><Icon name="edit" size={16} /></span>
      </div>
      <h3 style={{ fontSize: 17, margin: '2px 0 8px' }}>{r.name}</h3>
      <div className="thumbs">{exs.slice(0, 4).map(e => <ExerciseThumb key={e.id} ex={e} />)}</div>
      <div className="small mu" style={{ margin: '8px 0 10px' }}>{exs.length} exercises{r.sets ? ` · ${r.sets}×${r.reps}` : ''}</div>
      <button className="btn sm block" disabled={disabled} onClick={e => { e.stopPropagation(); startRoutine(r) }}>Start</button>
    </div>
  )
}
