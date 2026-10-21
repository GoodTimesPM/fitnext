import { useMemo, useState } from 'react'
import { Icon, Sheet, Top, back, fmtDate, fmtDur, go } from '../components/ui.jsx'
import BodyMap from '../components/BodyMap.jsx'
import { ExerciseThumb } from '../components/Exercise.jsx'
import { exById } from '../lib/catalogue.js'
import { muscleLoad } from '../lib/muscles.js'
import { computePRs, prCount, workoutVolume } from '../lib/pr.js'
import { useStore } from '../store.js'

const PR_LABEL = { weight: 'Heaviest', e1rm: '1RM', reps: 'Reps', volume: 'Volume' }

// Every finished workout, newest first, grouped by month; PR count on each. Tap one for the detail.
export default function History() {
  const { workouts, settings } = useStore()
  const [tab, setTab] = useState('workouts')
  const { best, marks } = useMemo(() => computePRs(workouts), [workouts])
  const months = useMemo(() => {
    const g = []
    for (const w of workouts) {
      const m = fmtDate(w.start, { month: 'long', year: 'numeric' })
      if (g.at(-1)?.m !== m) g.push({ m, list: [] })
      g.at(-1).list.push(w)
    }
    return g
  }, [workouts])
  const records = Object.entries(best).filter(([, b]) => b.e1rm || b.reps).sort((a, b) => b[1].e1rm - a[1].e1rm)

  return (
    <>
      <Top eyebrow={`${workouts.length} workouts`} title="History" onBack={() => back('train')} />
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={tab === 'workouts' ? 'on' : ''} onClick={() => setTab('workouts')}>Workouts</button>
        <button className={tab === 'prs' ? 'on' : ''} onClick={() => setTab('prs')}>Personal records</button>
      </div>

      {tab === 'workouts' && (workouts.length ? months.map(({ m, list }) => (
        <div key={m}>
          <div className="eyebrow" style={{ margin: '6px 4px 8px' }}>{m}</div>
          <div className="list">
            {list.map(w => (
              <button key={w.id} className="li" onClick={() => go('workout/' + w.id)}>
                <div className="grow">
                  <div className="t">{w.name}</div>
                  <div className="s">{fmtDate(w.start)} · {fmtDur(w.end - w.start)} · {w.exercises.length} exercises · {Math.round(workoutVolume(w)).toLocaleString()} {settings.unit}</div>
                </div>
                {prCount(marks, w.id) > 0 && <span className="pill pr"><Icon name="trophy" size={11} /> {prCount(marks, w.id)}</span>}
              </button>
            ))}
          </div>
        </div>
      )) : <div className="empty">Finished workouts show up here.</div>)}

      {tab === 'prs' && (records.length ? (
        <div className="list">
          {records.map(([id, b]) => {
            const ex = exById(id)
            return (
              <button key={id} className="li" onClick={() => go('exercise/' + id)}>
                {ex && <ExerciseThumb ex={ex} />}
                <div className="grow">
                  <div className="t">{ex?.n || id}</div>
                  <div className="s">
                    {b.weight ? `Heaviest ${b.weight} ${settings.unit} · est. 1RM ${Math.round(b.e1rm)}` : `${b.reps} reps`}
                  </div>
                </div>
                <span className="small mu" onClick={e => { e.stopPropagation(); go('workout/' + (b.at.e1rm || b.at.reps)) }}>View ›</span>
              </button>
            )
          })}
        </div>
      ) : <div className="empty">Records appear after you train an exercise twice.</div>)}
    </>
  )
}

export function WorkoutDetail({ id }) {
  const { workouts, deleteWorkout, startWorkout, active, settings } = useStore()
  const [confirm, setConfirm] = useState(false)
  const w = workouts.find(x => x.id === id)
  const { marks } = useMemo(() => computePRs(workouts), [workouts])
  if (!w) return <><Top title="Workout" onBack={() => back('train/history')} /><div className="empty">This workout was deleted.</div></>
  const load = muscleLoad(w.exercises, exById)
  const max = Math.max(1, ...Object.values(load))
  const heat = Object.fromEntries(Object.entries(load).map(([m, v]) => [m, v / max]))
  const m = marks[w.id] || {}
  const sets = w.exercises.reduce((n, x) => n + x.sets.length, 0)
  const u = settings.unit

  return (
    <>
      <Top eyebrow={fmtDate(w.start, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })} title={w.name} onBack={() => back('train/history')} />
      <div className="wide">
        <div className="card">
          <div className="grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div><div className="small mu">Time</div><div className="num" style={{ fontSize: 20 }}>{fmtDur(w.end - w.start)}</div></div>
            <div><div className="small mu">Sets</div><div className="num" style={{ fontSize: 20 }}>{sets}</div></div>
            <div><div className="small mu">Volume</div><div className="num" style={{ fontSize: 20 }}>{Math.round(workoutVolume(w)).toLocaleString()}</div></div>
            <div><div className="small mu">PRs</div><div className="num" style={{ fontSize: 20, color: 'var(--ok)' }}>{prCount(marks, w.id)}</div></div>
          </div>
        </div>
        <div className="card"><BodyMap heat={heat} figure={settings.figure} height={180} /></div>
      </div>

      {w.exercises.map((x, xi) => {
        const ex = exById(x.exId)
        return (
          <div key={xi} className="card">
            <button className="row" style={{ textAlign: 'left', width: '100%', marginBottom: 8 }} onClick={() => go('exercise/' + x.exId)}>
              {ex && <ExerciseThumb ex={ex} />}
              <div><h3 className="cap">{ex?.n || x.exId}</h3><div className="small mu cap">{ex?.tg}</div></div>
            </button>
            {x.sets.map((s, si) => (
              <div key={si} className="row sb" style={{ padding: '7px 2px', borderTop: '1px solid var(--ln)' }}>
                <span className="mu small" style={{ width: 40 }}>Set {si + 1}</span>
                <span className="num" style={{ flex: 1 }}>{+s.w ? `${s.w} ${u} × ${s.r}` : `${s.r} reps`}</span>
                <span className="row" style={{ gap: 4 }}>{(m[x.exId]?.[si] || []).map(k => <span key={k} className="pill pr">{PR_LABEL[k]}</span>)}</span>
              </div>
            ))}
          </div>
        )
      })}

      <div className="stack">
        <button className="btn block" disabled={!!active} onClick={() => { startWorkout(w.name, w.exercises.map(x => x.exId)); go('train/workout') }}>
          {active ? 'Finish your current workout to repeat this' : 'Repeat this workout'}
        </button>
        <button className="btn danger block" onClick={() => setConfirm(true)}><Icon name="trash" />Delete workout</button>
      </div>
      {confirm && (
        <Sheet onClose={() => setConfirm(false)}>
          <h2>Delete this workout?</h2>
          <p className="mu">Records it set are worked out again from the rest of your history.</p>
          <button className="btn danger block" onClick={() => { deleteWorkout(w.id); go('train/history') }}>Delete</button>
        </Sheet>
      )}
    </>
  )
}
