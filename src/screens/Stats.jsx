import { useMemo, useState } from 'react'
import { Bar, Top, back, go } from '../components/ui.jsx'
import BodyMap from '../components/BodyMap.jsx'
import { exById } from '../lib/catalogue.js'
import { MUSCLES, MUSCLE_NAME, muscleLoad } from '../lib/muscles.js'
import { useStore } from '../store.js'

const RANGES = [['week', 'Week', 7], ['30', '30d', 30], ['90', '90d', 90], ['all', 'All', null]]

// Muscle balance: weighted sets per muscle over a period (a supporting muscle counts 0.4 of a set),
// on the body map and as bars, plus the muscles not trained at all. Tap a muscle to browse its exercises.
export default function Stats() {
  const { workouts, settings } = useStore()
  const [range, setRange] = useState('week')
  const days = RANGES.find(r => r[0] === range)[2]
  const { load, heat, count } = useMemo(() => {
    const since = days ? Date.now() - days * 864e5 : 0
    const list = workouts.filter(w => w.start >= since)
    const load = muscleLoad(list.flatMap(w => w.exercises), exById)
    const max = Math.max(1, ...Object.values(load))
    return { load, heat: Object.fromEntries(Object.entries(load).map(([m, v]) => [m, v / max])), count: list.length }
  }, [workouts, days])
  const ranked = MUSCLES.filter(m => load[m]).sort((a, b) => load[b] - load[a])
  const missed = MUSCLES.filter(m => !load[m])
  const max = Math.max(1, ...Object.values(load))
  const perWeek = days ? 7 / days : null

  const browse = m => go('train/exercises?muscle=' + m)

  return (
    <>
      <Top eyebrow={`${count} workouts`} title="Muscle balance" onBack={() => back('train')} />
      <div className="seg" style={{ marginBottom: 14 }}>
        {RANGES.map(([id, label]) => <button key={id} className={range === id ? 'on' : ''} onClick={() => setRange(id)}>{label}</button>)}
      </div>
      <div className="wide">
        <div className="card">
          <BodyMap heat={heat} figure={settings.figure} height={300} onPick={browse} />
          <div className="legend"><span><i style={{ background: 'color-mix(in srgb, var(--ac) 25%, var(--sf2))' }} />Light</span><span><i style={{ background: 'var(--ac)' }} />Most trained</span></div>
        </div>
        <div className="card">
          <div className="card-h"><h2>Sets per muscle</h2>{perWeek && <span className="small mu">avg / week</span>}</div>
          {ranked.length ? ranked.map(m => (
            <button key={m} style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 10 }} onClick={() => browse(m)}>
              <div className="row sb small" style={{ marginBottom: 5 }}>
                <span>{MUSCLE_NAME[m]}</span>
                <span className="num mu">{Math.round(load[m] * 10) / 10}{perWeek && range !== 'week' ? ` · ${Math.round(load[m] * perWeek * 10) / 10}/wk` : ''}</span>
              </div>
              <Bar value={load[m]} max={max} />
            </button>
          )) : <div className="empty">No sets logged in this period.</div>}
        </div>
      </div>
      {missed.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 10 }}>Not trained</h2>
          <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
            {missed.map(m => <button key={m} className="chip" style={{ boxShadow: 'none', background: 'color-mix(in srgb, var(--warn) 12%, var(--sf))', color: 'var(--warn)' }} onClick={() => browse(m)}>{MUSCLE_NAME[m]}</button>)}
          </div>
        </div>
      )}
    </>
  )
}
