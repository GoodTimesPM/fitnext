import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon, Sheet, Top, fmtDur, go } from '../components/ui.jsx'
import { ExerciseThumb } from '../components/Exercise.jsx'
import { exById } from '../lib/catalogue.js'
import { computePRs, e1rm } from '../lib/pr.js'
import { lastSetsFor, useStore } from '../store.js'

// The workout in progress: sets with weight and reps, a check to complete each, a rest timer,
// and a live PR badge when a completed set beats the standing record.
export default function Workout() {
  const { active, workouts, updateActive, finishWorkout, discardWorkout, saveRoutine, settings } = useStore()
  const { best } = useMemo(() => computePRs(workouts), [workouts])
  const [now, setNow] = useState(Date.now())
  const [rest, setRest] = useState(null) // end timestamp
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { if (rest && now >= rest) { setRest(null); navigator.vibrate?.(200) } }, [now, rest])

  if (!active) {
    return (
      <>
        <Top title="Workout" onBack={() => go('train')} />
        <div className="empty">No workout in progress.<br /><br /><button className="btn" onClick={() => go('train')}>Back to Train</button></div>
      </>
    )
  }
  const u = settings.unit
  const edit = fn => updateActive(a => { fn(a); return a })
  const doneSets = active.exercises.reduce((n, x) => n + x.sets.filter(s => s.done).length, 0)

  const isPR = (exId, s) => {
    const b = best[exId]
    if (!b || !s.done) return false
    return +s.w > b.weight || e1rm(+s.w, +s.r) > b.e1rm || (!+s.w && +s.r > b.reps)
  }

  const finish = () => {
    const id = finishWorkout()
    go(id ? 'workout/' + id : 'train')
  }

  return (
    <>
      <Top eyebrow={`${fmtDur(now - active.start)} · ${doneSets} sets done`} title={active.name} onBack={() => go('train')}
        right={<button className="btn sm" onClick={() => setConfirm(true)}>Finish</button>} />

      {active.exercises.map((x, xi) => {
        const ex = exById(x.exId)
        const last = lastSetsFor(workouts, x.exId)
        return (
          <div key={xi} className="card">
            <div className="row" style={{ marginBottom: 6 }}>
              <button className="row grow" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => go('exercise/' + x.exId)}>
                <ExerciseThumb ex={ex} />
                <div style={{ minWidth: 0 }}><h3 className="cap">{ex?.n}</h3><div className="small mu cap">{ex?.tg} · {ex?.eq}</div></div>
              </button>
              <button className="icon-btn" aria-label="Remove exercise" onClick={() => edit(a => a.exercises.splice(xi, 1))}><Icon name="x" /></button>
            </div>
            <div className="set hd"><span>Set</span><span>Last</span><span>{u}</span><span>Reps</span><span /></div>
            {x.sets.map((s, si) => (
              <div key={si} className="set">
                <span className="k" title={isPR(x.exId, s) ? 'New personal record' : undefined} style={isPR(x.exId, s) ? { color: 'var(--ok)' } : undefined}>
                  {isPR(x.exId, s) ? <Icon name="trophy" size={16} /> : si + 1}
                </span>
                <span className="k">{last?.[si] ? `${last[si].w || 0}×${last[si].r}` : '–'}</span>
                <input inputMode="decimal" value={s.w} placeholder="0" onChange={e => edit(a => { a.exercises[xi].sets[si].w = e.target.value })} />
                <input inputMode="numeric" value={s.r} placeholder="0" onChange={e => edit(a => { a.exercises[xi].sets[si].r = e.target.value })} />
                <button className={'check' + (s.done ? ' on' : '')} aria-label="Complete set" onClick={() => {
                  edit(a => { const t = a.exercises[xi].sets[si]; t.done = !t.done; if (t.done && !t.r && last?.[si]) { t.r = last[si].r; t.w = t.w || last[si].w } })
                  if (!s.done) setRest(Date.now() + settings.restSec * 1000)
                }}><Icon name="check" /></button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn ghost sm" onClick={() => edit(a => { const sets = a.exercises[xi].sets; const p = sets[sets.length - 1]; sets.push({ w: p?.w ?? '', r: p?.r ?? '', done: false }) })}><Icon name="plus" />Set</button>
              {x.sets.length > 1 && <button className="btn ghost sm" onClick={() => edit(a => { a.exercises[xi].sets.pop() })}>Remove set</button>}
            </div>
          </div>
        )
      })}

      <button className="btn ghost block" style={{ marginBottom: 14 }} onClick={() => go('train/exercises?pick=1')}><Icon name="plus" />Add exercise</button>
      <button className="btn danger block" onClick={() => { discardWorkout(); go('train') }}>Discard workout</button>

      {rest && createPortal(
        <div className="timer">
          <span className="small">Rest</span>
          <span className="num" style={{ fontSize: 22 }}>{Math.max(0, Math.ceil((rest - now) / 1000))}s</span>
          <button className="small" onClick={() => setRest(rest + 15000)}>+15</button>
          <button className="small" onClick={() => setRest(null)}>Skip</button>
        </div>,
        document.body,
      )}

      {confirm && (
        <Sheet onClose={() => setConfirm(false)}>
          <h2>Finish workout?</h2>
          <p className="mu">{doneSets} completed sets will be saved. Unchecked sets are dropped.</p>
          <div className="stack">
            <button className="btn block" onClick={finish}>Finish and save</button>
            <button className="btn ghost block" onClick={() => { saveRoutine(active.name, active.exercises.map(x => x.exId)); finish() }}>Finish and save as routine</button>
          </div>
        </Sheet>
      )}
    </>
  )
}
