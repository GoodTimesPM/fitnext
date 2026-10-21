import { useMemo, useState } from 'react'
import { Bar, Icon, Line, Macro, Ring, Top, go } from '../components/ui.jsx'
import { totals, factor } from '../lib/food.js'
import { activeDays, dayStreak, weekStreak, weights } from '../lib/streaks.js'
import { MEALS, guessMeal } from './Fuel.jsx'
import { NextSession, WeekStrip, useWeek } from './Train.jsx'
import { fromKg, shiftDay, todayKey, useDay, useStore } from '../store.js'

export default function Today() {
  const { diary, goals, workouts, settings, water, setWater, body, recipes } = useStore()
  const date = todayKey()
  const entries = diary[date] || []
  const t = totals(entries)
  const left = goals.kcal - t.kcal
  const h = new Date().getHours()
  const hello = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  const week = useWeek()
  const streak = useMemo(() => dayStreak(activeDays(workouts, diary)), [workouts, diary])
  const weeksHit = useMemo(() => weekStreak(workouts, goals.workouts || 3), [workouts, goals.workouts])
  const wts = useMemo(() => weights(body), [body])
  const lastW = wts[wts.length - 1]
  const prevW = wts.find(w => w.date >= shiftDay(date, -30))
  // A recipe that fits what is left today, else any saved one. Changes each day, not each render.
  const idea = useMemo(() => {
    if (!recipes.length) return null
    const fits = recipes.filter(r => r.kcal && r.kcal <= Math.max(300, left))
    const pool = fits.length ? fits : recipes
    return pool[[...date].reduce((a, c) => a + c.charCodeAt(0), 0) % pool.length]
  }, [recipes, date, left])
  const [flash, setFlash] = useState(false)
  const glass = n => { setWater(date, n); setFlash(true); setTimeout(() => setFlash(false), 500) }
  const u = settings.unit

  return (
    <>
      <Top eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} title={settings.name ? `${hello}, ${settings.name}` : hello}
        right={<button className="avatar" onClick={() => go('settings')} aria-label="Account and settings">{settings.name ? settings.name[0].toUpperCase() : <Icon name="gear" />}</button>} />

      <div className="stats-row">
        <div className="stat"><Icon name="flame" /><b className="num">{streak}</b><span>day streak</span></div>
        <div className="stat"><Icon name="dumbbell" /><b className="num">{week.count}<small>/{goals.workouts || 3}</small></b><span>workouts this week</span></div>
        <div className="stat"><Icon name="target" /><b className="num">{weeksHit}</b><span>weeks on target</span></div>
      </div>

      <div className="wide">
        <div>
          <button className="card hero" style={{ width: '100%', textAlign: 'left' }} onClick={() => { useDay.getState().setDate(date); go('fuel') }}>
            <div className="row wrap" style={{ gap: 20, justifyContent: 'center' }}>
              <Ring value={t.kcal} max={goals.kcal} size={140} stroke={13} color={left < 0 ? 'var(--warn)' : 'var(--ac)'}>
                <div className="num" style={{ fontSize: 32 }}>{Math.round(Math.abs(left)).toLocaleString()}</div>
                <div className="small mu">kcal {left < 0 ? 'over' : 'left'}</div>
              </Ring>
              <div className="stack" style={{ flex: '1 1 0', minWidth: 'max-content' }}>
                <Macro label="Protein" value={t.p} goal={goals.p} color="var(--p)" />
                <Macro label="Carbs" value={t.c} goal={goals.c} color="var(--c)" />
                <Macro label="Fat" value={t.f} goal={goals.f} color="var(--f)" />
              </div>
            </div>
          </button>

          <div className="quick">
            {[['search', 'search', 'Food'], ['scan', 'scan', 'Scan'], ['camera', 'photo', 'Photo'], ['mic', 'voice', 'Voice']].map(([icon, mode, l]) => (
              <button key={l} onClick={() => go(`fuel/add/${mode}?meal=${guessMeal()}`)}><Icon name={icon} /><span>{l}</span></button>
            ))}
          </div>

          <div className="card">
            <div className="card-h"><h3>Meals</h3><button className="small" style={{ color: 'var(--ac)' }} onClick={() => go('fuel')}>Diary ›</button></div>
            {MEALS.map(m => {
              const list = entries.filter(e => e.meal === m)
              const k = list.reduce((a, e) => a + (e.food.n.kcal || 0) * factor(e.food, e.qty), 0)
              return (
                <button key={m} className="meal-row" onClick={() => go(list.length ? 'fuel' : `fuel/add?meal=${m}`)}>
                  <span className={'dot' + (list.length ? ' on' : '')} />
                  <div className="grow" style={{ textAlign: 'left' }}>
                    <div>{m}</div>
                    <div className="small mu" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{list.length ? list.map(e => e.food.name).join(', ') : 'Nothing yet'}</div>
                  </div>
                  {list.length ? <span className="num">{Math.round(k)}</span> : <Icon name="plus" size={18} />}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <NextSession compact />
          <WeekStrip />

          <div className="grid2" style={{ marginBottom: 14 }}>
            <div className={'card tight water' + (flash ? ' flash' : '')}>
              <div className="row sb"><span className="small mu">Water</span><Icon name="drop" size={18} /></div>
              <div className="num" style={{ fontSize: 26 }}>{((water[date] || 0) * 0.25).toFixed(2)}<small className="mu"> L</small></div>
              <Bar value={water[date] || 0} max={goals.water} color="var(--c)" />
              <div className="row" style={{ gap: 6, marginTop: 10 }}>
                <button className="icon-btn" onClick={() => glass((water[date] || 0) - 1)} aria-label="Less water">−</button>
                <button className="btn sm grow" style={{ background: 'var(--c)' }} onClick={() => glass((water[date] || 0) + 1)}><Icon name="plus" />Glass</button>
              </div>
            </div>
            <button className="card tight" style={{ textAlign: 'left' }} onClick={() => go('progress')}>
              <div className="row sb"><span className="small mu">Weight</span><Icon name="scale" size={18} /></div>
              {lastW ? (
                <>
                  <div className="num" style={{ fontSize: 26 }}>{fromKg(lastW.kg, u).toFixed(1)}<small className="mu"> {u}</small></div>
                  {prevW && prevW !== lastW && <div className="small" style={{ color: 'var(--mu)' }}>{lastW.kg <= prevW.kg ? '▼' : '▲'} {Math.abs(fromKg(lastW.kg - prevW.kg, u)).toFixed(1)} {u} in 30 days</div>}
                  <Line points={wts.slice(-14).map(w => ({ x: +new Date(w.date), y: fromKg(w.kg, u) }))} height={54} fmt={() => ''} />
                </>
              ) : <div className="small mu" style={{ marginTop: 8 }}>Log your weight to see the trend.<div style={{ color: 'var(--ac)', marginTop: 6 }}>Add weight ›</div></div>}
            </button>
          </div>

          {idea ? (
            <button className="card idea" onClick={() => go('kitchen?r=' + idea.id)}>
              {idea.image && <img src={idea.image} alt="" loading="lazy" />}
              <div>
                <div className="small mu">Recipe idea</div>
                <h3>{idea.title}</h3>
                <div className="small mu">{[idea.kcal && `${Math.round(idea.kcal)} kcal`, idea.p && `${Math.round(idea.p)} g protein`, idea.mins && `${idea.mins} min`].filter(Boolean).join(' · ') || idea.tags?.slice(0, 2).join(' · ')}</div>
              </div>
            </button>
          ) : (
            <button className="card idea" onClick={() => go('kitchen?tab=discover')}>
              <div className="icon-btn" style={{ width: 56, height: 56 }}><Icon name="book" /></div>
              <div><div className="small mu">Kitchen</div><h3>Add some recipes</h3><div className="small mu">Hundreds with photos, one tap to import.</div></div>
            </button>
          )}
        </div>
      </div>
    </>
  )
}
