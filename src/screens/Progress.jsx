import { useMemo, useState } from 'react'
import { Bar, Icon, Line, NumInput, Seg, Top, fmtDate, go } from '../components/ui.jsx'
import BodyMap from '../components/BodyMap.jsx'
import { ExerciseThumb } from '../components/Exercise.jsx'
import { exById } from '../lib/catalogue.js'
import { muscleLoad } from '../lib/muscles.js'
import { computePRs, workoutVolume } from '../lib/pr.js'
import { activeDays, dayStreak, longestStreak, mondayOf, weekStreak, weights } from '../lib/streaks.js'
import { fromCm, fromKg, lenUnit, shiftDay, toCm, toKg, todayKey, useStore } from '../store.js'

// Muscle groups for the weekly balance table, from the body map's 18 muscles.
const GROUPS = [
  ['Chest', ['chest', 'serratus']], ['Back', ['upper-back', 'trapezius', 'lower-back']], ['Shoulders', ['deltoids']],
  ['Arms', ['biceps', 'triceps', 'forearm']], ['Legs', ['quadriceps', 'hamstring', 'gluteal', 'adductors', 'calves', 'tibialis']], ['Core', ['abs', 'obliques', 'hip-flexors']],
]
// 10-20 hard sets a week per muscle group is the usual hypertrophy range.
const LOW = 10, HIGH = 20

export default function Progress({ panel }) {
  const { workouts, settings, diary, goals } = useStore()
  const { best } = useMemo(() => computePRs(workouts), [workouts])
  const days = useMemo(() => activeDays(workouts, diary), [workouts, diary])
  const trainDays = useMemo(() => new Set(workouts.map(w => todayKey(new Date(w.start)))), [workouts])

  const weeks = useMemo(() => {
    const thisMon = mondayOf(todayKey())
    const out = Array.from({ length: 8 }, (_, i) => ({ mon: shiftDay(thisMon, -7 * (7 - i)), v: 0, n: 0 }))
    for (const w of workouts) {
      const m = mondayOf(todayKey(new Date(w.start)))
      const x = out.find(o => o.mon === m)
      if (x) { x.v += workoutVolume(w); x.n++ }
    }
    return out
  }, [workouts])
  const maxV = Math.max(1, ...weeks.map(w => w.v))

  const recent = Object.entries(best)
    .map(([id, b]) => ({ id, b, w: workouts.find(w => w.id === (b.at.e1rm || b.at.reps)) }))
    .filter(x => x.w).sort((a, b) => b.w.start - a.w.start).slice(0, 6)

  return (
    <>
      <Top eyebrow={`${workouts.length} workouts logged`} title="Progress" />

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat"><Icon name="flame" /><b className="num">{dayStreak(days)}</b><span>day streak</span></div>
        <div className="stat"><Icon name="trophy" /><b className="num">{longestStreak(days)}</b><span>longest</span></div>
        <div className="stat"><Icon name="target" /><b className="num">{weekStreak(workouts, goals.workouts || 3)}</b><span>weeks on goal</span></div>
        <div className="stat"><Icon name="calendar" /><b className="num">{trainDays.size}</b><span>days trained</span></div>
      </div>

      <Consistency />

      <div className="wide">
        <Balance />
        <div className="card">
          <div className="card-h"><h2>Weekly volume</h2><span className="small mu">{settings.unit} lifted</span></div>
          <div className="row" style={{ alignItems: 'flex-end', height: 150, gap: 8 }}>
            {weeks.map((w, i) => (
              <div key={w.mon} className="vbar" title={`Week of ${w.mon}: ${w.n} workouts`}>
                <span className="small mu num" style={{ fontSize: 10 }}>{w.v ? (w.v >= 1000 ? Math.round(w.v / 1000) + 'k' : Math.round(w.v)) : ''}</span>
                <div style={{ height: `${(w.v / maxV) * 100}%`, background: i === 7 ? 'var(--ac)' : 'color-mix(in srgb, var(--ac) 35%, var(--sf2))', animationDelay: i * 0.04 + 's' }} />
                <span className="small mu" style={{ fontSize: 10 }}>{new Date(w.mon + 'T12:00').toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!panel && <Body />}

      <div className="card-h" style={{ margin: '20px 2px 10px' }}><h2>Latest records</h2><button className="small" style={{ color: 'var(--ac)' }} onClick={() => go('train/history')}>All PRs</button></div>
      {recent.length ? (
        <div className="list">
          {recent.map(({ id, b, w }) => {
            const ex = exById(id)
            return (
              <button key={id} className="li" onClick={() => go('workout/' + w.id)}>
                {ex && <ExerciseThumb ex={ex} />}
                <div className="grow"><div className="t">{ex?.n}</div><div className="s">{fmtDate(w.start)}</div></div>
                <span className="pill pr"><Icon name="trophy" size={11} /> {b.weight ? `${Math.round(b.e1rm)} ${settings.unit} 1RM` : `${b.reps} reps`}</span>
              </button>
            )
          })}
        </div>
      ) : <div className="empty">Train an exercise twice and your records show up here.</div>}
    </>
  )
}

// A year of training, one square a day, Monday at the top (GitHub and openGym style).
// Shade by time trained or by volume; five steps from none to most.
function Consistency() {
  const workouts = useStore(s => s.workouts)
  const unit = useStore(s => s.settings.unit)
  const [by, setBy] = useState('time')
  const { cols, months, total, max } = useMemo(() => {
    const per = {}
    for (const w of workouts) {
      const k = todayKey(new Date(w.start))
      per[k] = (per[k] || 0) + (by === 'time' ? Math.max(0, ((w.end || w.start) - w.start) / 60000) || 30 : workoutVolume(w) || 1)
    }
    const t = todayKey()
    const start = shiftDay(mondayOf(t), -7 * 52)
    const cols = [], months = []
    let total = 0, max = 0
    for (let c = 0; c < 53; c++) {
      const col = []
      for (let r = 0; r < 7; r++) {
        const k = shiftDay(start, c * 7 + r)
        const v = per[k] || 0
        if (k <= t) { total += v; max = Math.max(max, v) }
        col.push({ k, v, future: k > t })
      }
      const first = col[0].k
      if (c === 0 || first.slice(5, 7) !== shiftDay(first, -7).slice(5, 7)) months.push({ c, label: new Date(first + 'T12:00').toLocaleDateString(undefined, { month: 'short' }) })
      cols.push(col)
    }
    return { cols, months, total, max }
  }, [workouts, by])
  const level = v => (!v ? 0 : Math.min(4, Math.ceil((v / (max || 1)) * 4)))
  const fmt = v => (by === 'time' ? `${Math.round(v)} min` : `${Math.round(v).toLocaleString()} ${unit}`)

  return (
    <div className="card">
      <div className="card-h">
        <div><h2>Consistency</h2><div className="small mu">{by === 'time' ? `${Math.round(total / 60)} hours` : `${Math.round(total).toLocaleString()} ${unit}`} in the last 12 months</div></div>
        <Seg value={by} onChange={setBy} options={[['time', 'Time'], ['volume', 'Volume']]} style={{ width: 150 }} />
      </div>
      <div className="year">
        <div className="year-days small mu"><span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /></div>
        <div className="year-scroll">
          <div className="year-months small mu">
            {months.filter(m => m.c < 51).map(m => <span key={m.c} style={{ left: (m.c / 53) * 100 + '%' }}>{m.label}</span>)}
          </div>
          <div className="year-grid">
            {cols.map((col, c) => (
              <div key={c}>
                {col.map(d => <i key={d.k} className={'l' + level(d.v)} style={d.future ? { visibility: 'hidden' } : undefined} title={`${d.k}${d.v ? ': ' + fmt(d.v) : ''}`} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="legend" style={{ justifyContent: 'flex-end', gap: 4 }}>
        <span style={{ marginRight: 4 }}>Less</span>{[0, 1, 2, 3, 4].map(l => <i key={l} className={'year-key l' + l} />)}<span style={{ marginLeft: 4 }}>More</span>
      </div>
    </div>
  )
}

// Sets per muscle group for each of the last four weeks, against the 10-20 set range.
function Balance() {
  const workouts = useStore(s => s.workouts)
  const figure = useStore(s => s.settings.figure)
  const [map, setMap] = useState(false)
  const { rows, heat } = useMemo(() => {
    const thisMon = mondayOf(todayKey())
    const mons = [3, 2, 1, 0].map(i => shiftDay(thisMon, -7 * i))
    const loads = mons.map(m => muscleLoad(workouts.filter(w => mondayOf(todayKey(new Date(w.start))) === m).flatMap(w => w.exercises), exById))
    const rows = GROUPS.map(([name, ms]) => ({ name, sets: loads.map(l => Math.round(ms.reduce((a, m) => a + (l[m] || 0), 0))) }))
    const now = loads[3], max = Math.max(1, ...Object.values(now))
    return { rows, heat: Object.fromEntries(Object.entries(now).map(([m, v]) => [m, v / max])) }
  }, [workouts])
  return (
    <div className="card">
      <div className="card-h">
        <div><h2>Muscle balance</h2><div className="small mu">Sets per week · aim for {LOW}–{HIGH}</div></div>
        <button className="icon-btn" onClick={() => setMap(!map)} aria-label={map ? 'Table' : 'Body map'}><Icon name={map ? 'list' : 'body'} /></button>
      </div>
      {map ? <BodyMap heat={heat} figure={figure} height={220} /> : (
        <table className="balance">
          <thead><tr><th /><th>−3w</th><th>−2w</th><th>−1w</th><th>This week</th></tr></thead>
          <tbody>
            {rows.map(r => {
              const now = r.sets[3]
              const tone = now >= LOW && now <= HIGH ? 'var(--ok)' : now > HIGH ? 'var(--warn)' : 'var(--ac)'
              return (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  {r.sets.slice(0, 3).map((v, i) => <td key={i} className="num mu">{v || '·'}</td>)}
                  <td><div className="row" style={{ gap: 8 }}><span className="num" style={{ width: 22, textAlign: 'right' }}>{now}</span><div className="grow"><Bar value={now} max={HIGH} color={tone} /></div></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

const MEASURES = [['waist', 'Waist'], ['chest', 'Chest'], ['hips', 'Hips'], ['arm', 'Arm'], ['thigh', 'Thigh'], ['neck', 'Neck']]

// Body weight with a goal line, measurements, a log of past entries, and goals.
export function Body() {
  const { body, setBody, settings, goals, setGoal } = useStore()
  const u = settings.unit, lu = lenUnit(u)
  const [date, setDate] = useState(todayKey())
  const [range, setRange] = useState(90)
  const day = body[date] || {}
  const wts = useMemo(() => weights(body), [body])
  const since = shiftDay(todayKey(), -range)
  const shown = wts.filter(w => range === 0 || w.date >= since)
  const last = wts[wts.length - 1], first = shown[0]
  const log = Object.keys(body).sort().reverse().slice(0, 12)
  const num = v => (v === '' ? '' : +v)
  const toGoal = goals.weight && last ? fromKg(last.kg - goals.weight, u) : null

  return (
    <>
      <div className="card">
        <div className="card-h">
          <div><h2>Body weight</h2>
            <div className="small mu">{last ? `${fromKg(last.kg, u).toFixed(1)} ${u}` : 'No entries yet'}{first && last && first !== last && ` · ${last.kg <= first.kg ? '▼' : '▲'} ${Math.abs(fromKg(last.kg - first.kg, u)).toFixed(1)} ${u}`}{toGoal != null && ` · ${Math.abs(toGoal).toFixed(1)} ${u} to goal`}</div>
          </div>
          <Seg value={range} onChange={setRange} options={[[30, '1M'], [90, '3M'], [365, '1Y'], [0, 'All']]} style={{ width: 170, flex: 'none' }} />
        </div>
        <Line points={shown.map(w => ({ x: +new Date(w.date + 'T12:00'), y: fromKg(w.kg, u) }))} goal={goals.weight ? fromKg(goals.weight, u) : undefined} height={150} fmt={v => v.toFixed(1) + ' ' + u} />
      </div>

      <div className="card">
        <div className="card-h">
          <h2>Log</h2>
          <input type="date" value={date} max={todayKey()} onChange={e => setDate(e.target.value || todayKey())} style={{ width: 160, padding: '7px 10px' }} />
        </div>
        <div className="measure-grid">
          <label><span className="small mu">Weight ({u})</span>
            <input type="number" inputMode="decimal" step="0.1" value={day.weight ? +fromKg(day.weight, u).toFixed(1) : ''} placeholder={last ? fromKg(last.kg, u).toFixed(1) : ''}
              onChange={e => setBody(date, 'weight', e.target.value === '' ? '' : toKg(+e.target.value, u))} /></label>
          <label><span className="small mu">Body fat (%)</span>
            <input type="number" inputMode="decimal" step="0.1" value={day.bf ?? ''} onChange={e => setBody(date, 'bf', num(e.target.value))} /></label>
          {MEASURES.map(([k, l]) => (
            <label key={k}><span className="small mu">{l} ({lu})</span>
              <input type="number" inputMode="decimal" step="0.1" value={day[k] ? +fromCm(day[k], u).toFixed(1) : ''} onChange={e => setBody(date, k, e.target.value === '' ? '' : toCm(+e.target.value, u))} /></label>
          ))}
        </div>
        {log.length > 0 && (
          <>
            <div className="sep" />
            <div className="small mu" style={{ marginBottom: 6 }}>Recent entries</div>
            {log.map(d => (
              <button key={d} className="log-row" onClick={() => setDate(d)}>
                <span>{fmtDate(d + 'T12:00')}</span>
                <span className="mu small">{[body[d].weight && `${fromKg(body[d].weight, u).toFixed(1)} ${u}`, body[d].bf && `${body[d].bf}%`, ...MEASURES.filter(([k]) => body[d][k]).map(([k, l]) => `${l} ${fromCm(body[d][k], u).toFixed(1)}`)].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="card">
        <div className="card-h"><h2>Goals</h2><Icon name="target" /></div>
        <div className="measure-grid">
          <label><span className="small mu">Goal weight ({u})</span>
            <input type="number" inputMode="decimal" value={goals.weight ? +fromKg(goals.weight, u).toFixed(1) : ''} onChange={e => setGoal('weight', e.target.value ? toKg(+e.target.value, u) : null)} /></label>
          <label><span className="small mu">Workouts a week</span>
            <NumInput inputMode="numeric" value={goals.workouts || ''} onValue={v => setGoal('workouts', v)} /></label>
          {[['kcal', 'Calories'], ['p', 'Protein (g)'], ['c', 'Carbs (g)'], ['f', 'Fat (g)'], ['water', 'Water (glasses)']].map(([k, l]) => (
            <label key={k}><span className="small mu">{l}</span><NumInput inputMode="numeric" value={goals[k]} onValue={v => setGoal(k, v)} /></label>
          ))}
        </div>
      </div>
    </>
  )
}
