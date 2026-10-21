import { useEffect, useMemo, useState } from 'react'
import { Icon, Top, back, fmtDate, go } from '../components/ui.jsx'
import BodyMap from '../components/BodyMap.jsx'
import { ExerciseMedia } from '../components/Exercise.jsx'
import { exById, loadInstructions } from '../lib/catalogue.js'
import { MUSCLE_NAME } from '../lib/muscles.js'
import { computePRs, e1rm } from '../lib/pr.js'
import { useStore } from '../store.js'

export default function ExerciseDetail({ id }) {
  const ex = exById(id)
  const [steps, setSteps] = useState(null)
  const { workouts, addToWorkout, settings } = useStore()
  useEffect(() => { if (ex) loadInstructions(ex.id).then(setSteps) }, [ex])
  const history = useMemo(() => workouts.filter(w => w.exercises.some(x => x.exId === id)), [workouts, id])
  const best = useMemo(() => computePRs(workouts).best[id], [workouts, id])
  if (!ex) return <Top title="Not found" onBack={() => back('train/exercises')} />
  const u = settings.unit

  return (
    <>
      <Top eyebrow={`${ex.bp} · ${ex.cat}`} title={ex.n} onBack={() => back('train/exercises')} />
      <div className="wide">
        <div>
          <ExerciseMedia ex={ex} height={340} />
          <div className="row" style={{ margin: '14px 0' }}>
            <button className="btn block" onClick={() => { addToWorkout(ex.id); go('train/workout') }}><Icon name="plus" />Add to workout</button>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-h"><h2>Muscles</h2><span className="pill cap">{ex.eq}</span></div>
            <div className="row" style={{ alignItems: 'center' }}>
              <div style={{ flex: 1 }}><BodyMap primary={ex.p} secondary={ex.s} figure={settings.figure} height={190} /></div>
              <div style={{ flex: 1 }} className="stack small">
                <div><div className="mu">Target</div><div>{ex.p.map(m => MUSCLE_NAME[m]).join(', ') || ex.tg}</div></div>
                {ex.s.length > 0 && <div><div className="mu">Also works</div><div>{ex.s.map(m => MUSCLE_NAME[m]).join(', ')}</div></div>}
              </div>
            </div>
            <div className="legend"><span><i style={{ background: 'var(--ac)' }} />Target</span><span><i style={{ background: 'color-mix(in srgb, var(--ac) 50%, var(--sf2))' }} />Supporting</span></div>
          </div>

          {best && (
            <div className="card">
              <div className="card-h"><h2>Your records</h2><Icon name="trophy" /></div>
              <div className="grid2">
                <div><div className="mu small">Heaviest</div><div className="num" style={{ fontSize: 24 }}>{best.weight || '–'} <span className="small mu">{u}</span></div></div>
                <div><div className="mu small">Est. 1RM</div><div className="num" style={{ fontSize: 24 }}>{Math.round(best.e1rm) || '–'} <span className="small mu">{u}</span></div></div>
                <div><div className="mu small">Best set volume</div><div className="num" style={{ fontSize: 24 }}>{Math.round(best.volume) || '–'}</div></div>
                <div><div className="mu small">Most reps (bodyweight)</div><div className="num" style={{ fontSize: 24 }}>{best.reps || '–'}</div></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {ex.d && <p className="mu" style={{ margin: '4px 2px 14px' }}>{ex.d}</p>}
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>How to</h2>
        {steps ? (
          <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        ) : <div className="mu">Loading…</div>}
      </div>

      {history.length > 0 && (
        <>
          <h2 style={{ margin: '20px 2px 10px' }}>History</h2>
          <div className="list">
            {history.slice(0, 20).map(w => {
              const sets = w.exercises.find(x => x.exId === id).sets
              const top = Math.max(...sets.map(s => e1rm(+s.w, +s.r)))
              return (
                <button key={w.id} className="li" onClick={() => go('workout/' + w.id)}>
                  <div className="grow">
                    <div className="t">{fmtDate(w.start)}</div>
                    <div className="s">{sets.map(s => `${s.w || 0}×${s.r}`).join('  ·  ')}</div>
                  </div>
                  {top > 0 && <span className="pill">1RM ~{Math.round(top)}</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
      <p className="small mu" style={{ textAlign: 'center' }}>
        {ex.src === 'x' ? 'Text: ExerciseDB (MIT) via openGym' : 'Text: openGym (AGPL-3.0)'}{ex.a ? ' · Animation: Open Exercise Figures (CC0)' : ''}
      </p>
    </>
  )
}
