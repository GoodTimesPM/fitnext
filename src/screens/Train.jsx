import { useMemo, useState } from 'react'
import { Icon, Sheet, Top, fmtDate, fmtDur, go } from '../components/ui.jsx'
import BodyMap from '../components/BodyMap.jsx'
import { ExerciseThumb } from '../components/Exercise.jsx'
import { catalogue, exById } from '../lib/catalogue.js'
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

export function WeekStrip() {
  const { days, by, today } = useWeek()
  return (
    <div className="week-strip plain">
      {days.map(k => (
        <div key={k} className={(by[k] ? 'on' : '') + (k === today ? ' today' : '')}>
          <span>{new Date(k + 'T12:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
          <b className="num">{by[k] ? <Icon name="check" size={16} /> : +k.slice(8)}</b>
        </div>
      ))}
    </div>
  )
}

// The program's next day with its exercises and a Start button. Shared by Today and Train.
export function NextSession({ compact }) {
  const { workouts, active, settings } = useStore()
  const program = programById(settings.program)
  const day = nextDay(program, workouts)
  const idx = program.days.indexOf(day)
  const exs = day.exIds.map(exById).filter(Boolean)
  if (active) {
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
          <div className="small mu">Next up · {program.name}</div>
          <h2 style={{ fontSize: 22 }}>{day.name}</h2>
          <div className="small mu">Day {idx + 1} of {program.days.length} · {exs.length} exercises · about {exs.length * 9} min</div>
        </div>
        <button className="btn" onClick={() => startRoutine(day)}><Icon name="play" />Start</button>
      </div>
      <div className="session-ex">
        {exs.slice(0, compact ? 3 : 6).map(e => (
          <button key={e.id} className="row" onClick={() => go('exercise/' + e.id)}>
            <ExerciseThumb ex={e} />
            <div className="grow" style={{ textAlign: 'left' }}>
              <div className="cap" style={{ fontWeight: 500 }}>{e.n}</div>
              <div className="small mu cap">{day.sets ? `${day.sets} × ${day.reps}` : '3 sets'} · {e.tg}</div>
            </div>
          </button>
        ))}
        {compact && exs.length > 3 && <div className="small mu" style={{ paddingLeft: 4 }}>+ {exs.length - 3} more</div>}
      </div>
    </div>
  )
}

export default function Train() {
  const { workouts, active, routines, startWorkout, deleteRoutine, settings, setSetting } = useStore()
  const [browse, setBrowse] = useState(null)
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
  const list = [...routines.map(r => ({ ...r, mine: true })), ...program.days.map(d => ({ ...d, program: program.name }))]

  return (
    <>
      <Top eyebrow={`${week.count} workout${week.count === 1 ? '' : 's'} this week`} title="Train"
        right={<button className="avatar" onClick={() => go('settings')} aria-label="Settings"><Icon name="gear" /></button>} />

      <WeekStrip />
      <NextSession />
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
      <div className="chips programs">
        {PROGRAMS.map(p => (
          <button key={p.id} className={'prog' + (p.id === program.id ? ' on' : '')} onClick={() => setBrowse(p)}>
            <div className="small" style={{ opacity: .75 }}>{p.perWeek}× / week · {p.level}</div>
            <b>{p.name}</b>
            <div className="small" style={{ opacity: .75 }}>{p.days.map(d => d.name).join(' · ')}</div>
          </button>
        ))}
      </div>

      <div className="card-h" style={{ margin: '20px 2px 10px' }}>
        <h2>Routines</h2>
        <button className="icon-btn" onClick={() => setSetting('routineView', view === 'grid' ? 'list' : 'grid')} aria-label={view === 'grid' ? 'List view' : 'Grid view'}>
          <Icon name={view === 'grid' ? 'list' : 'grid'} />
        </button>
      </div>
      {view === 'grid' ? (
        <div className="tiles routines">
          {list.map(r => <RoutineTile key={r.id || r.name} r={r} disabled={!!active} onDelete={r.mine && (() => deleteRoutine(r.id))} />)}
        </div>
      ) : (
        <div className="list">
          {list.map(r => (
            <div key={r.id || r.name} className="li">
              <div className="grow">
                <div className="t">{r.name} {r.mine ? <span className="pill ac">mine</span> : <span className="pill">{r.program}</span>}</div>
                <div className="s cap">{r.exIds.map(id => exById(id)?.n).filter(Boolean).join(', ')}</div>
              </div>
              {r.mine && <button className="icon-btn" onClick={() => deleteRoutine(r.id)} aria-label="Delete routine"><Icon name="trash" /></button>}
              <button className="btn sm" disabled={!!active} onClick={() => startRoutine(r)}>Start</button>
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

      {browse && (
        <Sheet onClose={() => setBrowse(null)}>
          <div className="small mu">{browse.perWeek}× a week · {browse.level}</div>
          <h2>{browse.name}</h2>
          <p className="mu" style={{ marginTop: 6 }}>{browse.blurb}</p>
          {browse.days.map(d => (
            <div key={d.name} className="card tight" style={{ background: 'var(--sf)' }}>
              <div className="row sb"><h3>{d.name}</h3><button className="btn sm ghost" disabled={!!active} onClick={() => { setBrowse(null); startRoutine(d) }}>Start</button></div>
              <div className="small mu cap" style={{ marginTop: 4 }}>{d.exIds.map(id => exById(id)?.n).filter(Boolean).join(' · ')}{d.sets && ` · ${d.sets}×${d.reps}`}</div>
            </div>
          ))}
          <button className="btn block" disabled={browse.id === program.id} onClick={() => { setSetting('program', browse.id); setBrowse(null) }}>
            {browse.id === program.id ? 'Your current program' : 'Follow this program'}
          </button>
        </Sheet>
      )}
    </>
  )
}

function RoutineTile({ r, disabled, onDelete }) {
  const exs = r.exIds.map(exById).filter(Boolean)
  return (
    <div className="tile routine">
      <div className="row sb" style={{ alignItems: 'flex-start' }}>
        <div className="small mu">{r.mine ? 'My routine' : r.program}</div>
        {onDelete && <button className="x" onClick={onDelete} aria-label="Delete routine"><Icon name="trash" size={16} /></button>}
      </div>
      <h3 style={{ fontSize: 17, margin: '2px 0 8px' }}>{r.name}</h3>
      <div className="thumbs">{exs.slice(0, 4).map(e => <ExerciseThumb key={e.id} ex={e} />)}</div>
      <div className="small mu" style={{ margin: '8px 0 10px' }}>{exs.length} exercises{r.sets ? ` · ${r.sets}×${r.reps}` : ''}</div>
      <button className="btn sm block" disabled={disabled} onClick={() => startRoutine(r)}>Start</button>
    </div>
  )
}
